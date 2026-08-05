from app.core.errors import NotFoundError
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
from app.services.helpers import normalize_value


class DocumentService:
    def __init__(
        self,
        uow: SqlAlchemyUnitOfWork,
        provider: DocumentIntelligenceProvider,
    ) -> None:
        self._uow = uow
        self._provider = provider

    def list_documents(self, matter_id: str) -> list[DocumentDto]:
        self._require_matter(matter_id)
        return [DocumentDto.model_validate(item) for item in self._uow.documents.list_for_matter(matter_id)]

    def create_document(self, matter_id: str, dto: DocumentCreateDto) -> DocumentDto:
        matter = self._require_matter(matter_id)
        document = Document(
            matter_id=matter_id,
            original_name=dto.original_name,
            document_type=dto.document_type.value,
            content=dto.content,
            status=DocumentStatus.PROCESSED.value,
        )
        self._uow.documents.add(document)
        self._uow.flush()

        extracted_values = self._provider.extract(dto.content)
        conflict_count = 0
        for extracted in extracted_values:
            fact = ExtractedFact(
                matter_id=matter_id,
                document_id=document.id,
                field_name=extracted.field_name,
                value=extracted.value,
                source_type=FactSourceType.DOCUMENT.value,
                source_label=dto.original_name,
                is_current=False,
            )
            self._uow.facts.add(fact)
            canonical_value = getattr(matter, extracted.field_name, None)
            if canonical_value and normalize_value(str(canonical_value)) != normalize_value(extracted.value):
                existing = self._uow.conflicts.find_open(
                    matter_id, extracted.field_name, extracted.value
                )
                if existing is None:
                    self._uow.conflicts.add(
                        Conflict(
                            matter_id=matter_id,
                            field_name=extracted.field_name,
                            canonical_value=str(canonical_value),
                            conflicting_value=extracted.value,
                            canonical_source="Client intake",
                            conflicting_source=dto.original_name,
                            status=ConflictStatus.OPEN.value,
                        )
                    )
                    conflict_count += 1

        if conflict_count:
            document.status = DocumentStatus.NEEDS_REVIEW.value
            self._uow.activities.add(
                Activity(
                    matter_id=matter_id,
                    event_type=ActivityType.CONFLICT_DETECTED.value,
                    message=f"{conflict_count} conflict(s) detected from {dto.original_name}",
                )
            )
        self._uow.activities.add(
            Activity(
                matter_id=matter_id,
                event_type=ActivityType.DOCUMENT_PROCESSED.value,
                message=f"Document processed: {dto.original_name}",
            )
        )
        self._uow.commit()
        hydrated = self._uow.documents.get(document.id)
        if hydrated is None:
            raise NotFoundError("Document could not be reloaded")
        documents = self._uow.documents.list_for_matter(matter_id)
        selected = next(item for item in documents if item.id == document.id)
        return DocumentDto.model_validate(selected)

    def _require_matter(self, matter_id: str) -> Matter:
        matter = self._uow.matters.get_with_relations(matter_id)
        if matter is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return matter
