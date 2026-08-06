# 07 — Test Results

All results below are from this session, run against `main` (v3.1.0) locally. None are asserted from
memory or from CI — each command was actually executed and its output read.

## Backend

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `uv run pytest -q` | **55 passed, 0 failed** |
| Lint | `uv run ruff check .` | **All checks passed** |
| Type check | `uv run mypy app` | **Success: no issues found in 46 source files** |

Test breakdown by file: `test_ai_health.py` (1), `test_ai_providers.py` (9), `test_api_contracts.py`
(2), `test_auth.py` (3), `test_bankruptcy.py` (6), `test_case_context_builder.py` (5),
`test_document_pipeline.py` (17), `test_documents_router.py` (4), `test_guardrails.py` (5),
`test_health.py` (1), `test_production_dependencies.py` (2).

**9 of these tests were found failing at the start of this session** (`test_ai_providers.py` ×4,
`test_case_context_builder.py` ×5) due to a `CaseContextBuilder.build()` signature change
(new required `locale` parameter) that production code had been updated for but these two test
files hadn't. Fixed by adding the missing argument at each call site — see commit
`feat(i18n): add bilingual i18next system across frontend and backend`.

## Frontend

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` (tsc -b + vite build) | **Success**, 9.5–14s, one bundle-size warning (758 KB / 228 KB gzip single chunk — see `05-architecture-audit.md`) |
| Lint | `npm run lint` (eslint) | **0 errors, 6 warnings** (pre-existing `react-hooks/exhaustive-deps` and `react-refresh/only-export-components` warnings, not introduced this session) |
| i18n key-parity check | `npm run i18n:check` | **Locale validation passed for 13 module files** |
| Unit tests | `npx vitest run` | **27 passed, 0 failed** (9 test files) |

**8 of the 27 unit tests were found failing at the start of this session**
(`ChatBubble.test.tsx` ×3, `ChatComposer.test.tsx` ×2, `CaseActionBar.test.tsx` ×3) due to the
i18next singleton never being initialized in the Vitest environment, and `ChatBubble` requiring a
`LanguageProvider` its test didn't provide. Fixed by initializing i18next globally in
`test/setup.ts` and wrapping `ChatBubble`'s tests in `AuthProvider`+`LanguageProvider` with a pinned
test locale (jsdom's `navigator.language` defaults to `en-US`, which would otherwise silently make
assertions against Spanish text fail).

## End-to-end (Playwright)

| Check | Command | Result |
|---|---|---|
| Full suite, 3 consecutive runs | `npx playwright test` | **3/3 passed, all 3 runs** (client 10-step flow, attorney 9-step flow, mobile-viewport client flow) |

**All 3 e2e specs were found failing at the start of this session**, for four independent reasons,
diagnosed and fixed in sequence:
1. Stale dev servers left running from an earlier local session were reused by Playwright's
   `reuseExistingServer` instead of booting fresh ones with the correct `CORS_ORIGINS`/test DB env
   vars — not a code bug, an environment conflict. Fixed by killing the stale processes.
2. No explicit Playwright browser `locale` was set, so it defaulted to `en-US`; combined with this
   session's new language auto-detection, the whole app rendered in English while the spec asserted
   Spanish text. Fixed by pinning `locale: "es-PR"` in `playwright.config.ts`.
3. The spec itself was stale against the v3.0.0 client-dashboard rebuild — asserted a "Continuar
   expediente" button and a "Revisar" action that no longer exist, and a literal `"requested"`
   status string where the UI now shows a translated "Solicitado" badge. Rewrote the spec against
   the actual current UI, verified interactively via Playwright before committing to selectors.
4. A timing-sensitive tab-transition issue (see `05-architecture-audit.md` finding #2) intermittently
   blocked a click during the client flow. The spec was made robust against it with explicit
   visibility waits for both the outgoing and incoming tab panels.

## What full-repo automated coverage does *not* include

- No axe/Lighthouse accessibility or performance scan was run against a live instance.
- No load/concurrency testing.
- No test exercises the optional Ollama or Transformers AI providers against a real model — only
  the deterministic rule-based provider and monkeypatched provider-selection logic are covered.
- The deployed instance (Vercel/Render) has not been tested at all — see `02-deployment-audit.md`.
