# API Contract Traceability

`contracts/api-contracts.json` is the canonical registry. Each entry includes:

- operation key used by frontend clients;
- OpenAPI `operationId`;
- HTTP method and path;
- conceptual controller and action.

The frontend generator writes `src/api/apiContracts.generated.ts`. FastAPI routers load the same JSON. `tests/test_api_contracts.py` confirms that every registry operation exists in OpenAPI with the expected method, path, and operation ID.

## Attorney portfolio

`GET /api/v1/bankruptcy/portfolio` returns the authenticated attorney's
server-authorized, persisted case summaries. The response is intentionally
triage-only: case identity, status, urgency signals, section counts, and update
time. It does not expose balances, income rows, debts, assets, or evidence
contents. Client sessions receive `403`, and anonymous requests receive `401`.

The attorney dashboard intersects these persisted IDs with its browser-side
workspace before rendering an Open action. Browser-only drafts therefore cannot
lead the attorney to an analysis request that the server must reject with 404.

## Runtime verification

The frontend sends `X-Frontend-Operation-Id`, `X-Frontend-Controller`, and
`X-Frontend-Action`. The backend resolves the actual matched route from the same
registry and exposes `X-Backend-Operation-Id`, `X-Backend-Controller`,
`X-Backend-Action`, and `X-Trace-Match` on the response. This makes the mapping
inspectable in browser network tools rather than existing only in documentation.
