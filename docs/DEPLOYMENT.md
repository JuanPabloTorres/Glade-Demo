# Deployment

## Recommended interview deployment
- Frontend: Vercel or any static Vite host.
- Backend: Render, Railway, Fly.io, or a container service.
- Database: managed PostgreSQL.

## Required backend variables
`DATABASE_URL`, `CORS_ORIGINS`, `DOCUMENT_INTELLIGENCE_PROVIDER`.

## Required frontend variable
`VITE_API_BASE_URL` pointing to the public backend URL.

Run `make verify` and a production frontend build before publishing. Use synthetic data only.


## One-project Vercel preview

The repository also includes `api/index.py`, root `package.json`, `requirements.txt`,
and `vercel.json`. Vercel builds the Vite frontend and discovers the FastAPI ASGI
entrypoint under `/api`. In production, set `DATABASE_URL` to managed PostgreSQL.
Without that variable, the preview uses `/tmp/matter_ready.db`, which may reset on a
cold start and is intended only for evaluation.
