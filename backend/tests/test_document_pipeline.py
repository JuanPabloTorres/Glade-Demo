"""
Document pipeline tests (Block 10 acceptance criteria): extraction per
format, guardrail-adjacent provenance tagging on extracted amounts, and a
same-case-isolation test for CaseDocumentIndex mirroring Block 9's
CaseContextBuilder isolation test.

Known, documented scope limit: only the plain-text extraction path is
exercised against real bytes here — PDF/DOCX/XLSX extraction is exercised
via monkeypatched import failures (proving the safe-fallback/error path
works), not against real fixture files, because docling/pymupdf/python-docx/
openpyxl are optional dependencies not installed in this environment by
default. See docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md.
"""

from __future__ import annotations

import pytest

from app.ai.providers.rule_based import RuleBasedProvider
from app.core.config import get_settings
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, GuidanceRequestDto
from app.services.bankruptcy_service import BankruptcyGuidanceService
from app.services.documents import (
    CaseDocumentIndex,
    DocumentChunker,
    DocumentClassifier,
    DocumentIngestionService,
    DocumentTextExtractor,
    EmbeddingService,
    FinancialEvidenceExtractor,
    UnsupportedDocumentError,
)


class TestDocumentTextExtractor:
    def test_extracts_plain_text_without_any_optional_dependency(self) -> None:
        extractor = DocumentTextExtractor()
        text = extractor.extract(filename="paystub.txt", content=b"Ingreso neto: $950.00")
        assert text == "Ingreso neto: $950.00"

    def test_unknown_extension_raises_unsupported_document_error(self) -> None:
        extractor = DocumentTextExtractor()
        with pytest.raises(UnsupportedDocumentError):
            extractor.extract(filename="notes.xyz", content=b"whatever")

    def test_pdf_without_docling_or_pymupdf_raises_unsupported_document_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def raise_import_error(_name: str) -> None:
            raise ModuleNotFoundError("neither docling nor pymupdf installed")

        monkeypatch.setattr("importlib.import_module", raise_import_error)
        extractor = DocumentTextExtractor()
        with pytest.raises(UnsupportedDocumentError):
            extractor.extract(filename="statement.pdf", content=b"%PDF-1.4 fake")

    def test_docx_without_python_docx_raises_unsupported_document_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def raise_import_error(_name: str) -> None:
            raise ModuleNotFoundError("python-docx not installed")

        monkeypatch.setattr("importlib.import_module", raise_import_error)
        extractor = DocumentTextExtractor()
        with pytest.raises(UnsupportedDocumentError):
            extractor.extract(filename="letter.docx", content=b"fake docx bytes")


class TestDocumentClassifier:
    def test_classifies_pay_stub(self) -> None:
        result = DocumentClassifier().classify("Talón de pago quincenal - salario bruto $1,200.00 - Employer Inc.")
        assert result == "Talones de pago"

    def test_classifies_bank_statement(self) -> None:
        result = DocumentClassifier().classify("Estado de cuenta bancario - balance disponible $2,400.15")
        assert result == "Estado bancario"

    def test_unrecognized_text_falls_back_to_other(self) -> None:
        result = DocumentClassifier().classify("Lorem ipsum dolor sit amet consectetur adipiscing elit")
        assert result == "Otro documento"


class TestFinancialEvidenceExtractor:
    def test_extracts_dollar_amounts_with_extracted_provenance(self) -> None:
        amounts = FinancialEvidenceExtractor().extract_amounts(
            "Salario bruto $1,200.50 y deducciones de $150.00 dejan un neto de $1,050.50."
        )
        values = [item.amount for item in amounts]
        assert values == [1200.50, 150.00, 1050.50]
        assert all(item.provenance == "extracted" for item in amounts)


class TestDocumentChunker:
    def test_short_text_is_a_single_chunk(self) -> None:
        chunks = DocumentChunker(max_chars=800, overlap_chars=80).chunk("Texto corto de prueba.")
        assert chunks == ["Texto corto de prueba."]

    def test_empty_text_yields_no_chunks(self) -> None:
        assert DocumentChunker().chunk("   ") == []

    def test_long_text_is_split_into_multiple_overlapping_chunks(self) -> None:
        long_text = "palabra " * 500  # far longer than max_chars
        chunker = DocumentChunker(max_chars=200, overlap_chars=20)
        chunks = chunker.chunk(long_text)
        assert len(chunks) > 1
        assert all(len(chunk) <= 200 for chunk in chunks)


class TestEmbeddingService:
    def test_deterministic_fallback_is_stable_for_the_same_text(self) -> None:
        service = EmbeddingService()
        assert service.embed("hola mundo") == service.embed("hola mundo")

    def test_deterministic_fallback_differs_for_different_text(self) -> None:
        service = EmbeddingService()
        assert service.embed("hola mundo") != service.embed("adiós mundo")

    def test_ollama_unreachable_falls_back_to_deterministic_embedding(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import urllib.error

        def raise_connection_error(*_args: object, **_kwargs: object) -> None:
            raise urllib.error.URLError("connection refused")

        monkeypatch.setattr("urllib.request.urlopen", raise_connection_error)
        with_ollama = EmbeddingService(ollama_base_url="http://localhost:11434", ollama_embedding_model="nomic-embed-text")
        without_ollama = EmbeddingService()
        assert with_ollama.embed("hola mundo") == without_ollama.embed("hola mundo")


class TestCaseDocumentIndexIsolation:
    def test_search_never_returns_another_cases_chunks(self) -> None:
        index = CaseDocumentIndex()
        index.add_document("case-a", ["Elena tiene un ingreso de $2,000 mensuales."])
        index.add_document("case-b", ["Miguel tiene una deuda hipotecaria de $150,000."])

        results_a = index.search("case-a", "ingreso mensual")
        results_b = index.search("case-b", "ingreso mensual")

        assert any("Elena" in chunk for chunk in results_a)
        assert all("Miguel" not in chunk for chunk in results_a)
        assert any("Miguel" in chunk for chunk in results_b)
        assert all("Elena" not in chunk for chunk in results_b)

    def test_unknown_case_id_returns_empty_results_not_an_error(self) -> None:
        index = CaseDocumentIndex()
        index.add_document("case-a", ["algo"])
        assert index.search("case-never-indexed", "algo") == []


class TestCaseDocumentIndexIsolationThroughGuidanceFlow:
    """
    Mirrors TestCaseDocumentIndexIsolation above, but exercises the real
    wiring path: docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4
    flagged that `CaseDocumentIndex.search()` was implemented but never
    called from `bankruptcy_service.py`. This proves `guide()` now calls it
    AND that the isolation guarantee survives all the way through
    `BankruptcyGuidanceService.guide()` into the `CaseContextDto` a provider
    actually receives — not just at the raw `CaseDocumentIndex` layer.
    """

    class _CapturingProvider:
        """Delegates to RuleBasedProvider (so guardrails/response shape stay
        realistic) but records every `context` it was handed, so the test
        can assert on what the service actually built without a live
        Ollama/transformers model."""

        def __init__(self) -> None:
            self.contexts: list[CaseContextDto] = []

        def is_available(self) -> bool:
            return True

        def generate(self, *, context: CaseContextDto, message: str):
            self.contexts.append(context)
            return RuleBasedProvider().generate(context=context, message=message)

    def test_guide_never_surfaces_another_cases_retrieved_documents(self) -> None:
        index = CaseDocumentIndex()
        index.add_document("case-a", ["Elena tiene un ingreso de $2,000 mensuales por nomina."])
        index.add_document("case-b", ["Miguel tiene una deuda hipotecaria de $150,000 en mora."])

        provider = self._CapturingProvider()
        service = BankruptcyGuidanceService(
            get_settings(), provider=provider, document_index=index
        )

        case_a = BankruptcyCaseDto(
            id="case-a", owner_user_id="client-demo",
            client_name="Elena Rivera", client_email="client@freshstart.demo",
        )
        case_b = BankruptcyCaseDto(
            id="case-b", owner_user_id="client-demo",
            client_name="Miguel Santos", client_email="miguel@freshstart.demo",
        )

        service.guide(
            GuidanceRequestDto(case=case_a, message="ingreso mensual", role="client", locale="es")
        )
        service.guide(
            GuidanceRequestDto(case=case_b, message="ingreso mensual", role="client", locale="es")
        )

        context_a, context_b = provider.contexts
        assert any("Elena" in chunk for chunk in context_a.retrieved_documents)
        assert all("Miguel" not in chunk for chunk in context_a.retrieved_documents)
        assert any("Miguel" in chunk for chunk in context_b.retrieved_documents)
        assert all("Elena" not in chunk for chunk in context_b.retrieved_documents)


class TestDocumentIngestionService:
    def test_end_to_end_ingestion_of_a_text_fixture(self) -> None:
        service = DocumentIngestionService()
        content = "Talón de pago - salario bruto $1,200.00 - Employer Inc.".encode()
        result = service.ingest(case_id="case-a", filename="paystub.txt", content=content)

        assert result.evidence_type == "Talones de pago"
        assert result.chunk_count == 1
        assert result.extracted_amounts[0].amount == 1200.00
        assert "Talón de pago" in result.extracted_text_preview
