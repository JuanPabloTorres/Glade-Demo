"""
Dev-only demo-data reset. Task instruction: "Add a documented way to reset
demo data (e.g. a script or a dev-only endpoint gated by
settings.environment != 'production')." Backed by `app.repositories.seed`
so the CLI script (`backend/scripts/seed_demo_data.py`) and this endpoint
share exactly one definition of "demo data".

The route is always registered (so `contracts/api-contracts.json` and the
live OpenAPI schema stay in sync regardless of environment, which is what
`test_api_contracts.py` checks) — the production guard is a runtime check
inside the handler, not conditional route registration.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.repositories.seed import DEMO_CASE_ID, reset_demo_data
from app.schemas.admin import DemoResetResultDto

router = APIRouter(tags=["Admin"])
registry = get_contract_registry()
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.post(
    registry.get("admin.resetDemoData").path,
    response_model=DemoResetResultDto,
    operation_id=registry.get("admin.resetDemoData").operation_id,
)
def reset_demo_data_endpoint(
    _current_user: CurrentUserDep,
    settings: SettingsDep,
) -> DemoResetResultDto:
    if settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo data reset is disabled in production.",
        )
    reset_demo_data(settings)
    return DemoResetResultDto(status="reset", case_id=DEMO_CASE_ID)
