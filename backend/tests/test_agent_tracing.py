"""
Every assistant turn leaves one structured record, and it records the truth.

Before this, "the agent is running" was a claim checkable only by reading the
Strands SDK's stdout by eye. A trace makes it checkable by a machine — which is
the difference between a demo that asserts agentic execution and one that
demonstrates it.

These tests pin three things: the record exists for every path, it names the
right fallback cause, and it never carries what it must not.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.ai.contracts.assistant_response import AgentAnswer
from app.ai.model_factory import OLLAMA, OPENAI
from app.ai.runtime import AgentRuntime
from app.ai.tracing import TRACE_LOGGER_NAME, AgentExecutionTrace, FallbackReason
from app.core.config import get_settings
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex


def _context(role: str = "client", locale: str = "es-PR") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id="case-trace-test",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
    )
    return CaseContextBuilder().build(
        case, BankruptcyAnalysisService().analyze(case), role, locale
    )


def _runtime(**overrides: Any) -> AgentRuntime:
    settings = get_settings().model_copy(update=overrides)
    return AgentRuntime(settings=settings, document_index=CaseDocumentIndex())


def _traces(caplog: pytest.LogCaptureFixture) -> list[dict[str, Any]]:
    """The emitted records, read from the log's structured payload.

    Asserted on the payload rather than the formatted message: a test that
    matches a log string is asserting on formatting, and would pass a record
    whose fields were wrong as long as the sentence still read correctly.
    """
    return [
        record.ai_trace  # type: ignore[attr-defined]
        for record in caplog.records
        if hasattr(record, "ai_trace")
    ]


class TestEveryTurnIsObservable:
    def test_the_deterministic_path_emits_a_trace(self, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider="rule_based").execute(context=_context(), message="¿qué me falta?")

        traces = _traces(caplog)
        assert len(traces) == 1
        assert traces[0]["runtime_mode"] == "deterministic"
        assert traces[0]["degraded"] is True
        assert traces[0]["handled_by"] == "deterministic"

    def test_it_carries_the_request_context(self, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider="rule_based").execute(
                context=_context(role="attorney", locale="en-US"), message="summarize"
            )

        trace = _traces(caplog)[0]
        assert trace["provider"] == "rule_based"
        assert trace["role"] == "attorney"
        assert trace["language"] == "en"
        assert trace["correlation_id"]
        assert trace["duration_ms"] >= 0

    def test_a_turn_that_raises_past_every_handler_is_still_recorded(
        self, caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The reason `emit` sits in a `finally`: an unobservable failure is the
        one an operator most needs to see."""

        def explode(self: AgentRuntime, **_kwargs: Any) -> None:
            raise RuntimeError("compose blew up")

        monkeypatch.setattr(AgentRuntime, "_compose", explode)

        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            with pytest.raises(RuntimeError):
                _runtime(ai_provider="rule_based").execute(
                    context=_context(), message="¿qué me falta?"
                )

        assert len(_traces(caplog)) == 1


class TestTheFallbackReasonIsTheRealOne:
    def test_a_non_agentic_provider_says_so(self, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider="rule_based").execute(context=_context(), message="hola")

        assert _traces(caplog)[0]["fallback_reason"] == FallbackReason.PROVIDER_NOT_AGENTIC

    def test_a_provider_that_cannot_force_structure_says_so(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """The distinction that matters operationally: this provider *is*
        agentic, and still cannot be used. A single 'degraded' flag would make
        it indistinguishable from a provider nobody configured."""
        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider=OLLAMA).execute(context=_context(), message="hola")

        trace = _traces(caplog)[0]
        assert trace["fallback_reason"] == FallbackReason.PROVIDER_CANNOT_FORCE_STRUCTURE
        assert trace["provider"] == OLLAMA

    def test_a_missing_credential_says_model_unavailable(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider=OPENAI, openai_api_key=None).execute(
                context=_context(), message="hola"
            )

        assert _traces(caplog)[0]["fallback_reason"] == FallbackReason.MODEL_UNAVAILABLE


class TestAnAgenticTurnRecordsItsHandler:
    def test_a_structured_answer_marks_the_turn_agentic(
        self, caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def fake_run(self: AgentRuntime, **_kwargs: Any) -> AgentAnswer:
            return AgentAnswer(message="Faltan tus talones de pago.", handled_by="documents_agent")

        monkeypatch.setattr(AgentRuntime, "_run_agents", fake_run)

        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            _runtime(ai_provider=OPENAI).execute(context=_context(), message="¿qué me falta?")

        trace = _traces(caplog)[0]
        assert trace["runtime_mode"] == "agentic"
        assert trace["degraded"] is False
        assert trace["handled_by"] == "documents_agent"
        assert trace["specialist"] == "documents_agent"
        assert trace["fallback_reason"] == ""


class TestTheTraceCarriesNothingItShouldNot:
    def test_tool_calls_are_recorded_by_name_and_status_only(self) -> None:
        trace = AgentExecutionTrace(provider=OPENAI)
        trace.record_tool("get_financial_snapshot", "success", duration_ms=12)

        payload = trace.as_dict()
        assert payload["tools_invoked"] == ["get_financial_snapshot"]
        assert payload["tool_status"] == {"get_financial_snapshot": "success"}

    def test_no_field_can_hold_a_prompt_a_secret_or_a_figure(self) -> None:
        """Enumerated rather than inspected for content: the guarantee is
        structural. A field that cannot exist cannot leak, and a future addition
        has to fail this test before it can log a case's finances."""
        allowed = {
            "correlation_id",
            "provider",
            "model",
            "runtime_mode",
            "role",
            "language",
            "agent",
            "specialist",
            "tools_invoked",
            "tool_status",
            "duration_ms",
            "degraded",
            "fallback_reason",
            "handled_by",
        }
        assert set(AgentExecutionTrace(provider=OPENAI).as_dict()) == allowed

    def test_the_fallback_vocabulary_is_closed(self) -> None:
        """`mark_degraded` takes an enumerated cause, never an exception string —
        a raw message can carry a URL, a key fragment or the provider's echo of
        the request, and this record is written to logs nobody reads line by
        line."""
        reasons = {
            value
            for name, value in vars(FallbackReason).items()
            if not name.startswith("_") and isinstance(value, str)
        }
        assert reasons == {
            "provider_not_agentic",
            "provider_cannot_force_structured_output",
            "agents_extra_missing",
            "model_unavailable",
            "no_structured_output",
            "agent_raised",
        }
