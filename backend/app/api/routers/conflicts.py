from fastapi import APIRouter

from app.api.dependencies import ConflictServiceDep
from app.core.contracts import get_contract_registry
from app.schemas.conflict import ConflictDto, ConflictResolveDto

router = APIRouter(tags=["Conflicts"])
registry = get_contract_registry()
list_contract = registry.get("conflicts.list")
resolve_contract = registry.get("conflicts.resolve")


@router.get(
    list_contract.path,
    response_model=list[ConflictDto],
    operation_id=list_contract.operation_id,
)
def list_conflicts(matter_id: str, service: ConflictServiceDep) -> list[ConflictDto]:
    return service.list_conflicts(matter_id)


@router.post(
    resolve_contract.path,
    response_model=ConflictDto,
    operation_id=resolve_contract.operation_id,
)
def resolve_conflict(
    matter_id: str,
    conflict_id: str,
    dto: ConflictResolveDto,
    service: ConflictServiceDep,
) -> ConflictDto:
    return service.resolve_conflict(matter_id, conflict_id, dto)
