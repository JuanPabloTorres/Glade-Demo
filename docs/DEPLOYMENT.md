# Deployment

## Recommended deployment topology (as actually configured today)

- Frontend + trimmed backend: Vercel (`vercel.json` builds the Vite frontend and routes `/api/*` to `api/index.py`, an ASGI entrypoint restricted to the base `requirements.txt` — no torch/transformers/docling there).
- Full backend + Postgres: Render (`render.yaml`), via `backend/Dockerfile`. Also runs only the base dependency set today (the `ai`/`documents`/`rag` optional groups are not installed on Render either — see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`).
- Local dev: `docker-compose.yml` (Postgres + API + web).

The backend itself is stateless — no code path reads from Postgres today (see `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md`). The `DATABASE_URL` env var referenced in `render.yaml`/`docker-compose.yml`/`api/index.py` is provisioned infrastructure for a future persistence layer, not something `backend/app/core/config.py`'s `Settings` currently reads. Don't rely on it doing anything yet.

## Backend environment variables that actually do something

See `.env.example` for the full, current list (kept in sync with `Settings`). The ones relevant to deployment:

- `CORS_ORIGINS` — comma-separated allowed origins.
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION_MINUTES` — override the demo defaults before storing anything real.
- `DEMO_CLIENT_*` / `DEMO_ATTORNEY_*` — override before any non-demo deployment.
- `AI_PROVIDER` (`rule_based` default / `ollama` / `transformers`), `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL`, `AI_MODEL_ID`, `AI_MAX_NEW_TOKENS` — see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`.

`DOCUMENT_INTELLIGENCE_PROVIDER` (set in `docker-compose.yml`/`render.yaml`/`api/index.py`) is **not read anywhere in `Settings`** — it's leftover from before the document pipeline in `docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md` existed. Don't rely on it; it does nothing today.

## Required frontend variable

`VITE_API_BASE_URL` pointing to the public backend URL.

Run `make verify` and a production frontend build before publishing. Use synthetic data only.

## One-project Vercel preview

The repository also includes `api/index.py`, root `package.json`, `requirements.txt`, and `vercel.json`. Vercel builds the Vite frontend and discovers the FastAPI ASGI entrypoint under `/api`. Since no code path reads `DATABASE_URL`, its value in the Vercel preview environment is inert — the backend simply doesn't persist anything between requests there (or anywhere else today).
