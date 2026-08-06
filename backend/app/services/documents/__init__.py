"""
Document ingestion + local RAG scaffolding — master instruction §7.5/§7.6.
See docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md for scope and known
limitations (which formats are fixture-tested vs. implemented-by-inspection
against stable, well-known library APIs).
"""

from app.services.documents.chunking import DocumentChunker
from app.services.documents.classification import DocumentClassifier
from app.services.documents.embedding import EmbeddingService
from app.services.documents.evidence_extraction import ExtractedAmount, FinancialEvidenceExtractor
from app.services.documents.extraction import DocumentTextExtractor, UnsupportedDocumentError
from app.services.documents.index import CaseDocumentIndex
from app.services.documents.ingestion import DocumentIngestionService, IngestionResult

__all__ = [
    "CaseDocumentIndex",
    "DocumentChunker",
    "DocumentClassifier",
    "DocumentIngestionService",
    "DocumentTextExtractor",
    "EmbeddingService",
    "ExtractedAmount",
    "FinancialEvidenceExtractor",
    "IngestionResult",
    "UnsupportedDocumentError",
]
