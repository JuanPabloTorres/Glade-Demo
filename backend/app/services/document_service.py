from app.core.errors import NotFoundError
from app.core.normalization import normalize_value
from app.domain.enums import (
    ActivityType,
    ConflictStatus,
    DocumentStatus,
    FactSourceType,
)
from app.domain.models import Activity, Conflict, Document, ExtractedFact, Matter
from app.providers.document_intelligence.base import DocumentIntelligenceProvider
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.document import DocumentCreateDto, DocumentDto
from app.services.workflow_service import MatterWorkflowService


class DocumentService:
    def __init__(
        self,
        uow: SqlAlchemyUnitOfWork,
        provider: DocumentIntelligenceProvider,
        workflow_service: MatterWorkflowService,
    ) -> None:
        self._uow = uow
        self._provider = provider
        self._workflow_service = workflow_service

    def list_documents(self, matter_id: str) -> list[DocumentDto]:
        self._require_matter(matter_id)
        return [
            DocumentDto.model_validate(item)
            for item in self._uow.documents.list_for_matter(matter_id)
        ]

    def create_document(self, matter_id: str, dto: DocumentCreateDto) -> DocumentDto:
        matter = self._require_matter(matter_id)
        document = Document(
            matter=matter,
            original_name=dto.original_name.strip(),
            document_type=dto.document_type.value,
            content=dto.content.strip(),
            status=DocumentStatus.PROCESSED.value,
        )
        self._uow.documents.add(document)
        self._uow.flush()

        extracted_values = self._provider.extract(document.content)
        conflict_count = 0
        for extracted in extracted_values:
            value = extracted.value.strip()
            fact = ExtractedFact(
                matter=matter,
                document=document,
                field_name=extracted.field_name,
                value=value,
                source_type=FactSourceType.DOCUMENT.value,
                source_label=document.original_name,
                is_current=False,
            )
            self._uow.facts.add(fact)

            canonical_value = getattr(matter, extracted.field_name, None)
            has_difference = not canonical_value or (
                normalize_value(str(canonical_value)) != normalize_value(value)
            )
            if not has_difference:
                continue

            existing = self._uow.conflicts.find_open(
                matter_id,
                extracted.field_name,
                value,
                document.id,
            )
            if existing is not None:
                continue

            current_fact = next(
                (
                    candidate
                    for candidate in self._uow.facts.list_for_field(
                        matter_id, extracted.field_name
                    )
                    if candidate.is_current
                ),
                None,
            )
            conflict = Conflict(
                matter=matter,
                document=document,
                field_name=extracted.field_name,
                canonical_value=str(canonical_value or ""),
                conflicting_value=value,
                canonical_source=(
                    current_fact.source_label
                    if current_fact is not None
                    else "No canonical intake value"
                ),
                conflicting_source=document.original_name,
                status=ConflictStatus.OPEN.value,
            )
            self._uow.conflicts.add(conflict)
            conflict_count += 1

        if conflict_count:
            document.status = DocumentStatus.NEEDS_REVIEW.value
            self._uow.activities.add(
                Activity(
                    matter_id=matter_id,
                    event_type=ActivityType.CONFLICT_DETECTED.value,
                    message=(
                        f"{conflict_count} canonical review item(s) detected from "
                        f"{document.original_name}"
                    ),
                )
            )

        self._workflow_service.synchronize_status(matter, activate=True)
        self._uow.activities.add(
            Activity(
                matter_id=matter_id,
                event_type=ActivityType.DOCUMENT_PROCESSED.value,
                message=(
                    f"Document processed: {document.original_name}; "
                    f"{len(extracted_values)} fact(s) extracted"
                ),
            )
        )
        self._uow.commit()

        documents = self._uow.documents.list_for_matter(matter_id)
        selected = next((item for item in documents if item.id == document.id), None)
        if selected is None:
            raise NotFoundError("Document could not be reloaded")
        return DocumentDto.model_validate(selected)

    def _require_matter(self, matter_id: str) -> Matter:
        matter = self._uow.matters.get_with_relations(matter_id)
        if matter is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return matter
