from fastapi import APIRouter, status

from app.api.dependencies import MatterServiceDep
from app.core.contracts import get_contract_registry
from app.schemas.matter import (
    MatterCreateDto,
    MatterDetailDto,
    MatterIntakeUpdateDto,
    MatterSummaryDto,
)

router = APIRouter(tags=["Matters"])
registry = get_contract_registry()
list_contract = registry.get("matters.list")
create_contract = registry.get("matters.create")
get_contract = registry.get("matters.get")
update_contract = registry.get("matters.updateIntake")


@router.get(
    list_contract.path,
    response_model=list[MatterSummaryDto],
    operation_id=list_contract.operation_id,
)
def list_matters(service: MatterServiceDep) -> list[MatterSummaryDto]:
    return service.list_matters()


@router.post(
    create_contract.path,
    response_model=MatterDetailDto,
    status_code=status.HTTP_201_CREATED,
    operation_id=create_contract.operation_id,
)
def create_matter(dto: MatterCreateDto, service: MatterServiceDep) -> MatterDetailDto:
    return service.create_matter(dto)


@router.get(
    get_contract.path,
    response_model=MatterDetailDto,
    operation_id=get_contract.operation_id,
)
def get_matter(matter_id: str, service: MatterServiceDep) -> MatterDetailDto:
    return service.get_matter(matter_id)


@router.put(
    update_contract.path,
    response_model=MatterDetailDto,
    operation_id=update_contract.operation_id,
)
def update_intake(
    matter_id: str, dto: MatterIntakeUpdateDto, service: MatterServiceDep
) -> MatterDetailDto:
    return service.update_intake(matter_id, dto)
