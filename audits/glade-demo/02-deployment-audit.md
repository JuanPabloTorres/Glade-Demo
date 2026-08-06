# 02 — Deployment Audit

**Status: BLOCKED — no live URL provided.**

This audit could not be completed because no deployed frontend (Vercel) or backend (Render) URL was
available in this environment or from the user. Everything below is what could be verified from
configuration alone; none of it substitutes for testing the actual deployed instance.

## What's configured

- **Frontend (Vercel)** — `vercel.json`: Vite framework, `npm run build`, output `frontend/dist`,
  security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, a real `Content-Security-Policy`), SPA rewrite (`/(.*) → /index.html`), and
  `/api/:path* → /api/index.py` (a Python serverless function for the trimmed API surface). Whether
  `api/index.py` exists and what it actually serves was not verified — see open questions below.
- **Backend (Render)** — `render.yaml`: Docker build from `backend/Dockerfile`, health check at
  `/api/v1/health`, `CORS_ORIGINS` marked `sync: false` (must be set manually in the Render
  dashboard — **this is exactly the class of bug found and fixed locally today**: a backend that
  doesn't have the frontend's exact origin in `CORS_ORIGINS` will silently fail every browser
  request with no useful error beyond a CORS console message), and a Postgres database that, per
  `01-system-map.md`, is provisioned but never actually connected to by the application code.
- **CI** — `.github/workflows/ci.yml` runs on every push/PR to `main`: version-sync check,
  backend (ruff, mypy, pytest), frontend (build, lint, vitest). No deploy step is defined in this
  workflow — deployment is presumably Vercel's/Render's own GitHub integration reacting to pushes,
  which was not confirmed.

## What could not be verified (needs the live URL or dashboard access)

- [ ] The public URL loads, HTTPS is valid, no unexpected redirects.
- [ ] No 404/500s, no blank screens, no console JS errors, no failed network requests.
- [ ] Frontend's `VITE_API_BASE_URL` points at the actual deployed backend (not `localhost`).
- [ ] Backend's `CORS_ORIGINS` includes the actual deployed frontend origin exactly (scheme + host,
      no trailing slash — the CORS middleware does an exact string match per `core/config.py`).
- [ ] `JWT_SECRET` on the deployed backend has been overridden from the public demo default in
      `.env.example` (`freshstart-public-demo-signing-key-change-before-real-data`). This default
      is fine to ship in the repo — it's clearly labeled — but if it's still the live value in
      production, anyone can forge a valid session token for either demo account.
- [ ] The demo accounts actually work end-to-end against the deployed backend (login → dashboard →
      full flow, mirroring the local e2e suite in `frontend/e2e/matter-workflow.spec.ts`).
- [ ] Refresh on an internal route (e.g. `/case/case-elena-demo`) doesn't 404 (Vercel's SPA rewrite
      should cover this, but wasn't tested live).
- [ ] Mobile / tablet / incognito / unauthenticated-session behavior on the actual deployed instance.
- [ ] Whether the currently-live commit matches `main`'s current head (v3.1.0) or an older commit —
      given the large uncommitted-then-merged changeset found at the start of this audit
      (i18n system, AI health endpoint, several real bugs), **the deployed instance is very likely
      several commits behind** unless it was redeployed since this session started.

## Immediate recommendation

Once a deploy is triggered from the current `main` (v3.1.0):
1. Confirm `CORS_ORIGINS` on Render matches the Vercel origin exactly.
2. Confirm `VITE_API_BASE_URL` at Vercel build time points at the Render backend's real URL.
3. Re-run the checklist above against the live URL and update this document with results — this
   file should not be treated as a substitute for that pass.
