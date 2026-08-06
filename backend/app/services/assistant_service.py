import json

from app.ai.base import AssistantProvider
from app.ai.prompts import SYSTEM_PROMPT_EN, SYSTEM_PROMPT_ES
from app.core.constants import LEGAL_DISCLAIMER_EN, LEGAL_DISCLAIMER_ES
from app.domain.enums import INTAKE_SECTION_ORDER, PreferredLanguage
from app.domain.models import BankruptcyCase
from app.schemas.assistant import AssistantReply


class AssistantService:
    def __init__(self, provider: AssistantProvider) -> None:
        self.provider = provider

    async def reply(
        self, *, case: BankruptcyCase, message: str, language: PreferredLanguage
    ) -> AssistantReply:
        completed = {section.section_key.value for section in case.sections if section.completed}
        missing = [key.value for key in INTAKE_SECTION_ORDER if key.value not in completed]
        context = {
            "case_id": case.id,
            "status": case.status.value,
            "progress": case.progress,
            "readiness_score": case.readiness_score,
            "missing_sections": missing,
            "sections": {section.section_key.value: section.data for section in case.sections},
        }

        if self.provider.__class__.__name__ == "DemoAssistantProvider":
            text = self._demo_reply(language, case, missing)
        else:
            instructions = SYSTEM_PROMPT_ES if language == PreferredLanguage.ES else SYSTEM_PROMPT_EN
            prompt = (
                f"CASE_CONTEXT={json.dumps(context, ensure_ascii=False)}\n\n"
                f"USER_MESSAGE={message}"
            )
            text = await self.provider.generate(instructions=instructions, message=prompt)

        disclaimer = LEGAL_DISCLAIMER_ES if language == PreferredLanguage.ES else LEGAL_DISCLAIMER_EN
        return AssistantReply(
            message=text, language=language, disclaimer=disclaimer, missing_sections=missing
        )

    @staticmethod
    def _demo_reply(
        language: PreferredLanguage, case: BankruptcyCase, missing: list[str]
    ) -> str:
        next_item = missing[0] if missing else None
        if language == PreferredLanguage.ES:
            if next_item:
                return (
                    f"He revisado el expediente. Está {case.progress}% completado y el próximo bloque "
                    f"recomendado es “{next_item}”. Puedo ayudarte a organizar la información de esa "
                    "sección y señalar datos que falten antes de la revisión profesional."
                )
            return (
                "El expediente está completo para una revisión inicial. Antes de cualquier decisión, "
                "un profesional legal debe confirmar los datos y explicar las opciones disponibles."
            )
        if next_item:
            return (
                f"I reviewed the case file. It is {case.progress}% complete, and the next recommended "
                f"section is “{next_item}”. I can help organize that information and identify missing "
                "details before professional review."
            )
        return (
            "The file is complete enough for an initial review. Before any decision is made, a legal "
            "professional should confirm the information and explain the available options."
        )
