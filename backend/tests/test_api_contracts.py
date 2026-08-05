from fastapi.testclient import TestClient
from fastapi.routing import APIRoute

from app.core.contracts import get_contract_registry
from app.main import app


def test_every_contract_maps_to_an_openapi_operation() -> None:
    routes = {
        (next(iter(route.methods or [])), route.path, route.operation_id)
        for route in app.routes
        if isinstance(route, APIRoute)
    }
    for contract in get_contract_registry().values():
        assert (contract.method, contract.path, contract.operation_id) in routes


def test_response_exposes_frontend_to_backend_trace(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={"X-Frontend-Operation-Id": "getHealth"},
    )

    assert response.headers["X-Backend-Operation-Id"] == "getHealth"
    assert response.headers["X-Backend-Controller"] == "HealthController"
    assert response.headers["X-Backend-Action"] == "get_health"
    assert response.headers["X-Trace-Match"] == "true"
