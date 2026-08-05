from dataclasses import dataclass, field

from app.core.normalization import normalize_value
from app.domain.enums import (
    ActivityType,
    CanonicalField,
    ConflictStatus,
    DocumentStatus,
    FactSourceType,
    MatterStatus,
)
from app.domain.models import Activity, ExtractedFact, Matter
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.readiness import ReadinessDto
from app.services.readiness_service import ReadinessService


@dataclass(slots=True)
class CanonicalUpdateResult:
    auto_resolved_conflicts: int = 0
    affected_document_ids: set[str] = field(default_factory=set)


class MatterWorkflowService:
    """Coordinates canonical facts, conflict reconciliation, and matter lifecycle."""

    def __init__(
        self,
        uow: SqlAlchemyUnitOfWork,
        readiness_service: ReadinessService,
    ) -> None:
        self._uow = uow
        self._readiness_service = readiness_service

    def apply_canonical_value(
        self,
        matter: Matter,
        field_name: str,
        value: str | None,
        *,
        source_type: FactSourceType,
        source_label: str,
        document_id: str | None = None,
    ) -> CanonicalUpdateResult:
        if field_name not in {field.value for field in CanonicalField}:
            raise ValueError(f"Unsupported canonical field: {field_name}")

        cleaned_value = value.strip() if value and value.strip() else None
        setattr(matter, field_name, cleaned_value)

        facts = self._uow.facts.list_for_field(matter.id, field_name)
        for fact in facts:
            fact.is_current = False

        if cleaned_value is not None:
            selected_fact = self._uow.facts.find_matching(
                matter.id,
                field_name,
                cleaned_value,
                document_id=document_id,
                source_type=source_type.value,
            )
            if selected_fact is None:
                selected_fact = ExtractedFact(
                    matter=matter,
                    document_id=document_id,
                    field_name=field_name,
                    value=cleaned_value,
                    source_type=source_type.value,
                    source_label=source_label,
                    is_current=True,
                )
                self._uow.facts.add(selected_fact)
            else:
                selected_fact.is_current = True

        result = CanonicalUpdateResult()
        canonical_display = cleaned_value or ""
        canonical_source = source_label if cleaned_value else "No canonical intake value"
        for conflict in self._uow.conflicts.list_open_for_field(matter.id, field_name):
            conflict.canonical_value = canonical_display
            conflict.canonical_source = canonical_source
            if (
                cleaned_value is not None
                and normalize_value(conflict.conflicting_value)
                == normalize_value(cleaned_value)
            ):
                conflict.status = ConflictStatus.RESOLVED.value
                conflict.resolved_value = cleaned_value
                result.auto_resolved_conflicts += 1
                if conflict.document_id:
                    result.affected_document_ids.add(conflict.document_id)

        self._uow.flush()
        self.refresh_document_statuses(result.affected_document_ids)
        return result

    def refresh_document_statuses(self, document_ids: set[str]) -> None:
        for document_id in document_ids:
            document = self._uow.documents.get(document_id)
            if document is None:
                continue
            has_open_conflicts = self._uow.conflicts.count_open_for_document(document_id) > 0
            previous_status = document.status
            document.status = (
                DocumentStatus.NEEDS_REVIEW.value
                if has_open_conflicts
                else DocumentStatus.PROCESSED.value
            )
            if (
                previous_status == DocumentStatus.NEEDS_REVIEW.value
                and document.status == DocumentStatus.PROCESSED.value
            ):
                self._uow.activities.add(
                    Activity(
                        matter_id=document.matter_id,
                        event_type=ActivityType.DOCUMENT_REVIEW_COMPLETED.value,
                        message=f"Document review completed: {document.original_name}",
                    )
                )

    def synchronize_status(self, matter: Matter, *, activate: bool) -> ReadinessDto:
        readiness = self._readiness_service.calculate(matter)
        if readiness.score == 100 and readiness.open_conflicts == 0:
            desired = MatterStatus.READY_FOR_REVIEW
        elif activate or matter.status != MatterStatus.INTAKE.value:
            desired = MatterStatus.ACTIVE
        else:
            desired = MatterStatus.INTAKE

        if matter.status != desired.value:
            previous = matter.status
            matter.status = desired.value
            self._uow.activities.add(
                Activity(
                    matter_id=matter.id,
                    event_type=ActivityType.MATTER_STATUS_CHANGED.value,
                    message=f"Matter status changed from {previous} to {desired.value}",
                )
            )
        return readiness
