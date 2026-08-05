from fastapi.testclient import TestClient


def test_client_login_returns_client_session(client: TestClient) -> None:
    current = client.get("/api/v1/auth/me")
    assert current.status_code == 200
    assert current.json()["role"] == "client"
    assert current.json()["id"] == "client-demo"


def test_attorney_login_returns_attorney_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "attorney@freshstart.demo", "password": "Counsel!2026"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "attorney"


def test_invalid_credentials_are_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "client@freshstart.demo", "password": "incorrect-password"},
    )
    assert response.status_code == 401
