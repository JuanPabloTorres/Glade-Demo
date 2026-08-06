from fastapi import APIRouter

from app.core.config import get_settings
from app.core.contracts import get_contract_registry
from app.schemas.common import AIHealthDto
from app.services.ai_health_service import AIHealthService

router = APIRouter(tags=["AI"])
contract = get_contract_registry().get("ai.health")


@router.get(contract.path, response_model=AIHealthDto, operation_id=contract.operation_id)
def get_ai_health() -> AIHealthDto:
    settings = get_settings()
    return AIHealthService(settings).get_health()
