import base64

from fastapi.testclient import TestClient


def test_analyze_document_endpoint_classifies_and_extracts_amounts(client: TestClient) -> None:
    content = "Talón de pago - salario bruto $1,200.00 - Employer Inc.".encode()
    response = client.post(
        "/api/v1/documents/analyze",
        json={
            "case_id": "case-test",
            "filename": "paystub.txt",
            "content_base64": base64.b64encode(content).decode("ascii"),
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["evidence_type"] == "Talones de pago"
    assert payload["chunk_count"] == 1
    assert payload["extracted_amounts"][0]["amount"] == 1200.00
    assert payload["extracted_amounts"][0]["provenance"] == "extracted"


def test_analyze_document_rejects_unsupported_format(client: TestClient) -> None:
    response = client.post(
        "/api/v1/documents/analyze",
        json={
            "case_id": "case-test",
            "filename": "notes.xyz",
            "content_base64": base64.b64encode(b"whatever").decode("ascii"),
        },
    )
    assert response.status_code == 422


def test_analyze_document_rejects_invalid_base64(client: TestClient) -> None:
    response = client.post(
        "/api/v1/documents/analyze",
        json={"case_id": "case-test", "filename": "paystub.txt", "content_base64": "not-valid-base64!!"},
    )
    assert response.status_code == 422


def test_analyze_document_requires_jwt(client: TestClient) -> None:
    authorization = client.headers.pop("Authorization")
    try:
        response = client.post(
            "/api/v1/documents/analyze",
            json={"case_id": "case-test", "filename": "paystub.txt", "content_base64": "AA=="},
        )
    finally:
        client.headers["Authorization"] = authorization
    assert response.status_code == 401
