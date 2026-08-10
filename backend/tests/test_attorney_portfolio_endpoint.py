"""HTTP contract for the attorney's server-authorized case queue."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.repositories.seed import INCOMPLETE_CASE_ID, reset_demo_data


def test_attorney_portfolio_returns_only_persisted_triage_rows(
    attorney_client: TestClient,
) -> None:
    reset_demo_data(get_settings())

    response = attorney_client.get("/api/v1/bankruptcy/portfolio")

    assert response.status_code == 200, response.text
    rows = response.json()
    assert any(row["case_id"] == INCOMPLETE_CASE_ID for row in rows)
    assert all("owner_user_id" in row for row in rows)
    assert all("total_debt" not in row and "incomes" not in row for row in rows)


def test_client_cannot_read_the_attorney_portfolio(client: TestClient) -> None:
    response = client.get("/api/v1/bankruptcy/portfolio")

    assert response.status_code == 403


def test_portfolio_requires_authentication() -> None:
    with TestClient(app) as anonymous:
        response = anonymous.get("/api/v1/bankruptcy/portfolio")

    assert response.status_code == 401
