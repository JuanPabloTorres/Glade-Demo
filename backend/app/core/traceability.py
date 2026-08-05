from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.contracts import get_contract_registry


class ApiTraceabilityMiddleware(BaseHTTPMiddleware):
    """Expose and verify the shared operation mapping on registered API responses."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        route = request.scope.get("route")
        route_path = getattr(route, "path", None)
        if route_path is None:
            return response

        contract = get_contract_registry().find_by_http(request.method, route_path)
        if contract is None:
            return response

        response.headers["X-Backend-Operation-Id"] = contract.operation_id
        response.headers["X-Backend-Controller"] = contract.controller
        response.headers["X-Backend-Action"] = contract.action

        frontend_values = {
            "operation": request.headers.get("X-Frontend-Operation-Id"),
            "controller": request.headers.get("X-Frontend-Controller"),
            "action": request.headers.get("X-Frontend-Action"),
        }
        if all(value is None for value in frontend_values.values()):
            trace_match = "not-provided"
        else:
            trace_match = str(
                frontend_values["operation"] == contract.operation_id
                and frontend_values["controller"] == contract.controller
                and frontend_values["action"] == contract.action
            ).lower()
        response.headers["X-Trace-Match"] = trace_match
        return response
