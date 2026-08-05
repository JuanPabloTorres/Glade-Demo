# API Contract Traceability

`contracts/api-contracts.json` is the canonical registry. Each entry includes:

- operation key used by frontend clients;
- OpenAPI `operationId`;
- HTTP method and path;
- conceptual controller and action.

The frontend generator writes `src/api/apiContracts.generated.ts`. FastAPI routers load the same JSON. `tests/test_api_contracts.py` confirms that every registry operation exists in OpenAPI with the expected method, path, and operation ID.

## Runtime verification

The frontend sends `X-Frontend-Operation-Id`, `X-Frontend-Controller`, and
`X-Frontend-Action`. The backend resolves the actual matched route from the same
registry and exposes `X-Backend-Operation-Id`, `X-Backend-Controller`,
`X-Backend-Action`, and `X-Trace-Match` on the response. This makes the mapping
inspectable in browser network tools rather than existing only in documentation.
