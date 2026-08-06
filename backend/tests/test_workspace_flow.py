from fastapi.testclient import TestClient

from app.main import app


def authenticate(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "Demo123!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def first_case_id(client: TestClient, headers: dict[str, str]) -> str:
    response = client.get("/api/v1/cases", headers=headers)
    assert response.status_code == 200
    return response.json()[0]["id"]


def test_manager_workspace_crud_and_dashboard() -> None:
    with TestClient(app) as client:
        manager_headers = authenticate(client, "manager@freshstart.demo")
        case_id = first_case_id(client, manager_headers)

        workspace = client.get(
            f"/api/v1/cases/{case_id}/workspace", headers=manager_headers
        )
        assert workspace.status_code == 200
        assert workspace.json()["documents"]
        assert workspace.json()["alerts"]

        created = client.post(
            f"/api/v1/cases/{case_id}/tasks",
            headers=manager_headers,
            json={
                "title": "Review bank statements",
                "description": "Confirm all account balances.",
                "priority": "medium",
                "status": "todo",
            },
        )
        assert created.status_code == 201
        task_id = created.json()["id"]

        updated = client.patch(
            f"/api/v1/cases/{case_id}/tasks/{task_id}",
            headers=manager_headers,
            json={"status": "done"},
        )
        assert updated.status_code == 200
        assert updated.json()["status"] == "done"

        dashboard = client.get("/api/v1/dashboard/summary", headers=manager_headers)
        assert dashboard.status_code == 200
        assert dashboard.json()["total_cases"] >= 1


def test_applicant_workspace_permissions_and_public_notes() -> None:
    with TestClient(app) as client:
        applicant_headers = authenticate(client, "applicant@freshstart.demo")
        case_id = first_case_id(client, applicant_headers)

        note = client.post(
            f"/api/v1/cases/{case_id}/notes",
            headers=applicant_headers,
            json={"content": "I uploaded the requested information.", "is_internal": True},
        )
        assert note.status_code == 201
        assert note.json()["is_internal"] is False

        forbidden = client.post(
            f"/api/v1/cases/{case_id}/alerts",
            headers=applicant_headers,
            json={"title": "Applicant alert", "severity": "warning"},
        )
        assert forbidden.status_code == 403
