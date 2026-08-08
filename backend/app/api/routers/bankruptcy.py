from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.ai.contracts.assistant_response import AssistantResponse
from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.i18n import resolve_language, resolve_locale
from app.core.security import CurrentUserDep
from app.domain.value_objects import TimelineEventType
from app.repositories.ai_conversation_repository import AIConversationRepositoryDep
from app.repositories.case_repository import CaseRepositoryDep
from app.schemas.bankruptcy import (
    CaseAnalysisDto,
    CaseAnalysisRequestDto,
    GuidanceRequestDto,
)
from app.services.bankruptcy_service import (
    BankruptcyAnalysisService,
    BankruptcyGuidanceService,
)
from app.services.case_access_service import CaseAccessDep

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
    current_user: CurrentUserDep,
    case_access: CaseAccessDep,
    cases: CaseRepositoryDep,
    accept_language: Annotated[str | None, Header()] = None,
) -> CaseAnalysisDto:
    # Ownership fix (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3/
    # §5): previously any authenticated user could submit any case_id/case
    # payload with no check against a real record. `authorize_for_submission`
    # looks up the *persisted* owner (not the client-claimed one) and raises
    # 403/404 before anything below runs.
    case = case_access.authorize_for_submission(body.case, current_user)
    # The analysis generates prose (missing items, warnings, next steps), and
    # that prose is rendered verbatim by the workspace. Language comes from the
    # header rather than the body so the request contract is unchanged — the
    # same signal the error handlers already use (app/main.py).
    analysis = BankruptcyAnalysisService().analyze(
        case, language=resolve_language(resolve_locale(accept_language))
    )
    cases.upsert_case_snapshot(case, owner_user_id=case.owner_user_id)
    cases.record_timeline_event(
        case.id, TimelineEventType.ANALYSIS_RUN.value, "Analisis financiero generado."
    )
    return analysis


@router.post(
    registry.get("bankruptcy.guide").path,
    response_model=AssistantResponse,
    operation_id=registry.get("bankruptcy.guide").operation_id,
)
def guide_case(
    body: GuidanceRequestDto,
    current_user: CurrentUserDep,
    settings: SettingsDep,
    case_access: CaseAccessDep,
    cases: CaseRepositoryDep,
    conversations: AIConversationRepositoryDep,
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
    # Ownership fix, same gap as analyze_case above — case-ownership was
    # never checked at all before this task.
    case = case_access.authorize_for_submission(body.case, current_user)
    authorized_body = body.model_copy(update={"case": case})
    # The attorney's portfolio is resolved here, from the authenticated
    # session, and handed down already filtered. Two consequences worth being
    # explicit about: a client never carries one, so the cross-case specialist
    # is never even constructed for them; and the collection reaching the agent
    # was authorized before any model saw the request, which is the property
    # `PortfolioTools` is built to preserve.
    portfolio = (
        case_access.attorney_portfolio(current_user)
        if current_user.role == "attorney"
        else []
    )
    response = BankruptcyGuidanceService(
        settings, case_repository=cases, conversation_repository=conversations
    ).guide(authorized_body, portfolio=portfolio)
    # `case.attorney_notes` (free text on the case row) is persisted as part
    # of the snapshot below on every call. `case_notes` (an append-only log,
    # see CaseRepository.add_note) is intentionally not auto-populated from
    # it here — there is no per-note UI yet, so writing one row per guide
    # call would just duplicate the same text repeatedly. add_note exists
    # and is exercised by the seed data / repository tests; wiring a real
    # "add a note" action to it is a future, UI-driven step.
    cases.upsert_case_snapshot(case, owner_user_id=case.owner_user_id)
    cases.record_timeline_event(
        case.id, TimelineEventType.GUIDANCE_REQUESTED.value, body.message[:200]
    )
    return response
