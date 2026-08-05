from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.schemas.assistant import AssistantResponse
from app.schemas.bankruptcy import (
    CaseAnalysisDto,
    CaseAnalysisRequestDto,
    GuidanceRequestDto,
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
    response_model=AssistantResponse,
    operation_id=registry.get("bankruptcy.guide").operation_id,
)
def guide_case(
    body: GuidanceRequestDto,
    current_user: CurrentUserDep,
    settings: SettingsDep,
) -> AssistantResponse:
    # Security fix (docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md §6): the
    # request body's `role` was previously trusted as-is, never checked
    # against the authenticated session. A mismatched role is rejected here
    # rather than silently trusted — e.g. a client-authenticated session
    # cannot request attorney-scoped guidance by setting role="attorney" in
    # the body.
    if body.role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The requested role does not match the authenticated session.",
        )
    return BankruptcyGuidanceService(settings).guide(body)
