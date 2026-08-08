"""
An agentic provider that cannot honour the structured contract must degrade on
the spot, not after a model round trip.

`AgentRuntime` asks Strands for `structured_output_model=AgentAnswer`, which the
SDK implements by constraining tool choice. Ollama's adapter accepts and ignores
that constraint (`strands/models/ollama.py` calls
`warn_on_tool_choice_not_supported`), so the model answers in prose, the
structured output is absent, and the turn degrades — after 1 to 24 seconds of
waiting, depending on the model. Measured in
`docs/audits/STRANDS-ACCEPTANCE-AUDIT.md`.

These tests pin the refusal *and* the thing the refusal must not cost: the
deterministic answer stays complete, and the safety properties around it are
untouched. Degrading earlier is only an improvement if it degrades to the same
place.
"""

from __future__ import annotations

import pytest

from app.ai.model_factory import (
    AGENT_PROVIDERS,
    OLLAMA,
    OPENAI,
    STRUCTURED_OUTPUT_PROVIDERS,
    ModelFactory,
    supports_forced_structured_output,
)
from app.ai.runtime import AgentRuntime
from app.core.config import get_settings
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex


def _context(role: str = "client", locale: str = "es-PR") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id="case-capability-test",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
    )
    return CaseContextBuilder().build(
        case, BankruptcyAnalysisService().analyze(case), role, locale
    )


def _runtime(provider: str) -> AgentRuntime:
    settings = get_settings().model_copy(update={"ai_provider": provider})
    return AgentRuntime(settings=settings, document_index=CaseDocumentIndex())


class TestCapabilityVocabulary:
    def test_structured_output_providers_are_a_subset_of_agent_providers(self) -> None:
        """A provider that cannot reach Strands cannot have a Strands capability."""
        assert STRUCTURED_OUTPUT_PROVIDERS <= AGENT_PROVIDERS

    def test_openai_compatible_providers_can_be_forced(self) -> None:
        # Covers Groq, Cerebras, OpenRouter and anything else reached through
        # OPENAI_BASE_URL — the capability is the adapter's, not the vendor's.
        assert supports_forced_structured_output(OPENAI)
        assert supports_forced_structured_output(" OpenAI ")

    def test_ollama_cannot_be_forced(self) -> None:
        assert not supports_forced_structured_output(OLLAMA)

    def test_a_provider_outside_the_agent_set_is_not_capable(self) -> None:
        assert not supports_forced_structured_output("rule_based")


class TestIncompatibleProviderDegradesWithoutCallingTheModel:
    def test_no_model_is_ever_constructed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The point of the check: refuse before the round trip, not after.

        `ModelFactory.create` raises here, so if the runtime still reached it the
        test fails loudly rather than passing on a slow, discarded call.
        """

        def explode(self: ModelFactory) -> object:
            raise AssertionError("a model was built for a provider that cannot honour the contract")

        monkeypatch.setattr(ModelFactory, "create", explode)

        response = _runtime(OLLAMA).execute(context=_context(), message="¿Qué me falta?")

        assert response.degraded is True
        assert response.handled_by == "deterministic"

    def test_it_says_why_in_the_log(self, caplog: pytest.LogCaptureFixture) -> None:
        """A silent degrade is the failure mode this replaces — an operator has
        to be able to find the cause without reading the SDK."""
        with caplog.at_level("WARNING"):
            _runtime(OLLAMA).execute(context=_context(), message="¿Qué me falta?")

        message = " ".join(record.getMessage() for record in caplog.records)
        assert "structured output" in message
        assert "OPENAI_BASE_URL" in message


class TestTheFallbackIsNotWeakened:
    """Degrading sooner is only better if it degrades to the same answer."""

    def test_the_deterministic_answer_is_still_complete(self) -> None:
        response = _runtime(OLLAMA).execute(context=_context(), message="¿Qué me falta?")

        assert response.message.strip()
        assert response.disclaimer.strip()
        # The degraded path still owes the UI something to navigate to and
        # something to look at — see AgentRuntime._draft_as_answer.
        assert any(action.action_type == "open_page" for action in response.actions)
        assert response.cards

    def test_guardrails_still_run_on_the_degraded_path(self) -> None:
        """A boundary question must still raise attorney review with no agent
        in the loop at all."""
        response = _runtime(OLLAMA).execute(
            context=_context(), message="¿Califico para el capítulo 7?"
        )

        assert response.requires_attorney_review is True

    def test_rule_based_is_unaffected(self) -> None:
        """The default deployment never entered this path and still does not."""
        response = _runtime("rule_based").execute(context=_context(), message="¿Qué me falta?")

        assert response.degraded is True
        assert response.handled_by == "deterministic"
        assert response.message.strip()
