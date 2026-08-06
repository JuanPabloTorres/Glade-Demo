# Vercel Deployment

## Recommended demo topology

Create two Vercel projects from `JuanPabloTorres/Glade-Demo`.

### Backend project

- Root directory: `backend`
- Framework preset: Other / Python
- Entry point: `app.py` exports the FastAPI `app`
- Environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGINS`
  - `AI_PROVIDER`
  - `OPENAI_API_KEY` only when external AI is enabled
  - `OPENAI_MODEL`

Use a managed PostgreSQL connection string. SQLite is not durable in serverless deployments.

### Frontend project

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<backend-domain>/api/v1`

The included `frontend/vercel.json` rewrites client-side routes to `index.html`.

## CORS

Set `CORS_ORIGINS` to a JSON array containing the exact frontend domains:

```env
CORS_ORIGINS=["https://freshstart-demo.vercel.app"]
```

## Deployment verification

1. `GET /health` returns `200`.
2. Login with the applicant demo account.
3. Open the assistant page and receive a contextual response.
4. Complete one intake section and confirm progress increases.
5. Login as case manager and verify list/card CRUD behavior.
6. Test mobile bottom navigation and desktop sidebar.
