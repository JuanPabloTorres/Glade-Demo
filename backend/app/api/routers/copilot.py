from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import CurrentUserDep
from app.schemas.copilot import (
    ChatRequestDto,
    CopilotResponseDto,
    DocumentAnalyzeRequestDto,
    ResolveIssueRequestDto,
)
from app.services.intake_copilot_service import IntakeCopilotService

router = APIRouter(tags=["AI Intake Copilot"])
registry = get_contract_registry()


@router.post(
    registry.get("copilot.message").path,
    response_model=CopilotResponseDto,
    operation_id=registry.get("copilot.message").operation_id,
)
def send_message(
    body: ChatRequestDto,
    _: CurrentUserDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> CopilotResponseDto:
    return IntakeCopilotService(settings).respond(body)


@router.post(
    registry.get("copilot.document").path,
    response_model=CopilotResponseDto,
    operation_id=registry.get("copilot.document").operation_id,
)
def analyze_document(
    body: DocumentAnalyzeRequestDto,
    _: CurrentUserDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> CopilotResponseDto:
    return IntakeCopilotService(settings).analyze_document(body)


@router.post(
    registry.get("copilot.resolveIssue").path,
    response_model=CopilotResponseDto,
    operation_id=registry.get("copilot.resolveIssue").operation_id,
)
def resolve_issue(
    issue_id: str,
    body: ResolveIssueRequestDto,
    _: CurrentUserDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> CopilotResponseDto:
    return IntakeCopilotService(settings).resolve_issue(issue_id, body)
