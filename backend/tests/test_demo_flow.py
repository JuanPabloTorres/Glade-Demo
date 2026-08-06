from fastapi.testclient import TestClient

from app.main import app


def authenticate(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Demo123!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_applicant_intake_and_assistant_flow() -> None:
    with TestClient(app) as client:
        headers = authenticate(client, "applicant@freshstart.demo")
        cases_response = client.get("/api/v1/cases", headers=headers)
        assert cases_response.status_code == 200
        case = cases_response.json()[0]

        section_response = client.put(
            f"/api/v1/cases/{case['id']}/sections/personal",
            headers=headers,
            json={
                "data": {
                    "legal_name": "Ana Rivera",
                    "date_of_birth": "1990-01-01",
                    "address": "Ponce, PR",
                },
                "completed": True,
            },
        )
        assert section_response.status_code == 200
        assert section_response.json()["progress"] >= 11

        assistant_response = client.post(
            "/api/v1/assistant/chat",
            headers=headers,
            json={"case_id": case["id"], "message": "¿Qué falta?", "language": "es"},
        )
        assert assistant_response.status_code == 200
        assert assistant_response.json()["language"] == "es"
        assert assistant_response.json()["missing_sections"]


def test_applicant_cannot_delete_case() -> None:
    with TestClient(app) as client:
        headers = authenticate(client, "applicant@freshstart.demo")
        case_id = client.get("/api/v1/cases", headers=headers).json()[0]["id"]
        response = client.delete(f"/api/v1/cases/{case_id}", headers=headers)
        assert response.status_code == 403
