from app.core.errors import NotFoundError, ValidationError
from app.domain.enums import ActivityType, ConflictStatus
from app.domain.models import Activity, Conflict
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.conflict import ConflictDto, ConflictResolveDto


class ConflictService:
    def __init__(self, uow: SqlAlchemyUnitOfWork) -> None:
        self._uow = uow

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

        setattr(matter, conflict.field_name, dto.selected_value)
        conflict.status = ConflictStatus.RESOLVED.value
        conflict.resolved_value = dto.selected_value
        self._uow.activities.add(
            Activity(
                matter_id=matter_id,
                event_type=ActivityType.CONFLICT_RESOLVED.value,
                message=f"Conflict resolved for {conflict.field_name}",
            )
        )
        self._uow.commit()
        return ConflictDto.model_validate(conflict)
