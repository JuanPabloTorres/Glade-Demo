from __future__ import annotations

from dataclasses import dataclass

from app.services.documents.chunking import DocumentChunker
from app.services.documents.classification import DocumentClassifier
from app.services.documents.evidence_extraction import ExtractedAmount, FinancialEvidenceExtractor
from app.services.documents.extraction import DocumentTextExtractor
from app.services.documents.index import CaseDocumentIndex, get_shared_case_document_index


@dataclass
class IngestionResult:
    evidence_type: str
    extracted_text_preview: str
    extracted_amounts: list[ExtractedAmount]
    chunk_count: int


class DocumentIngestionService:
    """
    Orchestrates the pipeline: extract text -> classify evidence type ->
    find candidate amounts -> chunk -> index (scoped to the case). Every
    step is independently testable and independently swappable — this
    class only sequences them.
    """

    def __init__(
        self,
        extractor: DocumentTextExtractor | None = None,
        classifier: DocumentClassifier | None = None,
        evidence_extractor: FinancialEvidenceExtractor | None = None,
        chunker: DocumentChunker | None = None,
        index: CaseDocumentIndex | None = None,
    ) -> None:
        self._extractor = extractor or DocumentTextExtractor()
        self._classifier = classifier or DocumentClassifier()
        self._evidence_extractor = evidence_extractor or FinancialEvidenceExtractor()
        self._chunker = chunker or DocumentChunker()
        # Defaults to the process-wide shared index (see
        # `get_shared_case_document_index`'s docstring) so documents ingested
        # here are actually visible to `BankruptcyGuidanceService.guide()`'s
        # RAG search by default — pass an explicit `index=` (as tests do) to
        # opt out of the shared instance.
        self._index = index or get_shared_case_document_index()

    def ingest(self, *, case_id: str, filename: str, content: bytes) -> IngestionResult:
        text = self._extractor.extract(filename=filename, content=content)
        evidence_type = self._classifier.classify(text)
        amounts = self._evidence_extractor.extract_amounts(text)
        chunks = self._chunker.chunk(text)
        self._index.add_document(case_id, chunks)
        return IngestionResult(
            evidence_type=evidence_type,
            extracted_text_preview=text[:280],
            extracted_amounts=amounts,
            chunk_count=len(chunks),
        )
