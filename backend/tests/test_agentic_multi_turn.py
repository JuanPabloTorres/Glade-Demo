"""
Four conversations, each one two turns, through the real stack.

The single-turn proof already exists (`test_agentic_runtime_path.py`). What it
could not show is the thing a demo actually does: ask a second question that
only makes sense given the first. "¿Y cuánto pago al mes?" has no antecedent on
its own, and neither does "Why the first one?".

Continuity here is server-side and keyed by case. The frontend sends one
message and nothing else — no transcript, no ids — so a client cannot fabricate
a history it was never part of. `BankruptcyGuidanceService.guide` writes both
halves of each exchange to `ai_conversations` and reads the last few back into
`CaseContextDto.recent_conversation` on the next request.

These are four conversations, not a matrix. They cover the two roles, both
locales, and both assistant scopes because those are the axes the release
contract names — not because every combination was enumerated.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.ai.model_factory import OPENAI, ModelFactory
from app.core.config import get_settings
from app.repositories.seed import ATTORNEY_REVIEW_CASE_ID, DEMO_CASE_ID, reset_demo_data
from tests.support.fake_model import FakeProviderModel


@pytest.fixture
def agentic(monkeypatch: pytest.MonkeyPatch) -> Any:
    """Install a *fresh* fake per turn.

    Reusing one model across turns would let the first turn's `invoked_tools`
    suppress the second turn's tool choice, so a broken second turn could look
    like a deliberate one. A new model per turn also makes each turn's prompt
    and tool list independently inspectable.
    """
    reset_demo_data(get_settings())

    def install(prefers: list[str], answer: str) -> FakeProviderModel:
        model = FakeProviderModel(prefers=prefers, answer=answer)
        monkeypatch.setattr(ModelFactory, "create", lambda self: model)
        return model

    return install


def _payload(role: str, case_id: str, message: str, locale: str, scope: str) -> dict[str, Any]:
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
        "locale": locale,
    }


def _use_capable_provider(client: TestClient) -> None:
    from app.core.config import get_settings as real_get_settings

    overridden = real_get_settings().model_copy(
        update={"ai_provider": OPENAI, "openai_api_key": "test-key"}
    )
    client.app.dependency_overrides[real_get_settings] = lambda: overridden  # type: ignore[index]


class Turn:
    """One exchange, with the model that served it kept for inspection."""

    def __init__(self, body: dict[str, Any], model: FakeProviderModel) -> None:
        self.body = body
        self.model = model

    @property
    def prompt(self) -> str:
        """What the orchestrator was handed — the first stream call of the turn."""
        return self.model.prompts[0]


def converse(
    client: TestClient,
    install: Any,
    *,
    role: str,
    case_id: str,
    locale: str,
    scope: str,
    turns: list[tuple[str, list[str], str]],
) -> list[Turn]:
    _use_capable_provider(client)
    recorded: list[Turn] = []
    for message, prefers, answer in turns:
        model = install(prefers, answer)
        response = client.post(
            "/api/v1/bankruptcy/guide",
            json=_payload(role, case_id, message, locale, scope),
        )
        assert response.status_code == 200, response.text
        recorded.append(Turn(response.json(), model))
    return recorded


def _assert_agentic(turn: Turn, *, tool: str, language: str) -> None:
    assert turn.body["degraded"] is False, "the runtime fell back on an agentic turn"
    assert turn.model.data_tools_invoked == [tool]
    assert turn.body["handled_by"] == tool
    assert turn.body["language"] == language


class TestClientSpanish:
    """¿Cuánto debo? → ¿Y cuánto pago al mes?

    The second message is the case worth testing: "y" refers to the debt total
    from the first, and nothing in the message itself says so.
    """

    def test_the_follow_up_is_answered_with_the_first_turn_in_context(
        self, client: TestClient, agentic: Any
    ) -> None:
        first, second = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE_ID,
            locale="es-PR",
            scope="case",
            turns=[
                ("¿Cuánto debo?", ["analysis_agent", "get_financial_snapshot"], "Debes $24,500."),
                (
                    "¿Y cuánto pago al mes?",
                    ["analysis_agent", "get_financial_snapshot"],
                    "Tus pagos mensuales suman $1,180.",
                ),
            ],
        )

        _assert_agentic(first, tool="get_financial_snapshot", language="es")
        _assert_agentic(second, tool="get_financial_snapshot", language="es")

        # The property the whole feature rests on: turn two was told what turn
        # one was about. Without it the agent resolves "y" against nothing.
        assert "¿Cuánto debo?" in second.prompt
        assert "Debes $24,500." in second.prompt

    def test_the_first_turn_carries_no_history(self, client: TestClient, agentic: Any) -> None:
        """A fresh conversation must not arrive pre-loaded.

        Asserted because the previous test would also pass if every prompt
        contained a history block regardless — including an empty or a stale
        one from another case.
        """
        (first,) = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE_ID,
            locale="es-PR",
            scope="case",
            turns=[("¿Cuánto debo?", ["analysis_agent", "get_financial_snapshot"], "Debes $24,500.")],
        )

        assert "EARLIER TURNS" not in first.prompt


class TestClientEnglish:
    """What am I missing? → Which items need evidence?"""

    def test_the_conversation_continues_in_english(
        self, client: TestClient, agentic: Any
    ) -> None:
        first, second = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE_ID,
            locale="en-US",
            scope="case",
            turns=[
                (
                    "What am I missing?",
                    ["case_agent", "get_missing_information"],
                    "You are missing two income documents.",
                ),
                (
                    "Which items need evidence?",
                    ["documents_agent", "get_pending_documents"],
                    "Your pay stubs and your lease still need evidence.",
                ),
            ],
        )

        _assert_agentic(first, tool="get_missing_information", language="en")
        _assert_agentic(second, tool="get_pending_documents", language="en")
        assert "What am I missing?" in second.prompt

    def test_the_language_is_the_requested_one_on_both_turns(
        self, client: TestClient, agentic: Any
    ) -> None:
        """Locale is per request, not sticky per case.

        The same seeded case answered in Spanish in the test above; a stored
        conversation must not drag the earlier language into a later turn.
        """
        turns = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE_ID,
            locale="en-US",
            scope="case",
            turns=[
                ("What am I missing?", ["case_agent", "get_missing_information"], "Two documents."),
                ("Which items need evidence?", ["case_agent", "get_missing_information"], "Stubs."),
            ],
        )

        assert [turn.body["language"] for turn in turns] == ["en", "en"]
        assert all("Answer in: en" in turn.prompt for turn in turns)


class TestAttorneyPortfolio:
    """Which cases need attention? → Why the first one?

    "The first one" is only resolvable against the previous answer, and the
    portfolio specialist has to still be reachable on turn two.
    """

    def test_the_follow_up_stays_in_portfolio_scope(
        self, attorney_client: TestClient, agentic: Any
    ) -> None:
        first, second = converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=ATTORNEY_REVIEW_CASE_ID,
            locale="en-US",
            scope="portfolio",
            turns=[
                (
                    "Which cases need attention?",
                    ["portfolio_agent", "list_cases_needing_attention"],
                    "Miguel Santiago's case needs attention first.",
                ),
                (
                    "Why the first one?",
                    ["portfolio_agent", "list_cases_needing_attention"],
                    "It has an active collection lawsuit.",
                ),
            ],
        )

        _assert_agentic(first, tool="list_cases_needing_attention", language="en")
        _assert_agentic(second, tool="list_cases_needing_attention", language="en")

        assert "Which cases need attention?" in second.prompt
        assert "Miguel Santiago's case needs attention first." in second.prompt
        # The specialist is built per request from the authorized portfolio; a
        # second turn that lost it would degrade rather than answer.
        assert "portfolio_agent" in second.model.invoked_tools


class TestAttorneySelectedCase:
    """Resume este caso. → ¿Qué le falta?"""

    def test_the_case_specialist_serves_both_turns(
        self, attorney_client: TestClient, agentic: Any
    ) -> None:
        first, second = converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=ATTORNEY_REVIEW_CASE_ID,
            locale="es-PR",
            scope="case",
            turns=[
                (
                    "Resume este caso.",
                    ["case_agent", "get_case_summary"],
                    "El caso de Miguel está radicado y tiene una demanda activa.",
                ),
                (
                    "¿Qué le falta?",
                    ["case_agent", "get_missing_information"],
                    "Faltan los estados bancarios de los últimos dos meses.",
                ),
            ],
        )

        _assert_agentic(first, tool="get_case_summary", language="es")
        _assert_agentic(second, tool="get_missing_information", language="es")
        assert "Resume este caso." in second.prompt

    def test_one_case_history_never_reaches_another(
        self, attorney_client: TestClient, agentic: Any
    ) -> None:
        """Continuity is per case, and an attorney reads several.

        This is the isolation half of the same mechanism: an attorney who moves
        from Miguel's case to Elena's must not carry Miguel's transcript along,
        because that transcript quotes his figures.
        """
        converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=ATTORNEY_REVIEW_CASE_ID,
            locale="es-PR",
            scope="case",
            turns=[
                (
                    "Resume este caso.",
                    ["case_agent", "get_case_summary"],
                    "Miguel debe $150,000 de hipoteca.",
                )
            ],
        )

        (other,) = converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=DEMO_CASE_ID,
            locale="es-PR",
            scope="case",
            turns=[("Resume este caso.", ["case_agent", "get_case_summary"], "Resumen de Elena.")],
        )

        assert "Miguel" not in other.prompt
        assert "150,000" not in other.prompt
