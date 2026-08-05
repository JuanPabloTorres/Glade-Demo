from fastapi.testclient import TestClient

from app.core.contracts import get_contract_registry
from app.main import app


def test_every_contract_maps_to_an_openapi_operation() -> None:
    openapi = app.openapi()

    for contract in get_contract_registry().values():
        operation = openapi["paths"][contract.path][contract.method.lower()]
        assert operation["operationId"] == contract.operation_id


def test_response_exposes_frontend_to_backend_trace(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={"X-Frontend-Operation-Id": "getHealth"},
    )

    assert response.headers["X-Backend-Operation-Id"] == "getHealth"
    assert response.headers["X-Backend-Controller"] == "HealthController"
    assert response.headers["X-Backend-Action"] == "get_health"
    assert response.headers["X-Trace-Match"] == "true"
