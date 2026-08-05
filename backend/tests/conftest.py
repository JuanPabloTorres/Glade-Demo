from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "client@freshstart.demo",
                "password": "FreshStart!2026",
            },
        )
        assert login.status_code == 200
        test_client.headers.update(
            {"Authorization": f"Bearer {login.json()['access_token']}"}
        )
        yield test_client
