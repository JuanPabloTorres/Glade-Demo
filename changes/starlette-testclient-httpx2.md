---
taskId: starlette-testclient-httpx2
type: patch
scope: backend test dependencies
---
# Summary

Starlette's current `TestClient` prefers the maintained `httpx2` backend and emits a
`StarletteDeprecationWarning` when the test environment only provides legacy `httpx`.
The backend test group now installs `httpx2>=2.0,<3.0` alongside `httpx`: keeping
`httpx` preserves existing direct consumers while giving Starlette the supported
backend it selects first.

This is dependency/test-harness maintenance only. No API contract, application
behavior, database schema, authorization rule, or production runtime dependency is
changed.

# User-visible behavior

None.

# Migration / compatibility

`backend/uv.lock` is regenerated from the modified `pyproject.toml`. The package is
added only to the `dev` dependency group, so production installs remain unchanged.

# Tests and evidence

Required release evidence:

- `cd backend && uv lock --check`
- `cd backend && uv run ruff check .`
- `cd backend && uv run mypy app`
- `cd backend && uv run python -m compileall app`
- `cd backend && uv run pytest`
- `npm run version:check`
- repository governance/release gates as applicable

The specific acceptance condition is that the backend pytest run no longer emits the
Starlette/FastAPI `TestClient` deprecation warning.

# Risks / limitations

`httpx2` is intentionally not promoted to a production dependency. If application
code later imports it directly, that is a separate dependency decision and should not
piggyback on this test-only cleanup.
