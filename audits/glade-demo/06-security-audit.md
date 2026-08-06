# 06 — Security Audit

Scope: source-level review of the current `main` (v3.1.0). No penetration testing against a live
deployment was performed (blocked — see `02-deployment-audit.md`); this is a code and configuration
review plus targeted negative-path checks against the local backend.

## Authentication

- Two hardcoded demo accounts (`core/security.py`), Argon2 password hashing via `pwdlib`
  (`PasswordHash.recommended()` — a maintained, modern KDF choice, not MD5/SHA1/plain).
- JWT (HS256), 45-minute expiry, issuer/audience claims set and presumably verified on decode.
- `JWT_SECRET` default in `.env.example` is explicitly labeled
  `"...change-before-real-data"` — correct practice for a demo repo. **Cannot verify** whether the
  actual deployed instance overrides this; if it doesn't, anyone with the repo (public on GitHub)
  can forge a valid token for either demo account. This is the single highest-priority item for
  `02-deployment-audit.md` once a live URL exists.
- No password-reset flow, no MFA, no account lockout/rate limiting on login attempts — all
  reasonable omissions for a two-account demo, all real gaps before any non-demo use.

## Authorization

- **Role re-verification, not just trust**: `bankruptcy.py`'s guidance endpoint explicitly checks
  the request body's declared role against the authenticated JWT's role and rejects a mismatch
  with 403 (confirmed in source; this was a documented fix in the 3.0.0 release notes, not new
  today, but verified still in place). This is exactly the kind of check that's easy to skip and
  matters most — good.
- **Horizontal access control**: `CaseWorkspacePage.tsx` redirects away if
  `user.role === "client" && caseData.ownerUserId !== user.id` — a client can't open another
  client's case by guessing/editing the URL. This is a frontend-only check, though; **the backend
  endpoints that operate on case data don't exist** (case data never leaves the browser — see
  `01-system-map.md`), so there's no server-side enforcement gap to find here specifically, but
  it also means this control cannot be verified as intended if a real backend-persisted case store
  is added later — it would need an equivalent server-side check at that point, not just the
  current frontend redirect.
- No horizontal-access issue found for attorney access (attorneys are meant to see all cases by
  design).

## Input validation / injection

- All API inputs are Pydantic DTOs with typed fields (e.g. `LoginDto` enforces `min_length`/
  `max_length` on email/password, normalizes email casing). `extra="ignore"` on the settings model
  is intentional and fine; DTOs themselves don't appear to use `extra="ignore"` broadly enough to
  silently accept unexpected fields — not exhaustively verified per-DTO.
- **No SQL injection surface exists** — there is no database query code anywhere in the backend
  (confirmed via grep for `sqlalchemy`/`create_engine`/raw SQL — none found). This is a real,
  structural non-finding, not an oversight to praise cautiously: the attack surface simply isn't
  there today.
- **No XSS injection vector found**: no `dangerouslySetInnerHTML` usage anywhere in `frontend/src`
  (confirmed via grep). React's default JSX escaping covers all rendered user/AI-generated text
  observed (chat messages, notes, case data).
- File uploads are metadata-only in this demo ("El demo guarda metadatos locales, no archivos
  reales" — verified in the evidence-add modal's own copy); no real file content is ever
  transmitted or stored, which eliminates an entire class of upload-based attacks for this demo's
  current scope. This will need real review once actual file upload/storage is implemented
  (the `services/documents/` ingestion pipeline scaffold suggests that's planned).

## CORS

- Backend uses an explicit origin allow-list (`CORS_ORIGINS` env var, split and exact-matched — no
  wildcard `*`, no regex, no reflecting the request's `Origin` header unconditionally). This is the
  correct pattern.
- **Found and fixed this pass**: a mismatch between the configured origin and the actual running
  frontend's origin produces a completely silent failure from the user's perspective (a generic
  "No fue posible completar la operación." message, no indication it's a CORS problem) — not a
  vulnerability, but a real debuggability gap. Worth adding a clearer client-side message for
  network-level failures (no `error.response` at all) versus API-level errors (a real HTTP error
  response), since `resolveApiErrorMessage` currently treats both the same way.

## Secrets / repository hygiene

- `.env.example` contains only clearly-labeled placeholder values, no real secrets.
- Demo account passwords (`FreshStart!2026`, `Counsel!2026`) are intentionally public — this is
  correct for a demo where the credentials are meant to be shared with reviewers, and the README
  states this explicitly ("All included people, creditors, balances, and documents are invented").
- No `.env` file (the real, non-example one) is tracked in the repo (`.gitignore` covers it).
- No API keys, tokens, or credentials for third-party services found anywhere in tracked source —
  consistent with there being no third-party integrations (see `01-system-map.md`).

## Error handling / information disclosure

- Global exception handlers return a consistent shape (`code`, `messageKey`, `message`,
  `parameters`, `traceId`) and localize the message server-side rather than passing through raw
  exception text — this avoids leaking stack traces or internal details to the client. Verified for
  `DomainError`, `HTTPException`, and `RequestValidationError` paths.
- `RequestValidationError`'s handler does include the raw Pydantic `exc.errors()` in the
  `parameters` field. This is standard for surfacing which field failed validation and is not
  generally sensitive (field names, not internal state), but is worth a second look if any future
  field ever carries sensitive data in its validation error context.

## Headers / transport

- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy) are set at the Vercel edge (`vercel.json`) for anything served through
  Vercel's rewrite, including the `/api/*` proxy. If the Render backend is ever hit **directly**
  (bypassing the Vercel proxy — e.g. by a client configured with the raw Render URL), those headers
  would not apply, since FastAPI itself sets none. Low risk given the intended architecture routes
  everything through Vercel, but worth confirming `VITE_API_BASE_URL` in production actually points
  through the Vercel proxy path rather than directly at Render.
- No rate limiting was found on the backend (no `slowapi` or equivalent). For a public demo with
  two known accounts and no lockout, this means unlimited login attempts are possible. Low
  practical severity (the demo has nothing sensitive to protect and Argon2 is slow enough to limit
  raw brute-force throughput) but worth noting for the readiness report.

## Severity summary

| Finding | Severity | Status |
|---|---|---|
| `JWT_SECRET` may still be the public default on the live deployment | P0 if true, unverified | Needs live-URL check |
| No rate limiting on login | P3 | Not fixed — low practical risk for a demo |
| Direct-to-Render access bypasses security headers | P3 | Not fixed — needs config confirmation |
| CORS mismatch produces an unhelpful generic error | P2 | Root cause understood; error message clarity not yet improved |
