from fastapi.testclient import TestClient


def test_login_returns_signed_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@matterready.app", "password": "MatterReady!2026"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"] == {
        "email": "reviewer@matterready.app",
        "name": "Alex Rivera",
        "role": "Intake Reviewer",
    }


def test_current_session_and_copilot_require_valid_bearer_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["role"] == "Intake Reviewer"

    authorization = client.headers.pop("Authorization")
    try:
        unauthorized = client.post(
            "/api/v1/copilot/message",
            json={
                "state": {
                    "session_id": "unauthorized-test",
                    "messages": [],
                    "profile": {},
                    "documents": [],
                    "resolutions": {},
                },
                "message": "Prepare an intake",
                "locale": "en",
            },
        )
    finally:
        client.headers["Authorization"] = authorization
    assert unauthorized.status_code == 401


def test_invalid_credentials_are_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@matterready.app", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email or password is incorrect."
