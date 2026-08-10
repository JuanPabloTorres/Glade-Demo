---
taskId: starlette-testclient-httpx2
type: patch
scope: release/test-harness maintenance
---
# Summary

The remaining Starlette/FastAPI test deprecation is removed at its source rather than
hidden with `filterwarnings`. The backend dev group now installs
`httpx2>=2.0,<3.0` alongside legacy `httpx`, allowing the current Starlette
`TestClient` to select its maintained backend while preserving existing `httpx`
consumers. `backend/uv.lock` was regenerated on Linux/Python 3.13 and the release was
bumped from 4.14.1 to 4.14.2.

Running the complete delivery gates exposed several pre-existing harness defects that
prevented this maintenance patch from being honestly releasable. Those were repaired
in the same release pass: static analysis now installs the optional Strands extra,
Vitest restores file isolation for application-wide module mocks, CI/release E2E is
serialized around its shared SQLite demo database, identical in-flight case-analysis
requests are coalesced to avoid React StrictMode duplicate creation, stale demo-access
selectors follow the current copy, and the 320x720 login layout keeps the real sign-in
controls above the first-screen fold.

No API contract, database schema, authorization rule, or production backend dependency
changed.

# User-visible behavior

The application behavior is unchanged except for tighter login spacing at the smallest
mobile breakpoint so the sign-in form remains operable without an initial scroll.
Desktop/tablet spacing remains under the existing responsive breakpoints.

# Migration / compatibility

- `httpx2` is dev-only; it is not promoted into the production dependency set.
- `httpx` remains installed for existing direct consumers.
- The lockfile resolves `httpx2==2.10.0`, `httpcore2==2.10.0`, and its supporting
  trust-store dependency under the current Python 3.13 lock.
- CI and `release:verify` run mypy with `--extra agents`; the Strands package remains
  an optional runtime extra rather than becoming mandatory in production.
- No Alembic migration is required.

# Tests and evidence

GitHub Actions run `31343174930` on the 4.14.2 branch completed all five CI jobs with
exit 0:

- versioning: pass; 4.14.2 is newer than `main` 4.14.1.
- governance: pass.
- backend: `uv lock --check`, frozen sync, Ruff, mypy with the optional agents extra,
  compileall, and **385/385 pytest tests passed**. The pytest output contains no
  Starlette/FastAPI `TestClient` deprecation warning.
- frontend: contract generation/diff, i18n, lint, **143/143 Vitest tests**, and build
  passed.
- E2E: **121/121 Playwright tests passed** in 3.8 minutes using the release-compatible
  shared-database execution model.

The final `npm run release:verify` result is recorded in the release notes after the
full release gate runs on this tree.

# Risks / limitations

GitHub's JavaScript actions still emit their own Node-runtime deprecation notices
(`punycode`, `url.parse`, and Node 20 action metadata being forced onto Node 24).
Those originate in third-party GitHub Actions, not FastAPI/Starlette or the application
test suite, and are outside this patch's dependency boundary.

`analysisInFlight` coalesces only byte-for-byte-identical case snapshots while a
request is active and removes the entry on success or failure; it is intentionally not
a response cache. A changed case snapshot always sends a new analysis request.
