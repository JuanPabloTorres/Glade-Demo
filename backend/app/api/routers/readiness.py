from fastapi import APIRouter

from app.api.dependencies import ReadinessServiceDep, UowDep
from app.core.contracts import get_contract_registry
from app.core.errors import NotFoundError
from app.schemas.readiness import ReadinessDto

router = APIRouter(tags=["Readiness"])
contract = get_contract_registry().get("readiness.get")


@router.get(contract.path, response_model=ReadinessDto, operation_id=contract.operation_id)
def get_readiness(
    matter_id: str, uow: UowDep, service: ReadinessServiceDep
) -> ReadinessDto:
    matter = uow.matters.get_with_relations(matter_id)
    if matter is None:
        raise NotFoundError(f"Matter {matter_id} was not found")
    return service.calculate(matter)
