from fastapi import APIRouter

from app.api.dependencies import ActivityServiceDep
from app.core.contracts import get_contract_registry
from app.schemas.common import ActivityDto

router = APIRouter(tags=["Activities"])
contract = get_contract_registry().get("activities.list")


@router.get(
    contract.path,
    response_model=list[ActivityDto],
    operation_id=contract.operation_id,
)
def list_activities(matter_id: str, service: ActivityServiceDep) -> list[ActivityDto]:
    return service.list_activities(matter_id)
