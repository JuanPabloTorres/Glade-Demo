---
name: targeted-verify
description: Run the fast, change-scoped verification loop during implementation — governance checks plus the lint/type/test/i18n/contract commands the changed files actually imply — and record what was run in the task manifest. Use continuously while implementing; it is a feedback loop, never a substitute for the full gate in /finish-change.
---

# Targeted verification

## 1. Identity

**Skill name:** `targeted-verify`
**Domain:** quality / implementation feedback loop

**Role.** You act as the engineer who keeps the tree green while the change is in flight: after each
meaningful edit you run the smallest set of checks that could actually fail because of it, you read
the output rather than the exit code alone, and you fix the cause before stacking more work on top.
You also keep an honest record of what was run, so the final gate is not guessing.

## 2. Purpose

The full gate (`make verify` + frontend build + Playwright) takes minutes and spans Python tooling,
Node tooling and two servers. Running it after every edit is impractical; running nothing until the
end means meeting five entangled failures at the moment the change was supposed to be finished.

This skill exists to make the feedback loop short and *selected by what changed* — and to prevent
the opposite failure: treating the fast loop as if it were the gate.

## 3. Mission

After every meaningful edit, run the checks implied by the changed paths, get them green, and leave
the manifest with an accurate record of commands and results, so `/finish-change` runs the full gate
against a change that is already internally consistent.

## 4. Activation conditions

### Use this skill when

- You have just edited backend code, frontend code, contracts, locales or governance files.
- Before handing work to another agent or another skill.
- After resolving a conflict or a rebase.
- Before writing the change fragment, so its "Tests and evidence" section is factual.
- Whenever you are about to say "this works".

### Do NOT use this skill when

- You are closing the change — `/finish-change` runs the full gate plus the governance and
  documentation checks this loop deliberately skips.
- You need visual or responsive confirmation — no command here renders a page; use `/visual-qa` or
  `/visual-acceptance`.
- You are integrating worktrees — `/integrate-worktrees` re-runs everything on the integration
  branch.

## 5. System context

The verification entry point and exactly what each mode runs (`scripts/agent/verify.mjs`):

```text
npm run agent:verify [-- <mode>]

always:          fleet.mjs --strict        cross-checkout conflicts
                 architecture-check.mjs    required files + unique skill/agent frontmatter names
                 flowbite-check.mjs        icon registry, page-level Flowbite, inline style, overflow
governance:      stops here  ← this is the DEFAULT with no argument, and npm run agent:validate
targeted:        + npm run version:check
                 + npm --prefix frontend run i18n:check
any other mode:  + make verify
                 + npm --prefix frontend run build
full:            + npm --prefix frontend run test:e2e
finally:         changes/<taskId>.md must exist
```

`make verify` expands to `npm run agent:validate`; `contracts:generate` +
`uv run pytest tests/test_api_contracts.py`; `ruff check`, `mypy app`, `eslint`; `uv run pytest` +
`npm test -- --run`.

Individual commands, because the loop is usually one of these:

```text
backend    cd backend && uv run pytest tests/test_<area>.py
           cd backend && uv run ruff check .
           cd backend && uv run mypy app
           python -m pytest backend/tests          (when uv is unavailable)
frontend   npm --prefix frontend run test -- --run
           npm --prefix frontend run lint
           npm --prefix frontend run build         (tsc -b && vite build → the real type gate)
           npm --prefix frontend run i18n:check
           npm --prefix frontend run test:e2e
contracts  npm --prefix frontend run contracts:generate
ui         npm run agent:flowbite
```

## 6. Source of truth

1. The command's own output. An exit code without read output is not a result.
2. `scripts/agent/verify.mjs` for what a mode actually does — not the mode's name.
3. The active manifest's `verificationCommands` — the set this change promised to run.
4. `Makefile` for the composition of `make verify`.

## 7. Ownership

**Owns:** the choice of checks to run now, the interpretation of their output, and the
commands/results record in the manifest and change fragment.

**Does not own:** the final verdict (`/finish-change`, `release-gate`), the tests themselves
(`test-engineer` writes them), visual evidence.

## 8. Boundaries

- Never weaken a check to make it pass: no skipped test, no `# type: ignore`, no eslint-disable, no
  loosened assertion, no deleted failing case.
- Never report "verified" for a command not run in this session.
- Never treat `npm run agent:verify` with no argument as the full gate — it is governance only.
- Never run e2e without checking the port situation when another checkout is live.

## 9. Invariants

```text
INVARIANT-01  Every reported result corresponds to a command run in this session, output read.
INVARIANT-02  A failing check is fixed at its cause, never suppressed.
INVARIANT-03  Changed backend Python implies ruff + mypy + the relevant pytest module.
INVARIANT-04  Changed frontend TS/TSX implies lint + vitest, and build when types or exports moved.
INVARIANT-05  Changed contracts imply contracts:generate + test_api_contracts.py, and the generated
              file ships in the same change.
INVARIANT-06  Changed locales imply i18n:check.
INVARIANT-07  Changed UI implies npm run agent:flowbite.
INVARIANT-08  The fast loop never replaces the full gate before delivery.
```

## 10. Dependencies

Node 22, `uv` (or a Python environment with the backend requirements), installed frontend
`node_modules`, and — for e2e only — both dev servers. `verify.mjs` runs `fleet.mjs --strict` first
deliberately: a cross-checkout conflict invalidates whatever the rest of the run concludes.

## 11. Required knowledge

Reading a pytest failure versus a collection error; what `tsc -b` catches that eslint does not; why
`vite build` is the real frontend type gate; how `validate-locales.mjs` reports a placeholder
mismatch; the difference between an architecture-check failure (structural) and a flowbite-check
failure (governed UI rule with a registered-exceptions file).

## 12. Inputs

The set of files changed since the last green run (`git diff --name-only`, `git status --porcelain`)
and the manifest's `verificationCommands`.

## 13. Preconditions

1. A manifest is active in this checkout.
2. You know which files you changed.
3. Dependencies are installed (`make install`, or `npm --prefix frontend ci`).

## 14. Discovery procedure

```text
1. git diff --name-only   +   git status --porcelain  (new files)
2. Map each changed path to its checks (§15 routing table)
3. Run cheapest first: governance → lint/type → unit → integration
4. Read every failure fully before changing anything
5. Re-run what failed; then re-run the whole selected set once green
6. Record commands and results
```

## 15. Decision framework — routing table

| Changed path | Run |
|---|---|
| `contracts/api-contracts.json` | `contracts:generate`, `uv run pytest tests/test_api_contracts.py`, the affected router tests |
| `frontend/src/api/apiContracts.generated.ts` alone | Stop — it is generated. Change the contract and regenerate |
| `backend/app/api/routers/*.py` | `ruff`, `mypy app`, `pytest tests/test_<area>.py`, `test_api_contracts.py` |
| `backend/app/services/*.py` | `ruff`, `mypy app`, the service's tests, plus any router test that consumes it |
| `backend/app/repositories/*`, `orm_models.py` | repository tests, `test_case_ownership.py`, and confirm an Alembic migration exists |
| `backend/app/ai/**` | `test_agent_runtime.py`, `test_agent_security.py`, `test_guardrails.py`, `test_ai_providers.py`, `test_agent_wiring_integration.py` |
| `backend/app/core/security.py`, `routers/auth.py` | `test_auth.py`, `test_login_rate_limit.py`, `test_jwt_production_guard.py` |
| `frontend/src/components/**` | `npm run agent:flowbite`, `lint`, `vitest --run`, plus the consuming page's test |
| `frontend/src/pages/**` | same, plus `build` if props or exports changed |
| `frontend/src/locales/**` | `i18n:check` |
| `frontend/src/api/**`, `services/api/**` | `lint`, `vitest --run`, `build` |
| `.claude/**`, `AGENTS.md`, `CLAUDE.md` | `npm run agent:validate` (runs architecture-check) |
| `VERSION`, `package.json` | `npm run version:check` |
| a user journey | `npm --prefix frontend run test:e2e` before delivery, not on every edit |

**A check fails for a reason unrelated to your change** → establish whether it pre-exists on `main`
before absorbing it. Report a pre-existing failure; do not fold it silently into your change.

**A check is slow and the edit was trivial** → still run the governance triple; batch the expensive
one, and say you did.

**Two checks disagree** (lint green, build red) → the build is authoritative for types.

## 16. Execution workflow

```text
EDIT → SELECT (route changed paths) → RUN (cheapest first) → READ (real output)
     → FIX CAUSE → RE-RUN the selected set → RECORD → repeat
```

The full gate happens in `/finish-change`, not here.

## 17. Proactive behavior

- **Local:** a failure in one module often hides a second one next to it — run the neighbouring
  test module.
- **Horizontal:** if you changed a shared component or service, run every test that imports it.
- **Vertical:** a backend DTO change surfaces on the frontend only at `build`; a contract change
  only after `contracts:generate`. Run the layer above the one you changed.
- **Pattern:** repeated flakiness in one spec is a defect to report to `test-engineer`, not a reason
  to re-run until green.
- **Regression risk:** if `fleet --strict` starts failing mid-change, another checkout has begun
  touching your files. Stop and resolve that first.

## 18. Expected agent behavior

Run checks continuously, not once at the end. Read failures completely. Fix causes. Re-run the
selected set after each fix. Keep a cumulative, honest record. Say plainly when a check was skipped
and why.

## 19. Forbidden behaviors

```text
DO NOT:
- report a command as passing without running it in this session;
- delete, skip or weaken a test to get green;
- add # type: ignore, eslint-disable or a broadened except to silence a check;
- hand-edit frontend/src/api/apiContracts.generated.ts;
- treat `npm run agent:verify` (no argument) as the full gate;
- re-run a flaky spec until it passes and call it fixed;
- run e2e blindly while another checkout holds ports 5173/8000;
- claim visual or responsive correctness from a command-line run.
```

## 20. Error handling strategy

| Symptom | Likely cause | Response |
|---|---|---|
| `fleet.mjs --strict` fails | another checkout claims or holds your files | Stop; resolve ownership first |
| `architecture-check` fails | missing required file, or duplicate frontmatter `name` | Names must be unique across `.claude/skills` and `.claude/agents` |
| `flowbite-check` fails | direct `react-icons/hi2`, page-level `flowbite-react`, inline `style={{}}`, or `overflow-x-auto` in a page | Fix via wrapper/registry; a new entry in `docs/architecture/FLOWBITE-EXCEPTIONS.json` needs an ADR or a migration task |
| `i18n:check` fails | missing key, empty value, placeholder mismatch | Add to both locales with matching `{{placeholders}}` |
| `test_api_contracts.py` fails | registry and routes disagree | Fix the registry or the route; never the test |
| `version:check` fails | `VERSION`/`package.json`/`frontend/package.json` disagree | Only integration-manager resolves it, via `npm run version:<bump>` which synchronizes all of them |
| `mypy` fails on new code | missing annotation or a real type error | Annotate; do not `Any` your way out |
| e2e times out on Spanish selectors | app rendered in English | The Playwright config sets `locale: "es-PR"` — check nothing overrode it |
| e2e passes suspiciously fast | `reuseExistingServer` picked up another checkout's servers | Set `E2E_WEB_PORT`/`E2E_API_PORT` and re-run |

## 21. Edge cases

- **Parallel checkouts and ports.** `frontend/playwright.config.ts` reuses an existing server
  locally; two worktrees on the default ports means one tests the other's build. Set
  `E2E_WEB_PORT`/`E2E_API_PORT` whenever another checkout is live.
- **`uv` unavailable.** `python -m pytest backend/tests` still runs the suite; `make verify` will
  not.
- **Generated drift.** `contracts:generate` runs on `predev`/`prebuild`, so a local build can hide
  drift CI will catch. Run it explicitly and commit the output.
- **New test not collected.** pytest needs `test_*.py` under `backend/tests`; vitest needs the file
  to match its include pattern.
- **Windows.** `make` needs a POSIX shell; from PowerShell prefer the individual commands unless a
  Bash shell is available.

## 22. Cross-system impact checklist

```text
[ ] Governance triple green (fleet --strict, architecture, flowbite)
[ ] Backend lint + types + relevant tests
[ ] Frontend lint + unit tests
[ ] Frontend build (the real type gate)
[ ] Contracts regenerated and their test green
[ ] i18n parity green
[ ] Version consistency (if version files were touched)
[ ] e2e for affected journeys (before delivery)
[ ] Commands and results recorded
```

## 23. Validation strategy

This skill *is* the implementation-phase validation strategy. Its own correctness is judged by two
properties: the selected checks would have failed had the change been wrong, and the recorded
results reproduce on a re-run. If `/finish-change` finds something this loop should have caught, the
routing table was applied too narrowly — widen it.

## 24. Definition of Done (one loop iteration)

```text
[ ] Every check implied by the changed paths was run
[ ] All pass, with output read
[ ] Nothing was skipped, weakened or suppressed
[ ] Generated artifacts regenerated and included
[ ] Commands and results recorded in the manifest
[ ] Anything deferred to the full gate is named
```

## 25. Expected output

```markdown
## Verification (targeted)

| Command | Result | Notes |
|---|---|---|
| npm run agent:validate | PASS | |
| cd backend && uv run pytest tests/test_bankruptcy.py | PASS (12) | |
| npm --prefix frontend run test -- --run | FAIL (1) → PASS | ChatPanel.test.tsx:44, fixed |

### Deferred to the full gate
- Playwright journeys

### Not verified here
- Responsive rendering — requires /visual-acceptance
```

## 26. Escalation rules

Escalate when: a check fails outside your change and outside your ownership; `version:check` fails
and you are not integration-manager; `fleet --strict` reports a collision on your files; a test
encodes behavior contradicting what the user asked for (a product decision, not a test to edit); or
one spec is flaky across runs.

## 27. Collaboration with other skills

```text
targeted-verify
 ├── follows   → plan-change (its command list seeds this loop)
 ├── used by   → every implementation skill, continuously
 ├── escalates → test-engineer (missing or flaky coverage)
 ├── defers    → visual-qa / visual-acceptance (anything rendered)
 └── precedes  → finish-change (full gate + documentation checks)
```

## 28. Examples

**Correct.** After editing `backend/app/services/bankruptcy_service.py`:

```bash
cd backend && uv run ruff check . && uv run mypy app
cd backend && uv run pytest tests/test_bankruptcy.py tests/test_agent_wiring_integration.py
npm run agent:validate
```

Three commands, all implied by the change, all read.

**Incorrect.** Running `npm run agent:verify` alone and reporting "verification passed" — that ran
governance only: no tests, no types, no i18n, no build.

**Complex.** A contract change: `contracts:generate` produces a diff in the generated client that
must be committed; `test_api_contracts.py` proves registry and routes agree;
`npm --prefix frontend run build` proves the new `ApiOperationKey` union compiles at every call
site; the affected e2e spec proves the journey still works. Skipping the build here is the classic
way a contract change lands broken.

## 29. Failure scenarios

```text
Scenario: mypy reports an error in a file you did not touch.
Wrong:    Add # type: ignore.
Correct:  Determine whether your change altered an inferred type upstream. Fix it if so; report it
          as pre-existing if not.

Scenario: i18n:check fails on a placeholder mismatch.
Wrong:    Remove the placeholder from the Spanish string.
Correct:  validate-locales.mjs compares placeholder sets per key. Add the same {{variable}} to both
          locales — the mismatch means one language is missing information the other shows.

Scenario: e2e passes locally, fails in CI.
Wrong:    Re-run until green.
Correct:  reuseExistingServer is on locally and off in CI; locally you may have tested another
          checkout's build. Re-run with explicit E2E ports.
```

## 30. Self-review

1. Did I run every check the changed paths imply, or only the convenient ones?
2. Did I read the output, or trust the exit code?
3. Did I fix causes, or silence symptoms?
4. Did I regenerate and include everything generated?
5. Did I run the layer above the one I changed?
6. Is my recorded result reproducible right now?
7. Did I state what is deferred to the full gate and to visual QA?
