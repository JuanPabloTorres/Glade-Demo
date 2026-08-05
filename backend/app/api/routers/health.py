from fastapi import APIRouter

from app.core.config import get_settings
from app.core.contracts import get_contract_registry
from app.core.version import APP_VERSION
from app.schemas.common import HealthDto

router = APIRouter(tags=["Health"])
contract = get_contract_registry().get("health.get")


@router.get(contract.path, response_model=HealthDto, operation_id=contract.operation_id)
def get_health() -> HealthDto:
    return HealthDto(
        status="ok",
        service=get_settings().app_name,
        version=APP_VERSION,
    )
