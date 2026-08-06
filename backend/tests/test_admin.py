"""
Dev-only demo-data reset endpoint. Task instruction: "Add a documented way
to reset demo data (e.g. a script or a dev-only endpoint gated by
settings.environment != 'production')." — this covers the endpoint half;
`backend/scripts/seed_demo_data.py` is the CLI half, sharing the same
`app.repositories.seed.reset_demo_data` implementation.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel, UserModel
from app.repositories.seed import DEMO_CASE_ID


def test_reset_demo_data_recreates_demo_accounts_and_case(attorney_client: TestClient) -> None:
    response = attorney_client.post("/api/v1/admin/demo/reset")
    assert response.status_code == 200
    assert response.json() == {"status": "reset", "case_id": DEMO_CASE_ID}

    session_factory = get_sessionmaker()
    with session_factory() as session:
        client_user = session.get(UserModel, "client-demo")
        attorney_user = session.get(UserModel, "attorney-demo")
        demo_case = session.get(CaseModel, DEMO_CASE_ID)

    assert client_user is not None
    assert client_user.role == "client"
    assert attorney_user is not None
    assert attorney_user.role == "attorney"
    assert demo_case is not None
    assert demo_case.owner_user_id == "client-demo"


def test_reset_demo_data_requires_jwt(client: TestClient) -> None:
    authorization = client.headers.pop("Authorization")
    try:
        response = client.post("/api/v1/admin/demo/reset")
    finally:
        client.headers["Authorization"] = authorization
    assert response.status_code == 401


def test_reset_demo_data_is_disabled_in_production(attorney_client: TestClient) -> None:
    settings = get_settings()
    original_environment = settings.environment
    settings.environment = "production"
    try:
        response = attorney_client.post("/api/v1/admin/demo/reset")
        assert response.status_code == 403
    finally:
        settings.environment = original_environment


def test_reset_demo_data_requires_attorney_role(client: TestClient) -> None:
    """The client demo persona must not be able to wipe shared demo state
    out from under a concurrent attorney/client viewing the same demo."""
    response = client.post("/api/v1/admin/demo/reset")
    assert response.status_code == 403
