from __future__ import annotations

import base64
import binascii

from fastapi import APIRouter, HTTPException, status

from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.schemas.documents import (
    DocumentAnalysisRequestDto,
    DocumentAnalysisResponseDto,
    ExtractedAmountDto,
)
from app.services.documents import DocumentIngestionService

router = APIRouter(tags=["Document Ingestion"])
registry = get_contract_registry()

# One shared ingestion service (and its CaseDocumentIndex) for the process
# lifetime — the in-memory index is intentionally scoped per-process for
# this demo; see docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md for how a
# persistent deployment would replace CaseDocumentIndex's storage.
_ingestion_service = DocumentIngestionService()


@router.post(
    registry.get("documents.analyze").path,
    response_model=DocumentAnalysisResponseDto,
    operation_id=registry.get("documents.analyze").operation_id,
)
def analyze_document(
    body: DocumentAnalysisRequestDto,
    _: CurrentUserDep,
) -> DocumentAnalysisResponseDto:
    try:
        content = base64.b64decode(body.content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="content_base64 is not valid base64.",
        ) from exc

    # UnsupportedDocumentError (a ValidationError) is handled by app.main's
    # domain-error exception handler -> 422, not caught here.
    result = _ingestion_service.ingest(case_id=body.case_id, filename=body.filename, content=content)

    return DocumentAnalysisResponseDto(
        evidence_type=result.evidence_type,
        extracted_text_preview=result.extracted_text_preview,
        extracted_amounts=[
            ExtractedAmountDto(label=item.label, amount=item.amount, provenance=item.provenance)
            for item in result.extracted_amounts
        ],
        chunk_count=result.chunk_count,
    )
