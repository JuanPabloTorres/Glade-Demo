from fastapi.testclient import TestClient

from app.core.contracts import get_contract_registry
from app.main import app


def test_every_contract_maps_to_an_openapi_operation() -> None:
    openapi = app.openapi()
    operations = {
        (method.upper(), path, operation["operationId"])
        for path, path_item in openapi["paths"].items()
        for method, operation in path_item.items()
        if method.lower() in {"get", "post", "put", "patch", "delete"}
    }

    for contract in get_contract_registry().values():
        assert (contract.method, contract.path, contract.operation_id) in operations


def test_response_exposes_frontend_to_backend_trace(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={
            "X-Frontend-Operation-Id": "getHealth",
            "X-Frontend-Controller": "HealthController",
            "X-Frontend-Action": "get_health",
        },
    )

    assert response.headers["X-Backend-Operation-Id"] == "getHealth"
    assert response.headers["X-Backend-Controller"] == "HealthController"
    assert response.headers["X-Backend-Action"] == "get_health"
    assert response.headers["X-Trace-Match"] == "true"


def test_trace_detects_controller_or_action_mismatch(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={
            "X-Frontend-Operation-Id": "getHealth",
            "X-Frontend-Controller": "WrongController",
            "X-Frontend-Action": "get_health",
        },
    )

    assert response.status_code == 200
    assert response.headers["X-Trace-Match"] == "false"
