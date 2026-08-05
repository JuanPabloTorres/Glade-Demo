from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.schemas.bankruptcy import (
    CaseAnalysisDto,
    CaseAnalysisRequestDto,
    GuidanceRequestDto,
    GuidanceResponseDto,
)
from app.services.bankruptcy_service import (
    BankruptcyAnalysisService,
    BankruptcyGuidanceService,
)

router = APIRouter(tags=["Bankruptcy Guidance"])
registry = get_contract_registry()
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.post(
    registry.get("bankruptcy.analyze").path,
    response_model=CaseAnalysisDto,
    operation_id=registry.get("bankruptcy.analyze").operation_id,
)
def analyze_case(
    body: CaseAnalysisRequestDto,
    _: CurrentUserDep,
) -> CaseAnalysisDto:
    return BankruptcyAnalysisService().analyze(body.case)


@router.post(
    registry.get("bankruptcy.guide").path,
    response_model=GuidanceResponseDto,
    operation_id=registry.get("bankruptcy.guide").operation_id,
)
def guide_case(
    body: GuidanceRequestDto,
    _: CurrentUserDep,
    settings: SettingsDep,
) -> GuidanceResponseDto:
    return BankruptcyGuidanceService(settings).guide(body)
