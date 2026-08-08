---
taskId: demo-close-integration
type: minor
scope: integration and demo readiness
---
# Summary

Integrates the seven delivered branches into one verifiable state, verifies it
end to end, and drives both product journeys in a browser. Bumps 4.8.0 → 4.9.0.

Nothing delivered over the previous sessions was on `main`, so the "demo" that
existed was still the tree with a red CI. Integration was the blocking step, not
more code.

Merged, no conflicts: `chore/tooling-dev-loop-speed`,
`fix/assistant-intent-recognition` (carrying `feat/ai-eval-harness`),
`fix/mobile-chat-and-login`, `docs/product-intelligence-skill` (carrying
`refactor/workspace-context-and-case-page` and
`docs/agent-intelligence-rebuild-brief`).

# What integration exposed

**The frontend build was broken and every test suite said otherwise.**
`useCaseEntries.test.tsx` used `as never` casts that vitest accepts — it does not
typecheck — while `tsc -b` rejected them. The build was never re-run after those
tests were added. Fixed by writing each submission with its real type: the casts
were silencing precisely the kind/list mismatch the tests exist to catch.

**The attorney journey silently loses its analysis.** Opening a case as the
attorney produces a reproducible `HTTP 404` on `POST /api/v1/bankruptcy/analyze`
— eight in one journey run. So the attorney sees no cash flow, no debt
composition, no missing items: the entire professional-review half of §20's
required hierarchy.

Root cause, traced: `CaseAccessService.authorize_for_submission` creates a
missing case only when the caller is its owning *client*; an attorney gets 404,
which is correct — an attorney must not be able to conjure a case. But the demo
cases are seeded **in the browser**
(`BankruptcyWorkspaceContext.seedState()`), so a case only reaches the database
after its own client has analyzed it. `case-miguel-demo` belongs to a client
nobody logs in as, so it never exists server-side.

And the two seeds never agreed anyway: the server seeded
`case-demo-elena-rivera` while the UI seeds `case-elena-demo` and
`case-miguel-demo`. Two demo fixtures, two identifier vocabularies, no shared
source of truth.

`DEMO_CASE_ID` is now `case-elena-demo`. It is referenced by name in all six of
its call sites, so the value change is one line. That makes the server's rich
fixture — household, incomes, expenses, debts, assets, timeline, notes, tasks —
the case the demo actually displays, instead of dead data behind a bare snapshot
built from `localStorage` on first analyze.

**It does not fix the attorney case.** `case-miguel-demo` still has no
server-side fixture, so its 404 stands. That is the remaining blocker.

# User-visible behavior

Everything the seven branches delivered, now in one tree: the assistant
recognizes eligibility and filing questions in both languages, the case timeline
is bilingual, the login form is above the fold on a phone, the assistant sheet
has one header.

# Tests and evidence

Automated, on the integrated tree:

| Check | Result |
| --- | --- |
| `uv lock --check` | pass |
| `ruff check .` | pass |
| `mypy app` | pass, 69 files |
| `pytest` | **277 passed** |
| `i18n:check` | pass, 14 module files |
| `eslint` | 0 errors, 6 warnings |
| `vitest --run` | **121 passed**, 18 files |
| `tsc -b && vite build` | pass |
| `agent:validate` | pass |

Browser, driven against the integrated tree (verified serving it by checking the
served module for `useCaseStageNavigation` before measuring):

- **Client journey** — login → dashboard → case → all ten sections render
  (overview, household, income, expenses, debts, assets, documents, tasks,
  submitted, activity) → assistant. Zero console or network errors.
- **Assistant** — *"¿Debo declararme en bancarrota?"* is answered as an
  eligibility question, not with document boilerplate. The fix verified in
  `tests/evals` now verified in the product.
- **Attorney journey** — login → queue → case → attorney-review renders, with
  the analyze 404 above.
- **Responsive** — no horizontal overflow at 320, 390, 768, 1024 or 1440.
- **English session** — case workspace shows 2 Spanish markers, within noise.

One earlier finding did **not** reproduce and is recorded as a harness artifact,
not a defect: a CORS failure on `analyze` in the first run. The preflight returns
correct headers, `analyze` returns 200 against a live token, and the second run
was clean — it was a startup race in the test harness.

# Risks / limitations

**NOT READY, one blocker: the attorney's demo case has no server-side fixture.**
Reproduce: fresh database, log in as attorney, open the case from the queue —
`POST /api/v1/bankruptcy/analyze` returns 404 and the review workspace renders
without figures. The fix is a second seeded case (`case-miguel-demo`) with its
own client owner in `app/repositories/seed.py`, roughly a 70-line fixture
mirroring the existing one, plus a third demo account. It was scoped and
deliberately not started here rather than left half-built.

**The deeper problem it exposes is that demo data has two homes.** Aligning one
constant removes today's symptom for the client case; it does not stop the two
seeds drifting again. A single declared set of demo case identifiers, asserted by
a check, is the durable fix.

**`seed_demo_data_on_startup` defaults to `false`,** deliberately — its comment
explains that an implicit default could arm itself against a real database. So
even a correct seed only reaches a demo deployment that sets it. That is a
deployment decision, left as-is.

**No E2E run in this pass.** Playwright's suite was not executed; the journeys
were driven directly instead, which covers the same routes but is not the
committed suite.
