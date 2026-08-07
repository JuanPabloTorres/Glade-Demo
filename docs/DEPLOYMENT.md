# Deployment

## Topology, as actually configured

- **Frontend + trimmed backend: Vercel.** `vercel.json` builds the Vite frontend and rewrites `/api/*` to `api/index.py`, an ASGI entrypoint restricted to the base `requirements.txt` — no torch, transformers, docling, or the Strands agent SDK. `backend/tests/test_production_dependencies.py` fails the build if any of those leak in.
- **Full backend + Postgres: Render** (`render.yaml`, via `backend/Dockerfile`). Also runs the base dependency set today; the `ai`/`documents`/`rag`/`agents` optional groups are not installed there either.
- **Local dev:** `docker-compose.yml` (Postgres + API + web).

Because `vercel.json` serves the frontend and the API from one domain, the browser never performs a CORS check on Vercel. `CORS_ORIGINS` only matters for a split-origin deployment such as Render.

## Persistence is real — read this before deploying

Persistence is SQLAlchemy + Alembic behind repository protocols, and `DATABASE_URL` **is** read (`app/repositories/database.py`). Case ownership is enforced server-side by `CaseAccessService`. Anything you may have read in `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` or `GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` about the backend being stateless describes the state **before 4.0.0** and is no longer true.

On Vercel the default is `sqlite:////tmp/matter_ready.db`. Vercel's `/tmp` is **per-instance and ephemeral**:

- every cold start begins with an empty database;
- two concurrent instances do not share rows;
- a `case_id` owned in one invocation can read back ownerless after a cold start.

That is acceptable for a synthetic-data demo and unacceptable as an ownership guarantee. **Do not put real information behind this deployment.** To make persistence real, point `DATABASE_URL` at managed Postgres — see "Upgrading to Postgres" below.

## Vercel environment variables

| Variable | Required | Why |
| --- | --- | --- |
| `JWT_SECRET` | **Yes — the API will not boot without it** | `api/index.py` sets `ENVIRONMENT=production`, and `Settings` refuses to construct while the signing key is still the public demo default. Since that happens at import time, every `/api/*` route returns a function error until this is set. Use a long random value. |
| `SEED_DEMO_DATA_ON_STARTUP` | Recommended: `true` | Populates the synthetic demo case into an **empty** database at boot. Without it a login lands on an empty workspace after every cold start. It never writes over existing rows, so it degrades to a no-op once there is real data. |
| `DATABASE_URL` | No | Defaults to `sqlite:////tmp/matter_ready.db`. Set it to a Postgres DSN to make persistence real. |
| `AI_PROVIDER` | No | Defaults to `rule_based`, which is the only value the Vercel function can serve — the agent SDK is deliberately not in `requirements.txt`. Setting `openai` or `ollama` here does not fail; it degrades every answer to the deterministic draft and reports `degraded: true`. |
| `CORS_ORIGINS` | No | Same-origin on Vercel. Required on Render. |
| `DEMO_CLIENT_*` / `DEMO_ATTORNEY_*` | No | Override before any deployment that is not the synthetic demo. |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION_MINUTES` | No | Demo defaults are fine for a demo. |

`VITE_API_BASE_URL` is **not** needed on Vercel: the frontend calls same-origin `/api/*` paths and `vercel.json` rewrites them. It is required only when the frontend and API are on different domains.

`DOCUMENT_INTELLIGENCE_PROVIDER` (set in `docker-compose.yml`, `render.yaml` and `api/index.py`) is not read by `Settings` and does nothing.

## What a Vercel deployment can and cannot demonstrate

Can:

- the full frontend — navigation shell, section routing, the assistant route, responsive behaviour from 320px up, EN/ES;
- authentication, role separation, and server-side ownership checks *within a single warm instance*;
- the assistant answering deterministically, grounded in the question asked and in the case's real figures.

Cannot:

- **the Strands agent layer.** The SDK is excluded from the function on purpose, so every answer comes from the deterministic fallback with `degraded: true`. Exercising the agents needs a host with Ollama reachable, or `OPENAI_API_KEY` plus the `agents` extra installed.
- **durable persistence or a real ownership guarantee**, until `DATABASE_URL` points at Postgres.

## Upgrading to Postgres

Every model in `app/repositories/orm_models.py` uses portable SQLAlchemy column types, so no schema changes are needed — only the driver and the connection string.

1. Add `psycopg[binary]` to `requirements.txt` (Vercel) or the `backend/pyproject.toml` dependencies (Render/Docker).
2. Set `DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname`.
3. Run the migrations once against the new database: `cd backend && alembic upgrade head`.
4. Leave `SEED_DEMO_DATA_ON_STARTUP` set only if you want the synthetic case in it; it seeds once into an empty database and then does nothing.

`init_db()` also runs `create_all()` at startup as a demo-convenience safety net. It is idempotent and never a substitute for Alembic on a real database — run step 3 explicitly.

## Before publishing

Run `make verify` and a production frontend build. Use synthetic data only.
