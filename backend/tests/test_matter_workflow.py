from fastapi.testclient import TestClient


def create_matter(
    client: TestClient,
    *,
    case_type: str = "immigration",
    display_name: str = "Jordan Sample",
    email: str | None = "jordan@example.com",
    phone: str | None = "787-555-0100",
) -> str:
    response = client.post(
        "/api/v1/matters",
        json={
            "display_name": display_name,
            "case_type": case_type,
            "email": email,
            "phone": phone,
            "assigned_to": "A. Rivera",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def update_immigration_intake(client: TestClient, matter_id: str) -> None:
    response = client.put(
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
    assert response.status_code == 200
    assert response.json()["status"] == "active"


def test_complete_conflict_and_readiness_workflow(client: TestClient) -> None:
    matter_id = create_matter(client)

    initial_readiness = client.get(
        f"/api/v1/matters/{matter_id}/readiness"
    ).json()
    assert initial_readiness == {
        **initial_readiness,
        "score": 50,
        "complete_items": 4,
        "total_items": 8,
        "open_conflicts": 0,
    }

    update_immigration_intake(client, matter_id)

    document_response = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "passport.txt",
            "document_type": "identity",
            "content": (
                "Name: Jordan A. Sample\n"
                "DOB: 1990-05-04\n"
                "Address: 123 Main St Apt 2, San Juan, PR"
            ),
        },
    )
    assert document_response.status_code == 201
    identity_document = document_response.json()
    assert identity_document["status"] == "needs_review"
    assert len(identity_document["facts"]) == 3

    conflicts_response = client.get(f"/api/v1/matters/{matter_id}/conflicts")
    conflicts = conflicts_response.json()
    assert conflicts_response.status_code == 200
    assert {conflict["field_name"] for conflict in conflicts} == {
        "display_name",
        "address",
    }

    invalid_resolution = client.post(
        f"/api/v1/matters/{matter_id}/conflicts/{conflicts[0]['id']}/resolve",
        json={"selected_value": "A third unrelated value"},
    )
    assert invalid_resolution.status_code == 422

    for conflict in conflicts:
        selected_value = (
            conflict["conflicting_value"]
            if conflict["field_name"] == "address"
            else conflict["canonical_value"]
        )
        resolve_response = client.post(
            f"/api/v1/matters/{matter_id}/conflicts/{conflict['id']}/resolve",
            json={"selected_value": selected_value},
        )
        assert resolve_response.status_code == 200
        assert resolve_response.json()["status"] == "resolved"

    matter_after_resolution = client.get(
        f"/api/v1/matters/{matter_id}"
    ).json()
    assert matter_after_resolution["display_name"] == "Jordan Sample"
    assert matter_after_resolution["address"] == "123 Main St Apt 2, San Juan, PR"
    assert matter_after_resolution["status"] == "active"

    documents = client.get(f"/api/v1/matters/{matter_id}/documents").json()
    resolved_identity = next(
        document for document in documents if document["id"] == identity_document["id"]
    )
    assert resolved_identity["status"] == "processed"
    assert any(
        fact["field_name"] == "address" and fact["is_current"]
        for fact in resolved_identity["facts"]
    )

    proof_response = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "utility-bill.txt",
            "document_type": "proof_of_address",
            "content": "Address: 123 Main St Apt 2, San Juan, PR",
        },
    )
    assert proof_response.status_code == 201
    assert proof_response.json()["status"] == "processed"

    readiness = client.get(f"/api/v1/matters/{matter_id}/readiness").json()
    assert readiness["score"] == 100
    assert readiness["complete_items"] == 8
    assert readiness["total_items"] == 8
    assert readiness["open_conflicts"] == 0

    final_matter = client.get(f"/api/v1/matters/{matter_id}").json()
    assert final_matter["status"] == "ready_for_review"

    activities = client.get(f"/api/v1/matters/{matter_id}/activities").json()
    event_types = {activity["event_type"] for activity in activities}
    assert {
        "matter_created",
        "intake_updated",
        "document_processed",
        "conflict_detected",
        "conflict_resolved",
        "document_review_completed",
        "matter_status_changed",
    }.issubset(event_types)


def test_document_value_requires_explicit_acceptance_when_intake_is_missing(
    client: TestClient,
) -> None:
    matter_id = create_matter(client, case_type="general", phone=None)

    document = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "identity.txt",
            "document_type": "identity",
            "content": (
                "Name: Jordan Sample\n"
                "Email: jordan@example.com\n"
                "Phone: 787-555-0100"
            ),
        },
    )
    assert document.status_code == 201
    assert document.json()["status"] == "needs_review"

    matter_before = client.get(f"/api/v1/matters/{matter_id}").json()
    assert matter_before["phone"] is None

    conflicts = client.get(f"/api/v1/matters/{matter_id}/conflicts").json()
    assert len(conflicts) == 1
    conflict = conflicts[0]
    assert conflict["field_name"] == "phone"
    assert conflict["canonical_value"] == ""
    assert conflict["canonical_source"] == "No canonical intake value"

    resolution = client.post(
        f"/api/v1/matters/{matter_id}/conflicts/{conflict['id']}/resolve",
        json={"selected_value": conflict["conflicting_value"]},
    )
    assert resolution.status_code == 200

    matter_after = client.get(f"/api/v1/matters/{matter_id}").json()
    assert matter_after["phone"] == "787-555-0100"
    assert matter_after["status"] == "ready_for_review"

    readiness = client.get(f"/api/v1/matters/{matter_id}/readiness").json()
    assert readiness["score"] == 100
    assert readiness["open_conflicts"] == 0


def test_intake_update_reconciles_matching_document_conflict(client: TestClient) -> None:
    matter_id = create_matter(client, case_type="general")
    document = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "identity.txt",
            "document_type": "identity",
            "content": "Name: Jordan A. Sample",
        },
    )
    assert document.status_code == 201
    assert document.json()["status"] == "needs_review"

    update_response = client.put(
        f"/api/v1/matters/{matter_id}/intake",
        json={
            "display_name": "Jordan A. Sample",
            "email": "jordan@example.com",
            "phone": "787-555-0100",
            "address": None,
            "date_of_birth": None,
            "summary": "Name confirmed during intake review.",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "ready_for_review"

    conflicts = client.get(f"/api/v1/matters/{matter_id}/conflicts").json()
    assert len(conflicts) == 1
    assert conflicts[0]["status"] == "resolved"
    assert conflicts[0]["resolved_value"] == "Jordan A. Sample"

    documents = client.get(f"/api/v1/matters/{matter_id}/documents").json()
    assert documents[0]["status"] == "processed"


def test_invalid_intake_and_blank_document_are_rejected(client: TestClient) -> None:
    matter_id = create_matter(client)

    invalid_date = client.put(
        f"/api/v1/matters/{matter_id}/intake",
        json={
            "display_name": "Jordan Sample",
            "email": "jordan@example.com",
            "phone": "787-555-0100",
            "address": "123 Main Street",
            "date_of_birth": "04/05/1990",
            "summary": None,
        },
    )
    assert invalid_date.status_code == 422

    blank_document = client.post(
        f"/api/v1/matters/{matter_id}/documents",
        json={
            "original_name": "blank.txt",
            "document_type": "identity",
            "content": "   ",
        },
    )
    assert blank_document.status_code == 422
