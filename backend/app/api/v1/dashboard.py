from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_dashboard_service
from app.domain.models import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_user),
) -> DashboardSummary:
    return service.summarize(current_user)
