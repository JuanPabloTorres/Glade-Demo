from app.core.errors import NotFoundError
from app.domain.enums import ActivityType, FactSourceType, MatterStatus
from app.domain.models import Activity, Matter
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.matter import (
    MatterCreateDto,
    MatterDetailDto,
    MatterIntakeUpdateDto,
    MatterSummaryDto,
)
from app.services.readiness_service import ReadinessService
from app.services.workflow_service import MatterWorkflowService


class MatterService:
    def __init__(
        self,
        uow: SqlAlchemyUnitOfWork,
        readiness_service: ReadinessService,
        workflow_service: MatterWorkflowService,
    ) -> None:
        self._uow = uow
        self._readiness_service = readiness_service
        self._workflow_service = workflow_service

    def list_matters(self) -> list[MatterSummaryDto]:
        matters = self._uow.matters.list_recent()
        result: list[MatterSummaryDto] = []
        for matter in matters:
            hydrated = self._uow.matters.get_with_relations(matter.id)
            if hydrated is None:
                continue
            readiness = self._readiness_service.calculate(hydrated)
            result.append(
                MatterSummaryDto(
                    id=hydrated.id,
                    display_name=hydrated.display_name,
                    case_type=hydrated.case_type,
                    status=hydrated.status,
                    email=hydrated.email,
                    phone=hydrated.phone,
                    assigned_to=hydrated.assigned_to,
                    created_at=hydrated.created_at,
                    open_conflicts=readiness.open_conflicts,
                    readiness_score=readiness.score,
                )
            )
        return result

    def create_matter(self, dto: MatterCreateDto) -> MatterDetailDto:
        matter = Matter(
            display_name=dto.display_name.strip(),
            case_type=dto.case_type.value,
            status=MatterStatus.INTAKE.value,
            assigned_to=self._clean(dto.assigned_to),
        )
        self._uow.matters.add(matter)
        self._uow.flush()

        initial_values = {
            "display_name": dto.display_name,
            "email": str(dto.email) if dto.email else None,
            "phone": dto.phone,
            "address": None,
            "date_of_birth": None,
        }
        for field_name, value in initial_values.items():
            self._workflow_service.apply_canonical_value(
                matter,
                field_name,
                value,
                source_type=FactSourceType.INTAKE,
                source_label="Client intake",
            )

        self._uow.activities.add(
            Activity(
                matter_id=matter.id,
                event_type=ActivityType.MATTER_CREATED.value,
                message=f"Matter created for {matter.display_name}",
            )
        )
        self._uow.commit()
        return MatterDetailDto.model_validate(matter)

    def get_matter(self, matter_id: str) -> MatterDetailDto:
        matter = self._get_or_raise(matter_id)
        return MatterDetailDto.model_validate(matter)

    def update_intake(self, matter_id: str, dto: MatterIntakeUpdateDto) -> MatterDetailDto:
        matter = self._get_or_raise(matter_id)
        values = {
            "display_name": dto.display_name,
            "email": str(dto.email) if dto.email else None,
            "phone": dto.phone,
            "address": dto.address,
            "date_of_birth": dto.date_of_birth,
        }
        auto_resolved = 0
        for field_name, value in values.items():
            result = self._workflow_service.apply_canonical_value(
                matter,
                field_name,
                value,
                source_type=FactSourceType.INTAKE,
                source_label="Client intake",
            )
            auto_resolved += result.auto_resolved_conflicts

        matter.summary = self._clean(dto.summary)
        self._workflow_service.synchronize_status(matter, activate=True)
        message = "Canonical intake data updated"
        if auto_resolved:
            message += f"; {auto_resolved} matching conflict(s) reconciled"
        self._uow.activities.add(
            Activity(
                matter_id=matter.id,
                event_type=ActivityType.INTAKE_UPDATED.value,
                message=message,
            )
        )
        self._uow.commit()
        return MatterDetailDto.model_validate(matter)

    def _get_or_raise(self, matter_id: str) -> Matter:
        matter = self._uow.matters.get_with_relations(matter_id)
        if matter is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return matter

    @staticmethod
    def _clean(value: str | None) -> str | None:
        return value.strip() if value and value.strip() else None
