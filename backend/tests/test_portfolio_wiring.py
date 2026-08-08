"""
The portfolio reaches the agent from an HTTP request, or it reaches nothing.

`PortfolioTools` and the `portfolio_agent` specialist were already tested in
isolation. What those tests cannot show is that a real request produces an
authorized collection at all — a capability wired only into the runtime API is
unreachable in the product, and would pass every unit test while doing nothing.

The two assertions that matter here are about *who* gets one: an attorney's
request carries the portfolio, a client's carries nothing. The second is the
security half, and it is enforced by the role check in the router rather than by
anything the model could influence.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.repositories.seed import reset_demo_data
from app.services.bankruptcy_service import BankruptcyGuidanceService


def _payload(role: str, case_id: str) -> dict[str, Any]:
    return {
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
        "message": "¿Cuáles de mis casos requieren atención?",
        "role": role,
        "locale": "es-PR",
    }


@pytest.fixture
def captured(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    # Seeded explicitly rather than inherited. `test_attorney_portfolio.py`
    # empties the case table to prove an empty portfolio is safe, so a test that
    # assumes seeded rows passes alone and fails in a full run — which is the
    # worst way to find out, because the failure looks like the feature.
    """Record what the service was handed, without stubbing the service.

    Wrapping `guide` rather than replacing it: the real authorization, context
    building and runtime still run, so this asserts on the wiring without
    turning the endpoint into a mock of itself.
    """
    reset_demo_data(get_settings())
    seen: dict[str, Any] = {}
    original = BankruptcyGuidanceService.guide

    def spy(self: BankruptcyGuidanceService, request: Any, **kwargs: Any) -> Any:
        seen["portfolio"] = list(kwargs.get("portfolio", ()))
        return original(self, request, **kwargs)

    monkeypatch.setattr(BankruptcyGuidanceService, "guide", spy)
    return seen


class TestTheAttorneyRequestCarriesAnAuthorizedPortfolio:
    def test_an_attorney_guide_call_supplies_the_portfolio(
        self, attorney_client: TestClient, captured: dict[str, Any]
    ) -> None:
        response = attorney_client.post(
            "/api/v1/bankruptcy/guide", json=_payload("attorney", "case-elena-demo")
        )

        assert response.status_code == 200, response.text
        assert captured["portfolio"], "the attorney's request reached the service with no portfolio"

    def test_the_entries_are_triage_shaped_not_full_cases(
        self, attorney_client: TestClient, captured: dict[str, Any]
    ) -> None:
        attorney_client.post(
            "/api/v1/bankruptcy/guide", json=_payload("attorney", "case-elena-demo")
        )

        entry = captured["portfolio"][0]
        assert hasattr(entry, "case_id")
        assert not hasattr(entry, "incomes"), "a full case reached the portfolio path"


class TestAClientNeverCarriesOne:
    def test_a_client_guide_call_supplies_no_portfolio(
        self, client: TestClient, captured: dict[str, Any]
    ) -> None:
        """The security half.

        Enforced by the role check in the router, before any model is involved.
        A client whose request carried a portfolio would hand the cross-case
        specialist a collection it must never see — and the specialist would be
        constructed, because construction is gated on the portfolio being
        present.
        """
        response = client.post(
            "/api/v1/bankruptcy/guide", json=_payload("client", "case-elena-demo")
        )

        assert response.status_code == 200, response.text
        assert captured["portfolio"] == []
