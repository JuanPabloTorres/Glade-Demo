from app.core.errors import NotFoundError
from app.domain.enums import ActivityType, FactSourceType, MatterStatus
from app.domain.models import Activity, ExtractedFact, Matter
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.matter import MatterCreateDto, MatterDetailDto, MatterIntakeUpdateDto, MatterSummaryDto
from app.services.readiness_service import ReadinessService


class MatterService:
    def __init__(self, uow: SqlAlchemyUnitOfWork, readiness_service: ReadinessService) -> None:
        self._uow = uow
        self._readiness_service = readiness_service

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
            display_name=dto.display_name,
            case_type=dto.case_type.value,
            status=MatterStatus.INTAKE.value,
            email=str(dto.email) if dto.email else None,
            phone=dto.phone,
            assigned_to=dto.assigned_to,
        )
        self._uow.matters.add(matter)
        self._uow.flush()
        self._sync_intake_facts(matter)
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
        matter.display_name = dto.display_name
        matter.email = str(dto.email) if dto.email else None
        matter.phone = dto.phone
        matter.address = dto.address
        matter.date_of_birth = dto.date_of_birth
        matter.summary = dto.summary
        self._sync_intake_facts(matter)
        self._uow.activities.add(
            Activity(
                matter_id=matter.id,
                event_type=ActivityType.INTAKE_UPDATED.value,
                message="Canonical intake data updated",
            )
        )
        self._uow.commit()
        return MatterDetailDto.model_validate(matter)

    def _get_or_raise(self, matter_id: str) -> Matter:
        matter = self._uow.matters.get_with_relations(matter_id)
        if matter is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return matter

    def _sync_intake_facts(self, matter: Matter) -> None:
        field_names = ("display_name", "email", "phone", "address", "date_of_birth")
        for fact in matter.facts:
            if fact.source_type == FactSourceType.INTAKE.value:
                fact.is_current = False
        for field_name in field_names:
            value = getattr(matter, field_name)
            if value:
                self._uow.facts.add(
                    ExtractedFact(
                        matter_id=matter.id,
                        document_id=None,
                        field_name=field_name,
                        value=str(value),
                        source_type=FactSourceType.INTAKE.value,
                        source_label="Client intake",
                        is_current=True,
                    )
                )
