"""
AgentRuntime tests (ADR 0002).

These cover the properties that make the Strands layer safe to put in front
of the assistant. Each one corresponds to a line in `AgentRuntime.execute`'s
documented order of operations, and none of them requires a model: the agent
path is driven through a stub orchestrator so the assertions are about the
runtime's own logic, not a model's mood.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.ai.contracts.assistant_response import (
    ALLOWED_ACTION_RESOURCES,
    AgentAnswer,
    AssistantAction,
    AssistantCard,
)
from app.ai.runtime import AgentRuntime
from app.core.config import Settings, get_settings
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, UserRole
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex


def _context(role: UserRole = "client", locale: str = "es-PR") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id="case-runtime-test",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
    )
    analysis = BankruptcyAnalysisService().analyze(case)
    return CaseContextBuilder().build(case, analysis, role, locale)


def _runtime(**overrides: Any) -> AgentRuntime:
    settings = get_settings().model_copy(update=overrides)
    return AgentRuntime(settings=settings, document_index=CaseDocumentIndex())


class _StubResult:
    def __init__(self, structured_output: Any) -> None:
        self.structured_output = structured_output


def _patch_agent_layer(monkeypatch: pytest.MonkeyPatch, result: Any) -> dict[str, Any]:
    """Replace the whole agent construction path with a stub orchestrator.

    Patches `AgentRuntime._run_agents`' collaborators rather than the model,
    so the test never depends on strands' internals beyond the call shape the
    runtime actually uses.
    """
    captured: dict[str, Any] = {}

    def fake_run(self: AgentRuntime, *, context: CaseContextDto, message: str) -> Any:
        captured["message"] = message
        captured["context"] = context
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(AgentRuntime, "_run_agents", fake_run)
    return captured


class TestDeterministicFloor:
    def test_rule_based_settings_never_enter_the_agent_path(self) -> None:
        response = _runtime(ai_provider="rule_based").execute(
            context=_context(), message="¿qué me falta?"
        )
        assert response.degraded is True
        assert response.handled_by == "deterministic"
        assert response.message.strip()

    def test_degraded_answer_still_offers_a_navigable_section(self) -> None:
        """Regression: the 3.x contract carried `focus_section` as a response
        field the UI turned into "open the recommended section". The 4.0.0
        contract has no such field, and the first cut emitted only `ask`
        actions on the degraded path — so that affordance vanished in the
        default deployment (AI_PROVIDER=rule_based). Caught by a real
        end-to-end request, not by a unit test, which is why it is pinned here.
        """
        response = _runtime(ai_provider="rule_based").execute(
            context=_context(), message="¿qué me falta?"
        )
        navigable = [action for action in response.actions if action.action_type == "open_page"]
        assert len(navigable) == 1
        assert navigable[0].resource in ALLOWED_ACTION_RESOURCES

    def test_unknown_provider_still_answers(self) -> None:
        response = _runtime(ai_provider="not-a-provider").execute(
            context=_context(), message="¿qué me falta?"
        )
        assert response.degraded is True
        assert response.message.strip()

    def test_openai_without_a_key_degrades_instead_of_raising(self) -> None:
        """A missing API key is a deployment state, not a request error.

        This is the exact configuration a demo hits when AI_PROVIDER=openai is
        set but no secret is present, and it must produce an answer rather
        than a 500.
        """
        response = _runtime(ai_provider="openai", openai_api_key=None).execute(
            context=_context(), message="¿qué me falta?"
        )
        assert response.degraded is True
        assert response.message.strip()

    def test_agent_exception_degrades_to_the_deterministic_answer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(
            AgentRuntime,
            "_run_agents",
            lambda self, **_kwargs: (_ for _ in ()).throw(RuntimeError("model exploded")),
        )
        response = _runtime(ai_provider="ollama").execute(
            context=_context(), message="¿qué me falta?"
        )
        assert response.degraded is True
        assert response.message.strip()


class TestAgentPathComposition:
    def test_agent_answer_is_used_and_marked_not_degraded(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_agent_layer(
            monkeypatch,
            AgentAnswer(
                message="Faltan tus talones de pago.",
                handled_by="documents_agent",
                cards=[AssistantCard(card_type="pending_documents", title="Pendientes")],
            ),
        )
        response = _runtime(ai_provider="ollama").execute(
            context=_context(), message="¿qué documentos faltan?"
        )
        assert response.degraded is False
        assert response.handled_by == "documents_agent"
        assert response.message == "Faltan tus talones de pago."
        assert response.cards[0].card_type == "pending_documents"

    def test_disclaimer_is_always_present_and_server_owned(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_agent_layer(monkeypatch, AgentAnswer(message="Todo bien."))
        response = _runtime(ai_provider="ollama").execute(context=_context(), message="hola")
        assert "no es asesoramiento legal" in response.disclaimer

    def test_english_locale_gets_the_english_disclaimer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_agent_layer(monkeypatch, AgentAnswer(message="All good."))
        response = _runtime(ai_provider="ollama").execute(
            context=_context(locale="en-US"), message="hi"
        )
        assert response.language == "en"
        assert "is not legal advice" in response.disclaimer

    def test_case_facts_are_not_interpolated_into_the_prompt(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Facts reach the model through tools, never through the prompt.

        If figures were pasted into the prompt the tool layer would be
        decorative — the model could answer from prompt text without ever
        calling a tool that enforces case binding.
        """
        captured = _patch_agent_layer(monkeypatch, AgentAnswer(message="ok"))
        _runtime(ai_provider="ollama").execute(context=_context(), message="¿cuánto debo?")
        prompt = AgentRuntime._build_prompt(context=captured["context"], message=captured["message"])
        assert "Elena Rivera" not in prompt
        assert "¿cuánto debo?" in prompt


class TestGuardrailsAndAllowList:
    def test_guardrails_apply_to_agent_output(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _patch_agent_layer(
            monkeypatch,
            AgentAnswer(message="Usted califica para el descargo y debe presentar de inmediato."),
        )
        response = _runtime(ai_provider="ollama").execute(context=_context(), message="¿califico?")
        assert "usted califica" not in response.message.casefold()
        assert response.requires_attorney_review is True

    def test_model_cannot_lower_requires_attorney_review(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The attorney-review verdict is an OR of deterministic and guardrail
        results. An attorney-role draft always sets it; a bland agent message
        must not clear it."""
        _patch_agent_layer(monkeypatch, AgentAnswer(message="Todo en orden, sin observaciones."))
        response = _runtime(ai_provider="ollama").execute(
            context=_context(role="attorney"), message="resumen"
        )
        assert response.requires_attorney_review is True

    def test_actions_outside_the_allow_list_are_dropped(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_agent_layer(
            monkeypatch,
            AgentAnswer(
                message="Revisa esto.",
                actions=[
                    AssistantAction(
                        id="ok", action_type="open_page", resource="evidence", label="Evidencia"
                    ),
                    AssistantAction(
                        id="bad",
                        action_type="open_page",
                        resource="../../admin/users",
                        label="Panel",
                    ),
                    AssistantAction(
                        id="bad-2", action_type="show_details", resource="billing", label="Facturas"
                    ),
                ],
            ),
        )
        response = _runtime(ai_provider="ollama").execute(context=_context(), message="hola")
        assert [action.id for action in response.actions] == ["ok"]

    def test_empty_agent_message_falls_back(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(
            AgentRuntime,
            "_run_agents",
            lambda self, **_kwargs: None,
        )
        response = _runtime(ai_provider="ollama").execute(context=_context(), message="hola")
        assert response.degraded is True
        assert response.message.strip()


class TestSettingsSurface:
    def test_agent_providers_are_exactly_openai_and_ollama(self) -> None:
        from app.ai.model_factory import AGENT_PROVIDERS

        assert AGENT_PROVIDERS == frozenset({"openai", "ollama"})

    def test_settings_still_default_to_the_deterministic_provider(self) -> None:
        assert Settings().ai_provider == "rule_based"
