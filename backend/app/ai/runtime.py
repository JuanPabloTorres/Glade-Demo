"""
Per-request agent runtime (ADR 0002).

This is the module that reconciles the Strands orchestration layer with the
product's non-negotiables. Read the order of operations in `execute` as the
contract:

1. The deterministic draft is computed **first, always**, for every request —
   including ones the agent goes on to answer. It is both the fallback and
   the source of the `requires_attorney_review` baseline.
2. The agent layer runs only if it is installed, configured and reachable.
3. Whatever the agent produced is *filtered* — actions against a server-side
   allow-list, message through the same `ResponseGuardrails` every provider
   has always passed through.
4. The response is composed server-side. The model never supplies the
   disclaimer and never lowers `requires_attorney_review`.

Any failure at step 2 or 3 falls back to step 1's answer with
`degraded=True`. There is no path where a model outage produces an error
response: AGENTS.md requires the assistant to always have a fallback.

Nothing about Strands is imported at module scope. `strands` lives in the
optional `agents` extra, and an install without it must still boot and still
answer — deterministically.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from app.ai.contracts.assistant_response import (
    ALLOWED_ACTION_RESOURCES,
    AgentAnswer,
    AssistantAction,
    AssistantActionType,
    AssistantResponse,
)
from app.ai.guardrails import ResponseGuardrails
from app.ai.model_factory import AGENT_PROVIDERS, ModelFactory
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.rule_based import RuleBasedProvider

if TYPE_CHECKING:
    from app.core.config import Settings
    from app.schemas.assistant import CaseContextDto
    from app.services.documents.index import CaseDocumentIndex

logger = logging.getLogger(__name__)

_MAX_AGENT_TURNS = 8
"""Cap on orchestrator↔specialist round trips. Bounds both cost and the
blast radius of a prompt-injection attempt that tries to drive the loop."""

_OPEN_SECTION_LABEL = {
    "es": "Abrir la sección recomendada",
    "en": "Open the recommended section",
}

_DISCLAIMER = {
    "es": (
        "Esta orientacion organiza informacion y preguntas. No determina elegibilidad, "
        "no sustituye el means test oficial y no es asesoramiento legal."
    ),
    "en": (
        "This guidance organizes information and questions. It does not determine "
        "eligibility, does not replace the official means test, and is not legal advice."
    ),
}


@dataclass(frozen=True)
class AgentRequestContext:
    """Authorization facts for one turn.

    Every field is derived server-side: `case_id` and `role` come from
    `CaseAccessService.authorize_for_submission` and the authenticated
    session, never from the request body. Nothing here is ever interpolated
    into a prompt as an authorization claim — the runtime uses these to
    decide what to *build*, and the built objects carry the authority.
    """

    case_id: str
    role: str
    language: str


class AgentRuntime:
    def __init__(
        self,
        settings: Settings,
        document_index: CaseDocumentIndex,
        fallback: BaseAIProvider | None = None,
    ) -> None:
        self._settings = settings
        self._document_index = document_index
        self._fallback = fallback or RuleBasedProvider()
        self._guardrails = ResponseGuardrails()

    # -- public ----------------------------------------------------------

    def execute(self, *, context: CaseContextDto, message: str) -> AssistantResponse:
        draft = self._fallback.generate(context=context, message=message)
        answer: AgentAnswer | None = None

        if self._agents_enabled():
            try:
                answer = self._run_agents(context=context, message=message)
            except Exception:  # noqa: BLE001 - the no-5xx guarantee lives here
                # `_run_agents` already catches its own failures. This second
                # net makes "a model problem never fails the request" a
                # property of `execute` rather than of one method's internals
                # — so it still holds if that method is later refactored,
                # subclassed, or grows a code path outside its own try.
                logger.warning("Agent path raised past its own handler", exc_info=True)
                answer = None

        if answer is None:
            return self._compose(
                context=context,
                draft=draft,
                answer=self._draft_as_answer(draft, language=context.language),
                degraded=True,
            )
        return self._compose(context=context, draft=draft, answer=answer, degraded=False)

    # -- agent path ------------------------------------------------------

    def _agents_enabled(self) -> bool:
        return self._settings.ai_provider.strip().lower() in AGENT_PROVIDERS

    def _run_agents(self, *, context: CaseContextDto, message: str) -> AgentAnswer | None:
        try:
            # Imported here, not at module scope: `strands` is optional and
            # this is the only code path that requires it.
            from strands.types.agent import Limits

            from app.ai.agents.factory import AgentFactory
            from app.ai.tools.case_tools import CaseTools

            model = ModelFactory(self._settings).create()
            orchestrator = AgentFactory(
                model=model,
                tools=CaseTools(context=context, document_index=self._document_index),
                language=context.language,
                role=context.role,
            ).create_orchestrator()

            result = orchestrator(
                self._build_prompt(context=context, message=message),
                structured_output_model=AgentAnswer,
                limits=Limits(turns=_MAX_AGENT_TURNS),
            )
        except ImportError:
            logger.warning(
                "AI_PROVIDER=%s requires the 'agents' extra (pip install "
                "'freshstart-bankruptcy-api[agents]'). Answering deterministically.",
                self._settings.ai_provider,
            )
            return None
        except Exception:  # noqa: BLE001 - every model failure degrades, never 500s
            logger.warning("Agent layer unavailable, using deterministic draft", exc_info=True)
            return None

        answer = getattr(result, "structured_output", None)
        if not isinstance(answer, AgentAnswer) or not answer.message.strip():
            logger.warning("Agent returned no usable structured output; using deterministic draft.")
            return None
        return answer

    @staticmethod
    def _build_prompt(*, context: CaseContextDto, message: str) -> str:
        # The user's message is the only free text here. Case facts are NOT
        # interpolated into the prompt — the specialists fetch them through
        # tools, which is the whole point of the tool layer. Role is stated
        # for tone only; the actual role gate is which specialists exist
        # (AgentFactory.create_orchestrator), not this line.
        return (
            f"Answer in: {context.language}\n"
            f"The person asking is the: {context.role}\n"
            f"Their message:\n{message}"
        )

    # -- composition ------------------------------------------------------

    def _draft_as_answer(self, draft: Any, *, language: str) -> AgentAnswer:
        """Project the deterministic draft onto the 4.0.0 action contract.

        The draft's `focus_section` used to be a top-level response field the
        UI turned into an "open the recommended section" affordance. The new
        contract has no such field, so it becomes a real `open_page` action
        here — without this the degraded path emits only `ask` actions, the
        UI finds nothing navigable, and that affordance silently disappears
        whenever no model is configured (which is the default deployment).
        """
        section = (
            draft.focus_section if draft.focus_section in ALLOWED_ACTION_RESOURCES else "overview"
        )
        actions = [
            AssistantAction(
                id="focus-section",
                action_type=AssistantActionType.OPEN_PAGE,
                resource=section,
                label=_OPEN_SECTION_LABEL.get(language, _OPEN_SECTION_LABEL["es"]),
                icon="arrow-right",
            )
        ]
        actions.extend(
            AssistantAction(
                id=f"suggested-{index}",
                action_type=AssistantActionType.ASK,
                # An `ask` action is a follow-up message the user sends, not a
                # destination — the frontend never navigates on it. It carries
                # the section the draft was about purely as context, which is
                # why every one of them shares the same resource rather than
                # each guessing a target from its own label text.
                resource=section,
                label=text,
            )
            for index, text in enumerate(draft.suggested_actions)
        )
        return AgentAnswer(message=draft.message, handled_by="deterministic", actions=actions)

    def _compose(
        self,
        *,
        context: CaseContextDto,
        draft: Any,
        answer: AgentAnswer,
        degraded: bool,
    ) -> AssistantResponse:
        guarded = self._guardrails.review(answer.message, language=context.language)
        return AssistantResponse(
            language=context.language,
            message=guarded.message,
            handled_by=answer.handled_by,
            actions=self._allowed_actions(answer.actions),
            cards=answer.cards,
            warnings=draft.warnings,
            # OR, never assignment: neither the model nor a degraded path can
            # clear a review requirement the deterministic draft or the
            # guardrails established.
            requires_attorney_review=(
                draft.requires_attorney_review or guarded.requires_attorney_review
            ),
            degraded=degraded,
            disclaimer=_DISCLAIMER.get(context.language, _DISCLAIMER["es"]),
        )

    @staticmethod
    def _allowed_actions(actions: list[AssistantAction]) -> list[AssistantAction]:
        """Drop any action naming a resource outside the allow-list.

        Dropped rather than coerced to a default: a model that invented a
        target has not established what the user wants, and silently
        rewriting it to "overview" would render a button that goes somewhere
        nobody asked for.
        """
        kept: list[AssistantAction] = []
        for action in actions:
            if action.resource in ALLOWED_ACTION_RESOURCES:
                kept.append(action)
            else:
                logger.warning("Dropped assistant action for resource %r.", action.resource)
        return kept
