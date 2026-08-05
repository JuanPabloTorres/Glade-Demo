from fastapi.testclient import TestClient

from app.core.contracts import get_contract_registry
from app.core.version import APP_VERSION
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


def test_health_response_is_safe_and_versioned(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "MatterReady AI Intake Copilot",
        "version": APP_VERSION,
    }
    assert "x-backend-operation-id" not in response.headers
    assert "x-backend-controller" not in response.headers
    assert "x-backend-action" not in response.headers
    assert "x-trace-match" not in response.headers
