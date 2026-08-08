"""
The agentic path, end to end, with only the provider faked.

Everything between the HTTP request and the tool call is real: authentication,
the role check, `CaseAccessService`, the context builder, `AgentRuntime`, the
Strands orchestrator, specialist selection, the tool registry, `CaseTools`,
`PortfolioTools`, schema validation and the guardrails. Only the model is
replaced, because the model is the one component that needs a credential.

This is what turns "the architecture is agentic" from a claim into a check. The
previous evidence was a live Ollama run whose answer the runtime then discarded;
these tests prove the runtime *accepts* a well-formed agentic answer and that a
real tool produced the data behind it.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.ai.model_factory import OPENAI, ModelFactory
from app.ai.tracing import TRACE_LOGGER_NAME
from app.core.config import get_settings
from app.repositories.seed import ATTORNEY_REVIEW_CASE_ID, DEMO_CASE_ID, reset_demo_data
from tests.support.fake_model import FakeProviderModel, ToolNeverInvokedError


@pytest.fixture
def agentic(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Route the runtime through a capable provider and a fake model.

    `ai_provider=openai` because that is the provider class whose adapter honours
    forced tool choice — the capability gate would refuse anything else before a
    model was built, so this also proves the gate lets the right one through.
    """
    reset_demo_data(get_settings())
    holder: dict[str, Any] = {}

    def install(prefers: list[str], answer: str = "Respuesta del agente.") -> FakeProviderModel:
        model = FakeProviderModel(prefers=prefers, answer=answer)
        holder["model"] = model
        monkeypatch.setattr(ModelFactory, "create", lambda self: model)
        return model

    monkeypatch.setenv("AI_PROVIDER", OPENAI)
    holder["install"] = install
    return holder


def _payload(role: str, case_id: str, message: str, scope: str = "case") -> dict[str, Any]:
    return {
        "assistant_scope": scope,
        "case": {
            "id": case_id,
            "owner_user_id": "client-demo",
            "client_name": "Elena Rivera",
            "client_email": "client@freshstart.demo",
            "status": "collecting_information",
            "household": {"household_size": 2},
            "incomes": [],
            "expenses": [],
            "debts": [],
            "assets": [],
            "evidence": [],
        },
        "message": message,
        "role": role,
        "locale": "es-PR",
    }


def _settings_override(client: TestClient, model: FakeProviderModel) -> None:
    """Point the app's settings at the capable provider for one request."""
    from app.core.config import get_settings as real_get_settings

    app = client.app
    overridden = real_get_settings().model_copy(
        update={"ai_provider": OPENAI, "openai_api_key": "test-key"}
    )
    app.dependency_overrides[real_get_settings] = lambda: overridden  # type: ignore[index]


class TestTheClientCasePathIsAgentic:
    def test_a_real_tool_produces_the_answer(
        self, client: TestClient, agentic: dict[str, Any], caplog: pytest.LogCaptureFixture
    ) -> None:
        model = agentic["install"](["case_agent", "get_missing_information"])
        _settings_override(client, model)

        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            response = client.post(
                "/api/v1/bankruptcy/guide",
                json=_payload("client", DEMO_CASE_ID, "¿Qué me falta?"),
            )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["degraded"] is False, "the runtime discarded a well-formed agentic answer"
        assert model.data_tools_invoked == ["get_missing_information"]
        assert body["handled_by"] == "get_missing_information"

    def test_the_trace_records_the_agentic_turn(
        self, client: TestClient, agentic: dict[str, Any], caplog: pytest.LogCaptureFixture
    ) -> None:
        model = agentic["install"](["case_agent", "get_case_summary"])
        _settings_override(client, model)

        with caplog.at_level("INFO", logger=TRACE_LOGGER_NAME):
            client.post(
                "/api/v1/bankruptcy/guide",
                json=_payload("client", DEMO_CASE_ID, "¿Dónde estoy?"),
            )

        traces = [r.ai_trace for r in caplog.records if hasattr(r, "ai_trace")]  # type: ignore[attr-defined]
        assert traces
        assert traces[-1]["runtime_mode"] == "agentic"
        assert traces[-1]["degraded"] is False


class TestTheAttorneyPortfolioPathIsAgentic:
    def test_the_portfolio_specialist_reaches_a_real_portfolio_tool(
        self, attorney_client: TestClient, agentic: dict[str, Any]
    ) -> None:
        """R3's last unproven link: HTTP → authorized portfolio → Strands →
        portfolio_agent → PortfolioTools → structured answer."""
        model = agentic["install"](["portfolio_agent", "list_cases_needing_attention"])
        _settings_override(attorney_client, model)

        response = attorney_client.post(
            "/api/v1/bankruptcy/guide",
            json=_payload(
                "attorney",
                ATTORNEY_REVIEW_CASE_ID,
                "¿Cuáles de mis casos requieren atención?",
                scope="portfolio",
            ),
        )

        assert response.status_code == 200, response.text
        assert "portfolio_agent" in model.invoked_tools
        assert model.data_tools_invoked == ["list_cases_needing_attention"]
        assert response.json()["degraded"] is False


class TestTheFakeCannotFakeSuccess:
    def test_it_refuses_to_answer_without_a_tool(self) -> None:
        """The guard that makes every assertion above mean something.

        A fake that returned the final answer regardless would pass these tests
        against a runtime that had stopped calling tools entirely.
        """
        model = FakeProviderModel(prefers=[])
        with pytest.raises(ToolNeverInvokedError):
            import asyncio

            async def drain() -> None:
                async for _ in model.structured_output(dict, []):
                    pass

            asyncio.run(drain())
