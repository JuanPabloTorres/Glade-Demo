from fastapi.testclient import TestClient


def test_ai_health_exposes_provider_state(client: TestClient) -> None:
    response = client.get("/api/v1/ai/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["provider"]
    assert payload["model"]
    assert isinstance(payload["available"], bool)
