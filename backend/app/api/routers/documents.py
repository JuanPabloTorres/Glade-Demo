from __future__ import annotations

import base64
import binascii

from fastapi import APIRouter, HTTPException, status

from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.repositories.document_repository import DocumentRepositoryDep
from app.schemas.documents import (
    DocumentAnalysisRequestDto,
    DocumentAnalysisResponseDto,
    ExtractedAmountDto,
)
from app.services.case_access_service import CaseAccessDep
from app.services.documents import DocumentIngestionService

router = APIRouter(tags=["Document Ingestion"])
registry = get_contract_registry()

# One shared ingestion service (and its CaseDocumentIndex) for the process
# lifetime — the in-memory index is intentionally scoped per-process for
# this demo; see docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md for how a
# persistent deployment would replace CaseDocumentIndex's storage. The RAG
# index and the durable `case_documents` audit-trail row (added by this
# task, see app.repositories.document_repository) are separate concerns
# that both get updated on every ingest call.
_ingestion_service = DocumentIngestionService()


@router.post(
    registry.get("documents.analyze").path,
    response_model=DocumentAnalysisResponseDto,
    operation_id=registry.get("documents.analyze").operation_id,
)
def analyze_document(
    body: DocumentAnalysisRequestDto,
    current_user: CurrentUserDep,
    case_access: CaseAccessDep,
    documents: DocumentRepositoryDep,
) -> DocumentAnalysisResponseDto:
    # Ownership fix (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3/
    # §5): documents.analyze previously accepted any case_id with no check
    # that the authenticated user owns (or, for attorneys, may review) that
    # case — this is the same gap bankruptcy.py had, applied here so a
    # client cannot fish for another client's documents by guessing case
    # ids. See CaseAccessService for the ownership rule.
    case_access.authorize_for_case_id(body.case_id, current_user)

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

    # Only persisted if the case already exists (case_access above 404s for
    # a brand-new case_id from a non-client, and a client's brand-new
    # case_id has no case row yet either — the document audit row requires
    # a case to attach to via FK, so it is recorded once bankruptcy.analyze
    # /guide has created the case row). This mirrors the "persist what's
    # submitted, don't require a frontend rewrite" scope of this task: the
    # frontend today may upload documents before the case's first
    # analyze/guide call, so this best-effort persistence step is skipped
    # (not failed) when there is no case row yet.
    if case_access.case_exists(body.case_id):
        documents.add_document(
            case_id=body.case_id,
            filename=body.filename,
            evidence_type=result.evidence_type,
            chunk_count=result.chunk_count,
        )

    return DocumentAnalysisResponseDto(
        evidence_type=result.evidence_type,
        extracted_text_preview=result.extracted_text_preview,
        extracted_amounts=[
            ExtractedAmountDto(label=item.label, amount=item.amount, provenance=item.provenance)
            for item in result.extracted_amounts
        ],
        chunk_count=result.chunk_count,
    )
