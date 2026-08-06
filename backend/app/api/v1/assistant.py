from fastapi import APIRouter, Depends

from app.api.dependencies import get_assistant_service, get_case_service, get_current_user
from app.domain.models import User
from app.schemas.assistant import AssistantMessage, AssistantReply
from app.services.assistant_service import AssistantService
from app.services.case_service import CaseService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=AssistantReply)
async def chat(
    payload: AssistantMessage,
    cases: CaseService = Depends(get_case_service),
    assistant: AssistantService = Depends(get_assistant_service),
    current_user: User = Depends(get_current_user),
) -> AssistantReply:
    case = cases.get_case(payload.case_id, current_user)
    language = payload.language or case.preferred_language
    return await assistant.reply(case=case, message=payload.message, language=language)
