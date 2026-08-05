from fastapi.testclient import TestClient


def initial_state() -> dict[str, object]:
    return {
        "session_id": "test-session",
        "messages": [],
        "profile": {},
        "documents": [],
        "resolutions": {},
    }


def send(client: TestClient, state: dict[str, object], message: str) -> dict[str, object]:
    response = client.post(
        "/api/v1/copilot/message",
        json={"state": state, "message": message, "locale": "en"},
    )
    assert response.status_code == 200
    return response.json()


def test_copilot_collects_intake_and_detects_document_conflict(client: TestClient) -> None:
    result = send(client, initial_state(), "I need to prepare an immigration intake")
    result = send(client, result["state"], "Elena Rivera")
    result = send(client, result["state"], "elena@example.com")
    result = send(client, result["state"], "787-555-0142")
    result = send(client, result["state"], "Ponce, Puerto Rico")

    document = client.post(
        "/api/v1/copilot/document",
        json={
            "state": result["state"],
            "label": "passport.txt",
            "text": "Name: Elena Rivera\nEmail: old-email@example.com\nPhone: 787-555-0142\nAddress: Ponce, Puerto Rico",
            "locale": "en",
        },
    )
    assert document.status_code == 200
    body = document.json()
    email_issue = next(issue for issue in body["packet"]["issues"] if issue["id"] == "conflict:email")
    assert email_issue["status"] == "open"
    assert body["packet"]["readiness"] < 100

    resolved = client.post(
        "/api/v1/copilot/issues/conflict:email/resolve",
        json={
            "state": body["state"],
            "selected_value": "elena@example.com",
            "locale": "en",
        },
    )
    assert resolved.status_code == 200
    resolved_body = resolved.json()
    assert resolved_body["packet"]["readiness"] == 100
    assert not [
        issue
        for issue in resolved_body["packet"]["issues"]
        if issue["status"] == "open"
    ]


def test_copilot_requires_authentication(client: TestClient) -> None:
    authorization = client.headers.pop("Authorization")
    response = client.post(
        "/api/v1/copilot/message",
        json={"state": initial_state(), "message": "Hello", "locale": "en"},
    )
    client.headers["Authorization"] = authorization
    assert response.status_code == 401
