from app.core.errors import NotFoundError, ValidationError
from app.core.normalization import normalize_value
from app.domain.enums import ActivityType, ConflictStatus, FactSourceType
from app.domain.models import Activity
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.conflict import ConflictDto, ConflictResolveDto
from app.services.workflow_service import MatterWorkflowService


class ConflictService:
    def __init__(
        self,
        uow: SqlAlchemyUnitOfWork,
        workflow_service: MatterWorkflowService,
    ) -> None:
        self._uow = uow
        self._workflow_service = workflow_service

    def list_conflicts(self, matter_id: str) -> list[ConflictDto]:
        if self._uow.matters.get(matter_id) is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return [
            ConflictDto.model_validate(item)
            for item in self._uow.conflicts.list_for_matter(matter_id)
        ]

    def resolve_conflict(
        self, matter_id: str, conflict_id: str, dto: ConflictResolveDto
    ) -> ConflictDto:
        matter = self._uow.matters.get_with_relations(matter_id)
        if matter is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        conflict = self._uow.conflicts.get(conflict_id)
        if conflict is None or conflict.matter_id != matter_id:
            raise NotFoundError(f"Conflict {conflict_id} was not found")
        if conflict.status == ConflictStatus.RESOLVED.value:
            raise ValidationError("Conflict is already resolved")
        if not hasattr(matter, conflict.field_name):
            raise ValidationError(f"Unsupported canonical field: {conflict.field_name}")

        selected = dto.selected_value.strip()
        canonical_match = bool(conflict.canonical_value) and (
            normalize_value(selected) == normalize_value(conflict.canonical_value)
        )
        document_match = normalize_value(selected) == normalize_value(
            conflict.conflicting_value
        )
        if not canonical_match and not document_match:
            raise ValidationError(
                "Selected value must match the canonical or document value"
            )

        current_fact = next(
            (
                fact
                for fact in self._uow.facts.list_for_field(
                    matter_id, conflict.field_name
                )
                if fact.is_current
            ),
            None,
        )
        if document_match:
            source_type = FactSourceType.DOCUMENT
            source_label = conflict.conflicting_source
            document_id = conflict.document_id
        else:
            source_type = (
                FactSourceType(current_fact.source_type)
                if current_fact is not None
                else FactSourceType.INTAKE
            )
            source_label = (
                current_fact.source_label
                if current_fact is not None
                else conflict.canonical_source
            )
            document_id = current_fact.document_id if current_fact is not None else None

        conflict.status = ConflictStatus.RESOLVED.value
        conflict.resolved_value = selected
        self._uow.flush()
        affected_document_ids = {conflict.document_id} if conflict.document_id else set()
        result = self._workflow_service.apply_canonical_value(
            matter,
            conflict.field_name,
            selected,
            source_type=source_type,
            source_label=source_label,
            document_id=document_id,
        )
        affected_document_ids.update(result.affected_document_ids)
        self._workflow_service.refresh_document_statuses(affected_document_ids)
        self._workflow_service.synchronize_status(matter, activate=True)

        resolution_source = "document" if document_match else "canonical record"
        message = (
            f"Conflict resolved for {conflict.field_name} using {resolution_source} value"
        )
        if result.auto_resolved_conflicts:
            message += (
                f"; {result.auto_resolved_conflicts} matching related conflict(s) "
                "reconciled"
            )
        self._uow.activities.add(
            Activity(
                matter_id=matter_id,
                event_type=ActivityType.CONFLICT_RESOLVED.value,
                message=message,
            )
        )
        self._uow.commit()
        return ConflictDto.model_validate(conflict)
