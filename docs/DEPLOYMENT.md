# Deployment

## Topology, as actually configured

- **Frontend + backend: Vercel.** `vercel.json` builds the Vite frontend and rewrites `/api/*` to `api/index.py`, an ASGI entrypoint running `requirements.txt`: the app, plus the Strands SDK with its OpenAI client, and none of the ML stack (no torch, transformers or docling). `backend/tests/test_production_dependencies.py` fails if the ML packages leak in, and equally if the agent SDK goes missing.
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
| `OPENAI_API_KEY` | For a working agent | `api/index.py` already sets `AI_PROVIDER=openai`. Without a key the model factory raises, the runtime catches it, and every answer comes back from the deterministic draft with `degraded: true` — no error, just no agent. |
| `OPENAI_BASE_URL` | Only for a non-OpenAI provider | Points the `openai` provider at any endpoint speaking OpenAI's **Chat Completions** API — see "Running the agent for free" below. Unset means OpenAI itself, over the Responses API. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. Set it to whatever the provider you chose actually serves. Note this is **not** `AI_MODEL_ID`, which belongs to the transformers provider and defaults to a HuggingFace repo id; handing that to OpenAI fails every call and the runtime turns a failed call into a silent degrade. |
| `AI_PROVIDER` | No | `api/index.py` sets `openai`. `ollama` cannot work here — it needs a model server on localhost and a serverless function has none. `rule_based` forces the deterministic path. |
| `CORS_ORIGINS` | No | Same-origin on Vercel. Required on Render. |
| `DEMO_CLIENT_*` / `DEMO_ATTORNEY_*` | No | Override before any deployment that is not the synthetic demo. |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION_MINUTES` | No | Demo defaults are fine for a demo. |

`VITE_API_BASE_URL` is **not** needed on Vercel: the frontend calls same-origin `/api/*` paths and `vercel.json` rewrites them. It is required only when the frontend and API are on different domains.

`DOCUMENT_INTELLIGENCE_PROVIDER` (set in `docker-compose.yml`, `render.yaml` and `api/index.py`) is not read by `Settings` and does nothing.

## What a Vercel deployment can and cannot demonstrate

Can:

- the full frontend — navigation shell, section routing, the assistant route, responsive behaviour from 320px up, EN/ES;
- authentication, role separation, and server-side ownership checks *within a single warm instance*;
- the assistant answering deterministically, grounded in the question asked and in the case's real figures;
- **the Strands agent layer**, once `OPENAI_API_KEY` is set — an orchestrator delegating to role-gated specialists that read case data through tools before answering.

Cannot:

- **durable persistence or a real ownership guarantee**, until `DATABASE_URL` points at Postgres.

### Running the agent for free

OpenAI has no meaningful free tier, and the agent is the part of this product worth demonstrating. Several providers expose an OpenAI **Chat Completions**-compatible endpoint with a free tier, and `OPENAI_BASE_URL` switches both the endpoint and the protocol to match — the default path speaks the *Responses* API, which today only OpenAI implements.

Pick one, create an account, generate a key, and set three variables:

| Provider | `OPENAI_BASE_URL` | A model that works | Notes |
| --- | --- | --- | --- |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | Free tier with per-minute limits. Fast enough that a demo turn feels instant. |
| Cerebras | `https://api.cerebras.ai/v1` | `llama-3.3-70b` | Free tier, very low latency. |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash` | Free tier; this is Gemini behind an OpenAI-compatible shim. |
| OpenRouter | `https://openrouter.ai/api/v1` | a model whose id ends in `:free` | Aggregates several providers; the free pool changes, so check the model list. |

Whichever you choose, `OPENAI_API_KEY` holds that provider's key — the variable is named for the protocol, not the vendor.

Two things to verify on the first turn, because the runtime degrades silently rather than erroring: that the response comes back with `degraded: false`, and that `handled_by` names a specialist. If either is wrong, the model is being rejected and the deterministic draft is answering instead.

### What enabling the agent means

`AI_PROVIDER=openai` sends reduced case context — income, debts, and for an attorney session the private notes — to a third party. Every case in this deployment is synthetic (AGENTS.md rule 9), so that is a demo decision rather than a disclosure one. It stops being true the moment real information is entered, which is another reason not to enter any.

Cost and latency both rise per answered turn. `Limits(turns=8)` in `AgentRuntime` bounds the orchestrator↔specialist round trips, which bounds both.

The size question was measured rather than assumed: `strands-agents[openai]` takes a clean install of `requirements.txt` from 101 MB to 163 MB, against Vercel's 250 MB unzipped limit.

## Making the data survive: Postgres

The SQLite default is per-instance and ephemeral (see above). Two managed Postgres services have free tiers that are enough for this demo, and both give you a ready-made `postgresql://` DSN:

- **Neon** — serverless Postgres, scales to zero, and Vercel ships a first-party integration that sets `DATABASE_URL` on the project for you.
- **Supabase** — a free Postgres instance; copy the connection string from Project Settings → Database.

Either way the DSN needs one edit: SQLAlchemy has to be told which driver to use, so change the `postgresql://` prefix to **`postgresql+psycopg://`**. The driver already ships in `requirements.txt`, so this is a variable change and nothing else.

## Upgrading to Postgres

Every model in `app/repositories/orm_models.py` uses portable SQLAlchemy column types, so no schema changes are needed — only the driver and the connection string.

1. The `psycopg[binary]` driver already ships in both `requirements.txt` and `backend/pyproject.toml`. Nothing to add.
2. Set `DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname`. Note the `+psycopg` — a bare `postgresql://` DSN makes SQLAlchemy look for `psycopg2`, which is not installed.
3. Run the migrations once against the new database: `cd backend && alembic upgrade head`.
4. Leave `SEED_DEMO_DATA_ON_STARTUP` set only if you want the synthetic case in it; it seeds once into an empty database and then does nothing.

`init_db()` also runs `create_all()` at startup as a demo-convenience safety net. It is idempotent and never a substitute for Alembic on a real database — run step 3 explicitly.

## Before publishing

Run `make verify` and a production frontend build. Use synthetic data only.
