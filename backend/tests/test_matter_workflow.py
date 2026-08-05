from fastapi.testclient import TestClient


def test_complete_conflict_and_readiness_workflow(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/matters",
        json={
            "display_name": "Jordan Sample",
            "case_type": "immigration",
            "email": "jordan@example.com",
            "phone": "787-555-0100",
            "assigned_to": "A. Rivera",
        },
    )
    assert create_response.status_code == 201
    matter_id = create_response.json()["id"]

    intake_response = client.put(
        f"/api/v1/matters/{matter_id}/intake",
        json={
            "display_name": "Jordan Sample",
            "email": "jordan@example.com",
            "phone": "787-555-0100",
            "address": "123 Main Street, San Juan, PR",
            "date_of_birth": "1990-05-04",
            "summary": "Synthetic immigration intake.",
        },
    )
    assert intake_response.status_code == 200

    document_response = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "passport.txt",
            "document_type": "identity",
            "content": "Name: Jordan A. Sample\nDOB: 1990-05-04\nAddress: 123 Main St Apt 2, San Juan, PR",
        },
    )
    assert document_response.status_code == 201
    assert document_response.json()["status"] == "needs_review"

    conflicts_response = client.get(f"/api/v1/matters/{matter_id}/conflicts")
    conflicts = conflicts_response.json()
    assert conflicts_response.status_code == 200
    assert len(conflicts) == 2

    conflict = conflicts[0]
    resolve_response = client.post(
        f"/api/v1/matters/{matter_id}/conflicts/{conflict['id']}/resolve",
        json={"selected_value": conflict["canonical_value"]},
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "resolved"

    readiness_response = client.get(f"/api/v1/matters/{matter_id}/readiness")
    assert readiness_response.status_code == 200
    readiness = readiness_response.json()
    assert readiness["total_items"] == 7
    assert readiness["complete_items"] == 6
