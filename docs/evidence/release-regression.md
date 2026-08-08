# Release regression — Glade Demo

One integration tree, `integration/demo-close`. Every gate below was run from that tree
after all Phase 1 work was committed, not from a mix of branches.

## Source of the run

| | |
|---|---|
| Branch | `integration/demo-close` |
| Base | `main` |
| Version | **4.10.1** |

## Gates

| Gate | Command | Result |
|---|---|---|
| Backend lint | `uv run ruff check .` | pass |
| Backend typecheck | `uv run mypy app` | pass — 71 source files |
| Backend tests | `uv run pytest` | **355 passed** |
| Frontend lint | `npm run lint` | **0 errors**, 6 warnings (all pre-existing) |
| Frontend tests | `npm run test -- --run` | **132 passed**, 19 files |
| Frontend build | `npm run build` | pass — `tsc -b` clean, 464 modules |
| Frontend i18n | `npm run i18n:check` | pass — 14 module files, keys/placeholders/values |
| Contracts | `npm run contracts:generate` | pass — regenerates with **no drift** |
| Governance | `npm run agent:validate` | pass — architecture + Flowbite checks |
| E2E | `npx playwright test` | **95 passed**, 0 failed (2.3m) |

Test totals moved 333 → 355 backend and 121 → 132 frontend across this close-out.

## What automation could not see

One release defect was found by looking at the running product, not by any suite: the
client's demo case reported **100% complete** with an empty missing list, so the
assistant's flagship question had no answer. Every suite asserts the completion score is
*visible*; none asserts what it says. It took a screenshot.

That is the argument for the visual pass being a real step rather than a formality. The
walkthrough captured both journeys at 390 and 1440 in Spanish, plus login in English, and
this is what it caught.

## The first E2E run was invalid, and why that is recorded here

The first attempt reported 92 passed / 3 failed, the three being the login geometry gate
(submit at 1104px against an 844px fold). That result described **another checkout's
code**.

`reuseExistingServer: !process.env.CI` makes a local run adopt whatever already answers
on the port, and eight checkouts are live in this repository. Fetching
`/src/pages/LoginPage.tsx` from the server under test settled it: `heroBadge` appeared at
index 6753, *before* `login.title` at 10719, and neither `CheckboxField` nor `IconButton`
was present. That is the pre-refactor layout whose own code comment describes "roughly
400px of marketing before the first field" — which is exactly the 260px overshoot the
gate reported.

Re-run with `CI=1` (reuse off) on ports verified free, after confirming the server served
this tree — `login.title` at 9002 *before* `heroBadge` at 17853, `CheckboxField` and
`IconButton` both present. **95 passed, 0 failed.**

Worth stating plainly: the invalid run failed toward a *false negative* here, but the
same mechanism just as easily produces a false green. Any future release regression must
run with reuse disabled. Recorded in `docs/POST-DEMO-BACKLOG.md`.

## Journeys exercised

Both release journeys are driven through the running application, not inspected:

- `matter-workflow.spec.ts` — the client's full 10-step preparation flow, the attorney's
  full 9-step review flow, and the client flow on a mobile viewport.
- `responsive-overflow.spec.ts` — both journeys at 320/360/375/390/412/430/768/1024/1440,
  including every case stage, the entry modal, the assistant drawer and the three attorney
  action modals; plus the mobile shell contract (sidebar reserves no width, bottom nav is
  the only nav and is thumb-reachable, desktop restores the sidebar).
- `shell-overlays-language.spec.ts` — switching to English leaves no Spanish copy behind
  and the Spanish UI carries no English copy, the generated attorney summary is in the
  active language, an explicit choice survives a reload, and the assistant is reachable
  on a phone.
- `governed-viewports.spec.ts` — sidebar collapse persistence and the login geometry gate
  at every governed width, in both languages.

## What the suites establish

The parts worth naming, because a count does not say what was proved:

- **The agentic path runs for real.** Only the provider is faked; the orchestrator,
  specialist selection, tool registry, `CaseTools`, `PortfolioTools`, authorization,
  context builder, schema validation and guardrails all execute. The fake reads the
  tools it is offered and refuses to produce a final answer before a data tool has run,
  so it cannot report success against a runtime that stopped calling tools.
- **Four two-turn conversations** covering both roles, both locales and both assistant
  scopes, each asserting that turn two was given turn one.
- **Document intelligence over HTTP**, from `documents.analyze` to an answer, asserted
  at the model rather than at the index, with a negative control and a cross-case
  isolation test whose attacker is an authorized attorney.
- **The demo fixture itself** — exactly one urgent case, exactly one waiting on its
  client, evidence retrievable per case, re-seeding not stacking duplicates.

## Not verified here

**Live AI provider.** No OpenAI-compatible credential exists in the environment, the
shell, or any config file; `AI_PROVIDER` is `rule_based`. Phase 6 cannot run. Everything
up to the provider boundary is verified, and `test_agent_wiring_integration.py` pins the
adapter wiring (base URL switches to chat-completions, `max_tokens` spelling, missing key
degrades rather than crashes) — so what remains untested is the round trip to a real
model, not the code that makes it.

**Deployment smoke tests.** Phase 7 requires a deployment target and its credentials.
