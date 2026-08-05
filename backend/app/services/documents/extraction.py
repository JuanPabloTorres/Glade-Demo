from __future__ import annotations

import importlib
import io
import logging
from pathlib import PurePosixPath

from app.core.errors import ValidationError

logger = logging.getLogger(__name__)


class UnsupportedDocumentError(ValidationError):
    """
    Raised when a document's format needs an optional dependency that isn't
    installed, or the format isn't recognized at all. Subclasses the
    existing `ValidationError` domain error so `app.main`'s exception
    handler maps it to 422 automatically — the router never needs a
    format-specific try/except (AGENTS.md: controllers only translate HTTP
    concerns, business logic/error typing lives in services).
    """


class DocumentTextExtractor:
    """
    Per master instruction §7.5: Docling primary / PyMuPDF fallback for PDF,
    python-docx for DOCX, openpyxl for XLSX. Plain text/markdown need no
    optional dependency and always work — the one format-fixture test that
    runs without installing the `documents` extra
    (backend/tests/test_document_pipeline.py).

    All optional libraries are lazy-imported (same pattern as
    TransformersProvider) so importing this module — and the whole app —
    never fails where the `documents` extra isn't installed.
    """

    def extract(self, *, filename: str, content: bytes) -> str:
        suffix = PurePosixPath(filename.lower()).suffix
        if suffix in {".txt", ".md"}:
            return content.decode("utf-8", errors="replace")
        if suffix == ".pdf":
            return self._extract_pdf(content)
        if suffix == ".docx":
            return self._extract_docx(content)
        if suffix in {".xlsx", ".xls"}:
            return self._extract_xlsx(content)
        raise UnsupportedDocumentError(f"Unsupported document format: '{suffix or filename}'.")

    def _extract_pdf(self, content: bytes) -> str:
        try:
            docling_converter = importlib.import_module("docling.document_converter")
            converter = docling_converter.DocumentConverter()
            with io.BytesIO(content) as buffer:
                result = converter.convert(buffer)
            return str(result.document.export_to_markdown())
        except Exception as exc:  # noqa: BLE001 - Docling has a wide failure surface; fall back below
            logger.info("Docling unavailable/failed for PDF extraction, trying PyMuPDF: %s", exc)
        try:
            fitz = importlib.import_module("fitz")  # PyMuPDF
            with fitz.open(stream=content, filetype="pdf") as document:
                return "\n".join(page.get_text() for page in document)
        except (ImportError, ModuleNotFoundError) as exc:
            raise UnsupportedDocumentError(
                "PDF extraction requires the optional 'documents' dependency group "
                "(docling or pymupdf) — neither is installed."
            ) from exc

    def _extract_docx(self, content: bytes) -> str:
        try:
            docx = importlib.import_module("docx")
        except (ImportError, ModuleNotFoundError) as exc:
            raise UnsupportedDocumentError(
                "DOCX extraction requires the optional 'documents' dependency group (python-docx)."
            ) from exc
        document = docx.Document(io.BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    def _extract_xlsx(self, content: bytes) -> str:
        try:
            openpyxl = importlib.import_module("openpyxl")
        except (ImportError, ModuleNotFoundError) as exc:
            raise UnsupportedDocumentError(
                "XLSX extraction requires the optional 'documents' dependency group (openpyxl)."
            ) from exc
        workbook = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        lines: list[str] = []
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows(values_only=True):
                cells = [str(cell) for cell in row if cell is not None]
                if cells:
                    lines.append(" ".join(cells))
        return "\n".join(lines)
