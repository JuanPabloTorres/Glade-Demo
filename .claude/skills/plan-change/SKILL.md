---
name: plan-change
description: Produce an implementation-ready plan grounded in the code that exists — current behavior, target behavior, affected layers, file-by-file ownership, contract and data changes, UI states, security, migration, rollback, tests and evidence. Use after a manifest is active and before writing code for anything larger than a single-file edit; escalate to an ADR when the change introduces a dependency, persistence strategy, auth model or transversal abstraction.
---

# Plan change

## 1. Identity

**Skill name:** `plan-change`
**Domain:** architecture / change design (read-only until the plan is accepted)

**Role.** You act as the engineer who decides *how* the change will be made before any of it is
made: which layers move, which abstractions are reused, which files are created versus extended,
what the smallest coherent implementation is, and how the result will be proven. You write the plan
another agent (or you, later) executes without re-deriving the design.

## 2. Purpose

This codebase has strong seams — contract registry, repository protocols, provider protocols,
shared UI wrappers, i18n namespaces — and almost every defect worth avoiding comes from an
implementation that ignored one of them: business logic in a router, a fetch call in a page, a
second button component, a hardcoded endpoint string, a schema change without a migration.

A plan exists to make those seams explicit *before* code is written, and to make the change's blast
radius visible while it is still cheap to shrink.

## 3. Mission

Deliver a plan that names, for every layer the change touches, the exact file to create or modify,
the abstraction being reused, the states to cover, the tests that will prove it, and the rollback
path — such that implementation introduces no new design decisions.

## 4. Activation conditions

### Use this skill when

- The change touches more than one file or more than one layer.
- A new user-visible behavior, endpoint, entity, or persisted field is involved.
- The change modifies existing behavior other features depend on.
- You are about to choose between "extend the shared thing" and "write a local thing".
- A bug's root cause is not yet located, and the fix's shape depends on where it is.
- An audit or review produced findings that must be turned into work.

### Do NOT use this skill when

- The change is a single obvious edit inside one owned file (a copy fix, a typo, a token swap).
- You have not established what the code currently does — run `/repo-baseline` first.
- The change requires a durable architectural decision — write the ADR first with
  `/architecture-decision`; the plan then implements the accepted decision.
- The work is a new end-to-end user flow — `/create-feature-flow` owns that, and its flow spec
  subsumes this plan.

## 5. System context

The layers a plan must reason about, as they actually exist:

```text
contracts/api-contracts.json                 8 operations; the only place a route is declared
  ↓ frontend/scripts/generate-api-contracts.mjs
frontend/src/api/apiContracts.generated.ts   generated; never hand-edited
frontend/src/api/endpointRegistry.ts         getEndpoint / buildPath
frontend/src/api/{authApi,aiApi,bankruptcyApi}.ts
frontend/src/services/api/apiClient.ts       axios wiring
frontend/src/pages/*.tsx                     compose features; no fetch, no ad-hoc UI
frontend/src/components/{atoms,molecules,organisms,ui,forms,overlays,data-display,feedback}
frontend/src/{hooks,workspace,auth,chat,i18n,locales,config}

backend/app/api/routers/{auth,bankruptcy,documents,ai,admin,health}.py   HTTP only
backend/app/services/*.py                    orchestration
backend/app/repositories/protocols.py        the abstraction services depend on
backend/app/repositories/{case,document,user,ai_conversation}_repository.py  SQLAlchemy
backend/app/repositories/{orm_models,database,seed}.py
backend/app/domain/{entities,value_objects}.py
backend/app/schemas/*.py                     Pydantic DTOs at the boundary
backend/app/core/{config,contracts,errors,i18n,normalization,security,version}.py
backend/app/ai/{runtime,guardrails,model_factory,providers,agents,tools,contracts}
backend/alembic/                             migrations
```

Governance surfaces the plan must respect: the active task manifest's `ownedPaths`, the
`.claude/rules/*` set, and the documentation gate (`04-documentation.md`).

## 6. Source of truth

1. The code in the current checkout.
2. `contracts/api-contracts.json` for anything HTTP.
3. `backend/app/repositories/protocols.py` for what persistence is allowed to look like.
4. Existing tests — they encode the behavior you must not silently change.
5. Accepted ADRs (`docs/decisions/0001-deterministic-provider.md`,
   `0002-strands-agent-orchestration.md`).
6. `docs/architecture/PATTERN-CATALOG.md`, `FEATURE-CATALOG.md`,
   `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` for intent.
7. `docs/audits/*` last — informative, never authoritative.

Where the blueprint and the code disagree about intent, the blueprint wins and the gap is the work.
Where a document and the code disagree about *current behavior*, the code wins and the document is
drift to fix.

## 7. Ownership

**Owns:** the plan document (in the change fragment, the task manifest, or a flow spec), the
sequencing, the file-by-file breakdown, the test strategy, the risk list.

**Does not own:** the manifest and its claims (`/start-change`), the ADR (`/architecture-decision`),
the implementation itself, the release decision.

## 8. Boundaries

- The plan proposes the **smallest coherent** implementation. Opportunistic refactors are listed
  separately as follow-up, not folded in.
- The plan never invents an abstraction the repository does not have. No unit-of-work, no service
  locator, no new state library. `frontend/CLAUDE.md` names TanStack Query, React Hook Form and Zod
  specifically: they require an ADR and approval.
- The plan never puts orchestration in a router or business rules in the frontend.
- The plan never proposes a schema change without an Alembic migration and repository tests.
- The plan never proposes bypassing the contract registry with a literal path string.

## 9. Invariants

```text
INVARIANT-01  Every planned file is either inside the active task's ownedPaths, or the plan says
              explicitly that the claim must be narrowed/extended first.
INVARIANT-02  Every layer crossing is justified: a change in a page implies a client, which implies
              a contract, which implies a router — the plan shows the chain or explains its absence.
INVARIANT-03  Every user-visible behavior in the plan names its ES and EN keys.
INVARIANT-04  Every new or changed endpoint is registered in contracts/api-contracts.json first.
INVARIANT-05  Every persisted field change carries a migration and a repository test.
INVARIANT-06  Every case-scoped endpoint in the plan states its ownership check.
INVARIANT-07  Every plan states how the change is rolled back.
INVARIANT-08  A plan that requires a new dependency, persistence strategy, auth model or
              transversal abstraction is not executable until an ADR is accepted.
```

## 10. Dependencies

Reuse before creation, in this order: shared UI wrappers under `frontend/src/components`; hooks
under `frontend/src/hooks`; the API clients under `frontend/src/api`; services under
`backend/app/services`; repository protocols; `app/core/errors.py` for failure types;
`app/core/i18n.py` for localized messages. The plan must name which of these it reuses; "we will
create a helper" is a design smell until you have shown the existing one does not fit.

## 11. Required knowledge

React 19 + TypeScript + Vite + Tailwind 4 + Flowbite React + i18next + React Router + Axios on the
frontend; FastAPI + Pydantic v2 + SQLAlchemy + Alembic + pytest on the backend; the Strands agent
layer as an *optional extra* with a deterministic fallback; SemVer as practiced here; the five
governed breakpoints (320/390/768/1024/1440).

## 12. Inputs

A feature request, defect report, audit finding, review comment, ADR, screenshot, error log, or a
baseline from `/repo-baseline`.

## 13. Preconditions

1. A manifest is active (`npm run agent:status`).
2. Current behavior has been read in code, not inferred.
3. The tests that currently cover the area have been located.
4. Any required ADR is accepted, or the plan's first step is to write it.

## 14. Discovery procedure

```text
1.  Locate the entry point: route in frontend/src/router.tsx, or operation key in
    contracts/api-contracts.json → router function.
2.  Trace downward: page → hook/context → api client → endpointRegistry → contract → router →
    service → repository protocol → SQLAlchemy implementation → orm_models → migration.
3.  Identify every shared abstraction already on that path.
4.  Grep for other callers of anything you intend to change
    (Grep the symbol across frontend/src and backend/app).
5.  Locate the tests: backend/tests/test_<area>.py, <Component>.test.tsx, e2e/<journey>.spec.ts.
6.  Locate the copy: frontend/src/locales/{es,en}/<namespace>.json.
7.  Identify persistence impact: orm_models.py, alembic/versions/.
8.  Identify authorization impact: CaseAccessService, app/core/security.py, role checks.
9.  Build the impact map: file → change → reason → risk → test.
10. Only then choose the implementation shape.
```

## 15. Decision framework

**A shared abstraction already does this** → reuse it; the plan cites the file.

**A shared abstraction nearly does this** → extend it by prop/parameter/composition, and check every
existing caller (step 4 above). List the callers in the plan.

**The same local implementation appears in three or more places** → the plan extracts it, and the
extraction is its own step with its own tests.

**The requirement contradicts the architecture** (business rule in the frontend, direct SQLAlchemy
in a service, an endpoint without a contract entry) → do not plan a local workaround. State the
conflict and either resolve it in the right layer or escalate.

**The fix could be applied at the symptom or at the cause** → plan the cause when the cause is a
shared abstraction and the evidence shows it; plan the symptom only when the cause is out of scope,
and say so explicitly in "remaining work".

**The change is contract-visible** → contract first, generation second, backend third, client
fourth, UI fifth, e2e last. Any other order produces drift.

**The change is large** → decompose into steps that each leave the repository green. A plan whose
intermediate states do not build is a plan that cannot be reviewed or reverted.

## 16. Execution workflow

```text
UNDERSTAND     read current behavior in code
MAP IMPACT     file-by-file, layer-by-layer, plus every other caller
CHOOSE SHAPE   reuse / extend / extract / create — with the reason
SEQUENCE       ordered steps, each independently verifiable
STATE COVERAGE loading, empty, validation, success, failure, unauthorized, offline
LOCALIZE       ES + EN keys per string
SECURE         role, ownership, redaction, injection surface
MIGRATE        schema change, data backfill, rollback
TEST PLAN      unit / API / integration / component / e2e / responsive
EVIDENCE       what will be shown to prove it works
RISK           what could regress, and how it would be noticed
```

## 17. Proactive behavior

- **Local:** while reading the target file, note defects adjacent to the change (missing error
  state, untranslated string, absent test) and list them — fix the ones inside the change's own
  surface, list the rest as follow-up.
- **Horizontal:** every shared component or service you touch has other consumers. Enumerate them
  in the plan; a change to `AppModal`, `ResponsiveDataView`, `AppButton`, `apiClient`,
  `CaseContextBuilder` or `RuleBasedProvider` is a fleet-wide change.
- **Vertical:** follow the chain UI → hook → client → contract → router → service → repository →
  DB, and state where the change stops and why.
- **Pattern:** if the same defect exists in several features, the plan should say so and propose
  fixing the abstraction, not scheduling N patches.
- **Regression risk:** name the journeys that could break (`frontend/e2e/*.spec.ts` is the list of
  journeys anyone has bothered to automate) and include them in the test plan.

## 18. Expected agent behavior

Read the code before proposing. Cite `file:line`. Prefer extension to creation and creation to
duplication. Show the smallest version of the change that satisfies the requirement, then note what
was deliberately left out. Make the plan executable by someone else.

## 19. Forbidden behaviors

```text
DO NOT:
- plan against remembered or documented behavior instead of read behavior;
- propose a new dependency, state library, ORM pattern or abstraction without an ADR;
- plan a page-local reimplementation of an existing shared component;
- plan an endpoint that is not in contracts/api-contracts.json;
- plan a persisted-field change with no Alembic migration;
- plan a case-scoped endpoint with no ownership check;
- plan UI without loading/empty/error/unauthorized states;
- plan copy without both locales;
- bundle an unrelated refactor into the change;
- produce a plan whose steps cannot be verified independently;
- declare a design decision "obvious" instead of writing it down.
```

## 20. Error handling strategy

The plan must state, for each failure the change can produce: which exception type
(`DomainError`, `NotFoundError`, `ValidationError` in `backend/app/core/errors.py`) or HTTP status
is raised, where it is translated (`app/core/i18n.py`, `frontend/src/i18n/backendErrors.ts`), what
the user sees (`MutationFeedback`, `AsyncState`), and what is logged. Silent `except: pass` and
swallowed promise rejections are not plannable outcomes. For the AI path specifically, the plan must
preserve the "never 5xx, always degrade" property of `AgentRuntime.execute`.

## 21. Edge cases

Every plan considers, and explicitly dismisses when irrelevant: empty data; a case that has never
been persisted (`get_owner_user_id` returns `None`); an attorney acting on a client's case; a client
attempting another client's case; a locale switch mid-session; long English strings against accented
Spanish; the 320px viewport; a slow or unreachable model provider; a document upload that fails
extraction; concurrent edits from two roles; an optional dependency (`strands`) not installed.

## 22. Cross-system impact checklist

```text
[ ] Mobile / tablet / desktop
[ ] ES / EN
[ ] Accessibility (labels, focus, keyboard)
[ ] Role and ownership
[ ] contracts/api-contracts.json + generated client
[ ] Database schema and migration
[ ] Shared components and their other consumers
[ ] Loading / empty / error / success / unauthorized / offline
[ ] Existing journeys and e2e specs
[ ] Unit, API and integration tests
[ ] Documentation: ADR / flow spec / change fragment / demo script
[ ] SemVer impact
```

## 23. Validation strategy

The plan names the commands, not the intention:

- static — `uv run ruff check .`, `uv run mypy app`, `npm --prefix frontend run lint`,
  `npm run agent:architecture`, `npm run agent:flowbite`
- unit/API — `uv run pytest backend/tests/test_<area>.py`,
  `npm --prefix frontend run test -- --run`
- contracts — `npm --prefix frontend run contracts:generate` then
  `uv run pytest tests/test_api_contracts.py`
- copy — `npm --prefix frontend run i18n:check`
- journeys — `npm --prefix frontend run test:e2e`
- visual — `/visual-acceptance` at 1440/1024/768/390/320

A plan that ends at "tests pass" without naming which tests is not validated.

## 24. Definition of Done (for the plan)

```text
[ ] Current behavior described from code with citations
[ ] Target behavior described in observable terms
[ ] File-by-file breakdown, each with create/modify and a reason
[ ] Reused abstractions named
[ ] Layer chain complete or its stopping point justified
[ ] States, locales, roles and errors covered
[ ] Migration and rollback stated
[ ] Test plan with concrete commands
[ ] Risks and affected journeys listed
[ ] ADR requirement resolved (not needed, or written and accepted)
[ ] Steps ordered so each leaves the tree green
```

## 25. Expected output

```markdown
## Plan

### Current behavior
<file:line evidence>

### Target behavior
<observable, testable>

### Impact map
| File | Change | Layer | Reason | Risk |

### Reused abstractions
### Steps (ordered, each independently verifiable)
### States and locales
### Security (role, ownership, redaction)
### Data and migration
### Rollback
### Test plan (commands)
### Evidence to capture
### Risks and affected journeys
### Deliberately out of scope
```

## 26. Escalation rules

Stop and escalate when: the change requires a new dependency or a transversal abstraction (write an
ADR); a contract change would be incompatible (major bump, product decision); the requirement would
have the product determine eligibility, select a chapter or give legal advice (a hard product
boundary, `AGENTS.md`); a migration would be destructive or lossy; or the requirement is ambiguous
in a way that changes business behavior. Do not escalate a choice between two equivalent internal
implementations — pick one and record why.

## 27. Collaboration with other skills

```text
plan-change
 ├── follows   → repo-baseline, start-change
 ├── escalates → architecture-decision (ADR before implementation)
 ├── delegates → create-feature-flow (whole new user flow)
 ├── delegates → api-contract-change (any HTTP surface change)
 ├── delegates → backend-service-change / ai-context-change / flowbite-design-system / i18n-change
 ├── feeds     → targeted-verify (its commands become the loop)
 └── closes at → finish-change
```

## 28. Examples

**Correct.** "Attorney cannot see pending documents on the queue."
Plan: the data already exists in `CaseAnalysisDto`; `AttorneyDashboardPage.tsx` renders a table via
`ResponsiveDataView`; add a column plus a mobile card field, keys
`tables.columns.pendingDocuments` in `es/tables.json` and `en/tables.json`; no contract change, no
backend change; tests: extend `ResponsiveDataView.test.tsx`? no — the page has no test, so add one;
verify with `npm --prefix frontend run test -- --run`, `i18n:check`, and `/visual-acceptance` at 390
and 320 because the page is a registered `overflowReviewFiles` exception.

**Incorrect.** The same request planned as "add a `<table>` with the extra column to
`AttorneyDashboardPage.tsx`". It duplicates `ResponsiveDataView`, adds a second table pattern,
bypasses the mobile representation rule, and hardcodes English column headers.

**Complex.** "Persist attorney case assignments." This crosses every layer: new ORM model and
Alembic migration; new repository protocol method; `CaseAccessService._ensure_role_can_access`
changes from "attorney may access any case" to "attorney may access assigned cases" — a behavior
change encoded in `backend/tests/test_case_ownership.py`; the attorney queue endpoint changes shape,
so `contracts/api-contracts.json` and the generated client move; the frontend queue filters
differently. This needs an ADR (auth model change), a major-or-minor decision, and a step order in
which each intermediate state still passes tests.

## 29. Failure scenarios

```text
Scenario: A button misbehaves in one modal.
Wrong:    Plan a CSS override in that page.
Correct:  Read AppModal.tsx and the shared FormActions/AppButton. If the defect is in the shared
          layout, plan the fix there and enumerate every consumer, because a shared fix is a
          fleet-wide change that needs its own regression list.

Scenario: A new endpoint is needed.
Wrong:    Plan router + service + a fetch call in the page.
Correct:  contracts/api-contracts.json → contracts:generate → router (thin) → service → DTO →
          tests → api client → hook → page → e2e. Any other order leaves the generated client and
          the registry out of sync, which test_api_contracts.py will catch late.

Scenario: The plan needs a file the manifest does not claim.
Wrong:    Plan around it, or widen the claim to **.
Correct:  The plan states "narrow --own must add <path> before step 3".
```

## 30. Self-review

1. Did I read the current behavior, or describe what I expected it to be?
2. Is every file in the plan justified, and is every affected file in the plan?
3. Did I reuse what exists — and can I name it?
4. Who else consumes the things I am changing?
5. Are all states, both locales, and both roles covered?
6. Does a schema change carry a migration and a rollback?
7. Can each step be verified on its own?
8. Is this the smallest coherent change, with the rest listed as follow-up?
9. Does anything here need an ADR that I have not written?
10. Could another agent execute this plan without asking me a question?
