---
name: create-feature-flow
description: Design and deliver a complete new user journey — flow spec before code, then contract, DTOs, service, persistence, client, route, UI, every state, both locales, permissions, timeline events, tests and evidence. Use when the work is a journey a user can start and finish, not a single screen or endpoint; it orchestrates the other implementation skills rather than replacing them.
---

# Create feature flow

## 1. Identity

**Skill name:** `create-feature-flow`
**Domain:** product + full stack / end-to-end journeys

**Role.** You act as the engineer who owns a journey from the user's intent to the persisted
consequence. You decide what the flow is before deciding how it is built, you sequence the layers so
that each step leaves the repository green, and you make sure the unglamorous parts — the
unauthorized state, the empty state, the offline case, the English copy, the mobile layout — exist,
because those are what a demo actually breaks on.

## 2. Purpose

Features assembled screen-first end up with a happy path and nothing else. This project's
`.claude/rules/04-documentation.md` requires a flow spec before a new flow for exactly that reason:
writing down the state matrix, the permissions and the error paths first is what surfaces the twelve
states nobody would otherwise implement.

It also exists to keep a journey coherent across the seams the other skills each own separately —
contract, service, persistence, design system, i18n — so the result is one flow rather than five
correct fragments.

## 3. Mission

Deliver a journey a real user can complete, in both languages, in both roles where applicable, on a
320px phone and a 1440px desktop, with every alternate and failure path handled, persisted where it
should be, and covered by tests up to an end-to-end spec.

## 4. Activation conditions

### Use this skill when

- Adding a journey with a beginning and an end (submit evidence, request attorney review, complete
  a case section, onboard a client).
- Adding a route the user can navigate to.
- Extending an existing journey with a new branch, state or role behavior.
- Turning a product-blueprint item into working software.

### Do NOT use this skill when

- The change is one screen or one component — `/flowbite-design-system`.
- The change is one endpoint behind an existing journey — `/api-contract-change` +
  `/backend-service-change`.
- The change is copy only — `/i18n-change`.
- The journey requires a new dependency, persistence strategy or auth model —
  `/architecture-decision` first.

## 5. System context

```text
Specification
  .claude/templates/flow-spec.template.md   the required structure
  docs/flows/<flow>.md                      the target location — NOTE: this directory does not
                                            exist yet; the first flow spec creates it
  docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md      product scope and intent
  docs/architecture/FEATURE-CATALOG.md      what already exists
  docs/DEMO-SCRIPT.md                       what the demo shows; update when a journey changes

Routing (no magic strings — frontend/src/config/routes.ts)
  ROUTES.home "/", about, help, assistant, login,
  ROUTES.case(caseId) "/case/:id", ROUTES.caseSection(caseId, section)
  CASE_SECTION slugs: overview, household, income, expenses, debts, assets, documents, tasks,
                      submitted, activity, attorney-review
  FOCUS_PARAM_TO_SECTION maps the backend's focus_section vocabulary onto those slugs
  assistantUrl(prompt, caseId), attorneyViewUrl(view)
  frontend/src/router.tsx, config/navigation.ts, hooks/useRoleNavigation.ts

Backend
  contracts/api-contracts.json → routers → services → repositories → alembic
  app/services/case_access_service.py     role + ownership
  app/domain/value_objects.py             TimelineEventType and the other enums
  CaseRepository.record_timeline_event    the audit trail a flow should leave

Frontend
  pages/, components/, workspace/BankruptcyWorkspaceContext.tsx, auth/{AuthContext,ProtectedRoute}
  api/, services/api/apiClient.ts, hooks/, locales/{es,en}/

Tests
  backend/tests/, *.test.tsx, frontend/e2e/{matter-workflow,documents-add-evidence,
  assistant-page,responsive-overflow}.spec.ts
```

## 6. Source of truth

1. `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` for what the product is for.
2. The flow spec you write — once accepted, it is the contract for the implementation.
3. `contracts/api-contracts.json` for the operations.
4. `frontend/src/config/routes.ts` for the URL vocabulary.
5. Existing flows in the code — `matter-workflow.spec.ts` shows what a complete journey looks like
   here.

## 7. Ownership

**Owns:** the flow spec, the sequencing, the route registration, the page composition, the state
matrix, and the end-to-end test. It coordinates the layers rather than owning each one.

**Does not own:** the contract registry mechanics (`/api-contract-change`), service internals
(`/backend-service-change`), component internals (`/flowbite-design-system`), copy values
(`/i18n-change`), the version bump.

## 8. Boundaries

- Spec before code. Not a paragraph — the template's state matrix, permissions and error paths.
- No new route outside `routes.ts`. URLs are a vocabulary, and the workspace sections are path
  segments deliberately (a query parameter the page deletes was the previous design, and it broke
  reload, active state and repeat navigation).
- No business rule duplicated in the frontend to make a flow feel responsive.
- No journey without an audit trail where one is warranted — `record_timeline_event` exists so the
  case has a history.
- No "phase two" for the unauthorized, empty or error states.

## 9. Invariants

```text
INVARIANT-01  docs/flows/<flow>.md exists and is accepted before implementation starts.
INVARIANT-02  Every route is declared in routes.ts and consumed from there.
INVARIANT-03  Every backend operation the flow uses is in contracts/api-contracts.json.
INVARIANT-04  Role and case ownership are enforced server-side, whatever the UI shows.
INVARIANT-05  Every state in the matrix is implemented: loading, empty, validation, success,
              failure, unauthorized, offline.
INVARIANT-06  Every string exists in es and en.
INVARIANT-07  The journey works at 320/390/768/1024/1440 and by keyboard.
INVARIANT-08  Persistent consequences are persisted, and significant ones leave a timeline event.
INVARIANT-09  An e2e spec covers the happy path plus at least one failure path.
INVARIANT-10  The demo script and the feature catalog reflect the new journey.
```

## 10. Dependencies

Every implementation skill this one orchestrates, plus `AuthContext`/`ProtectedRoute` for gating,
`BankruptcyWorkspaceContext` for case state, `useRoleNavigation` for role-aware destinations, and
the Playwright suite. A new flow usually adds a navigation entry, which is an IA decision owned by
`ux-product-director`.

## 11. Required knowledge

The two roles (client, attorney) and what each is allowed to do; the case lifecycle and its section
vocabulary; the product boundary (organize information and prepare questions — never determine
eligibility, select a chapter or advise); the layering of this codebase; React Router 7 patterns
used here; Playwright with `locale: "es-PR"`.

## 12. Inputs

A blueprint item, a user story, a demo requirement, a UX proposal, or a gap found by
`product-ux-reviewer`.

## 13. Preconditions

1. An active manifest claims every layer the flow will touch — this is a wide claim, so check the
   fleet first.
2. `/repo-baseline` has established what already exists (a "new" flow is often an extension).
3. Any required ADR is accepted.
4. The IA question — where does this live in the navigation — has an answer.

## 14. Discovery procedure

```text
1. Read the blueprint section and docs/architecture/FEATURE-CATALOG.md: does this partly exist?
2. Read the nearest existing journey end to end, including its e2e spec.
3. Identify the roles involved and what each may do (case_access_service.py).
4. Identify the data: which DTOs, which persisted entities, which migration if any.
5. Identify the operations: existing contract keys, or new ones to register.
6. Identify the UI: which shared components already cover it; which section slug it belongs under.
7. Identify the copy namespaces.
8. Identify the timeline events the flow should record.
9. Draft the state matrix before writing any code.
```

## 15. Decision framework

**New route or new section?** If it belongs to a case, prefer a `CASE_SECTION` slug over a top-level
route — the workspace vocabulary already exists and gives you reload, back/forward and active state
for free.

**Client, attorney, or both?** Decide per step, not per flow. Most journeys have asymmetric
permissions, and the server enforces them regardless of what the UI renders.

**New endpoint or reuse?** Reuse if the shape fits. A new operation is a contract change with its
own SemVer consequence.

**Where does state live?** URL for anything that should survive reload or be linkable; context
(`BankruptcyWorkspaceContext`) for case-scoped session state; local component state for ephemeral
UI. Deleting a query parameter after consuming it is the anti-pattern `routes.ts` documents.

**Optimistic UI?** Only where a failure is recoverable and visible. Never for anything the attorney
relies on as a record.

**Does this step need a timeline event?** If a human would later ask "when did that happen" — yes.

**The flow implies a product judgement** (telling the user they qualify, recommending a chapter) →
stop. That is outside the product boundary and is a question for the user, not a design decision.

## 16. Execution workflow

```text
SPEC        docs/flows/<flow>.md from the template: goal, role, preconditions, happy path,
            alternate paths, error/recovery, permissions, state matrix, routes/contracts/DTOs,
            reusable UI, i18n/a11y, audit events, tests and DoD
REVIEW      accept the spec (with the user where the product shape is in question)
CONTRACT    register operations; regenerate the client
BACKEND     DTOs → service → repository → migration → authorization → tests
CLIENT      api client function via getEndpoint/buildPath
ROUTE       routes.ts, router.tsx, navigation.ts
UI          compose shared components; implement every state in the matrix
I18N        both locales, both roles' copy
AUDIT       timeline events
TESTS       unit, API, authorization, component, e2e (happy + at least one failure)
EVIDENCE    screenshots at five breakpoints, both languages
DOCS        demo script, feature catalog, change fragment
```

Each phase should leave the tree green; a flow delivered as one unverifiable lump cannot be
reviewed or reverted.

## 17. Proactive behavior

- **Local:** while implementing one step, implement its empty and error states rather than deferring
  them — deferred states are the ones that never arrive.
- **Horizontal:** a new journey usually needs a navigation entry, a dashboard affordance and possibly
  an assistant action (`ALLOWED_ACTION_RESOURCES`); check whether the assistant should be able to
  point at it.
- **Vertical:** trace the flow end to end at least once in a running app, not only through tests.
- **Pattern:** if the new flow duplicates most of an existing one, propose extending that one
  instead — two near-identical journeys are worse than one parameterized journey.
- **Regression risk:** new routes affect navigation, deep links and the workspace's active-section
  logic; new persisted fields affect the seed data and the AI context.

## 18. Expected agent behavior

Write the spec first and let it find the missing states. Reuse existing operations, components and
sections. Enforce permissions on the server. Implement the whole matrix. Verify in both languages
and at the narrow viewport. Finish with an e2e spec that would fail if the journey broke.

## 19. Forbidden behaviors

```text
DO NOT:
- start coding before the flow spec exists;
- add a route string outside routes.ts;
- use a query parameter as state you then delete;
- rely on UI gating for permissions;
- duplicate a backend rule in the frontend;
- ship the happy path with states "to follow";
- hardcode copy, or ship English later;
- skip the timeline event because "nothing displays it yet";
- add an assistant action whose target is not in the allow-list;
- deliver without an e2e spec;
- leave the demo script describing the old journey.
```

## 20. Error handling strategy

Per step, the spec must state: what can fail, what the user sees, what is logged, and what is
recoverable.

- Validation → inline field errors from `FormField`, localized, with the submit blocked.
- Authorization → the server's 403/404; the UI shows an honest unauthorized state, not an empty page.
- Network/server → `MutationFeedback` with a localized message from `backendErrors.ts`, and a retry
  where retrying is safe.
- Partial success (a document uploaded but not classified) → the flow must say which part succeeded;
  silence is the worst outcome.
- AI unavailable → the deterministic path, surfaced honestly (`degraded`).
- Offline → the flow must not present a success it cannot deliver.

## 21. Edge cases

- **A client with no case yet.** The most common first-run state; every dashboard and section must
  handle it.
- **An attorney with many cases.** Any per-case UI reached from the queue needs the case in the URL
  (`assistantUrl(prompt, caseId)` exists for exactly this).
- **Reload mid-flow.** URL-held state survives; context-held state does not. Decide deliberately.
- **Deep link into a step the user may not access.** Server enforces; UI explains.
- **Legacy `?focus=` links.** `FOCUS_PARAM_TO_SECTION` redirects them; a new section should be
  reachable the same way if the backend can name it.
- **Both roles on the same screen** with different affordances.
- **320px with the mobile keyboard open** during a form step.
- **A step that takes seconds** (document extraction, model answer) — loading state plus a
  non-blocking path.
- **Repeat submission.** Idempotent where it can be; guarded where it cannot.

## 22. Cross-system impact checklist

```text
[ ] Flow spec accepted
[ ] Routes in routes.ts; navigation entry decided with ux-product-director
[ ] Contracts registered and client regenerated
[ ] Service + repository + migration
[ ] Role and ownership enforced server-side, tested
[ ] Every matrix state implemented
[ ] Shared components reused
[ ] es + en, including attributes
[ ] 320/390/768/1024/1440, keyboard, contrast
[ ] Timeline events recorded
[ ] Assistant action/allow-list considered
[ ] Unit + API + authorization + component + e2e tests
[ ] Demo script and feature catalog updated
[ ] Change fragment written
```

## 23. Validation strategy

```bash
npm --prefix frontend run contracts:generate
cd backend && uv run pytest                      # includes the new authorization tests
cd backend && uv run ruff check . && uv run mypy app
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run i18n:check
npm --prefix frontend run build
npm --prefix frontend run test:e2e               # the new spec plus responsive-overflow
npm run agent:flowbite
```

Then walk the journey by hand in both languages, in both roles where applicable, at 390px and
1440px — and once with the model provider unavailable, because the default deployment is
deterministic and the flow must still be completable.

## 24. Definition of Done

```text
[ ] Spec written, accepted, and matching what shipped
[ ] Journey completable end to end by a real user in both languages
[ ] Both roles behave as specified, enforced server-side
[ ] Every state in the matrix implemented and reachable
[ ] Responsive and keyboard-accessible at all five breakpoints
[ ] Persistence and timeline events in place
[ ] Full test pyramid, including an e2e failure path
[ ] Evidence captured
[ ] Demo script, feature catalog and change fragment updated
[ ] No product-boundary violation introduced
```

## 25. Expected output

```markdown
## Flow: <name>

### Spec
docs/flows/<flow>.md — goal, roles, preconditions

### Journey
| Step | Role | Route | Operation | Persisted | Timeline event |

### State matrix
| State | Trigger | UI | Actions | Exit |

### Permissions
client: … · attorney: … · enforced by <service>, tested by <test>

### Reused
components / operations / sections

### New
contracts / routes / components / migrations

### Tests
unit / API / authorization / component / e2e

### Evidence
screenshots (5 viewports × 2 languages), e2e report

### Verification
### Remaining work
```

## 26. Escalation rules

Escalate when: the flow would have the product determine eligibility, select a chapter or advise;
the IA question (where it lives, what it displaces) is unresolved; it needs an authorization model
that does not exist (multi-attorney assignment); it requires a new dependency; or the journey cannot
be made to work at 320px without dropping a step — that is a product trade-off, not an
implementation detail.

## 27. Collaboration with other skills

```text
create-feature-flow  (orchestrator)
 ├── requires  → architecture-decision when it needs new architecture
 ├── uses      → api-contract-change   (operations)
 ├── uses      → backend-service-change (behavior, persistence, authorization)
 ├── uses      → flowbite-design-system (every screen and state)
 ├── uses      → i18n-change            (all copy)
 ├── uses      → ai-context-change      (if the assistant participates)
 ├── consults  → ux-product-director    (IA, hierarchy, navigation)
 ├── verified by → visual-acceptance, test-engineer
 └── closes at → finish-change
```

## 28. Examples

**Correct.** "Client adds an evidence document." Spec first: roles (client uploads, attorney
reviews), preconditions (a case exists), happy path, alternates (unsupported type, extraction
fails, duplicate), a state matrix with nine rows, permissions, and the timeline event to record.
Implementation reuses `documents.analyze`, `FileField`, `AppModal`, `MutationFeedback` and the
`documents` section slug; adds copy to `forms`/`workspace` in both locales; records a timeline
event; and lands with `documents-add-evidence.spec.ts` covering the upload and the rejected-type
path.

**Incorrect.** Adding an "Upload" button that posts to a new hand-written path, shows a spinner,
and navigates on success. No spec, no unsupported-type path, no unauthorized state, no persistence
of the association, no English copy, no timeline event, no test — and a literal endpoint string that
`endpointRegistry` was built to prevent.

**Complex.** "Attorney requests changes from the client." Two roles, an asymmetric permission model,
a persisted request with a status, a client-side notification surface, a timeline event on both
sides, an assistant action so the client can jump to the affected section (which means the section
must be in `ALLOWED_ACTION_RESOURCES` on both sides), and a state matrix that includes "request
pending", "client responded" and "request withdrawn". The spec is where those three states get
discovered; discovering them during implementation costs a redesign.

## 29. Failure scenarios

```text
Scenario: A flow ships with only the happy path.
Wrong:    "The other states are follow-up work."
Correct:  The matrix is part of the spec precisely so they are not optional. An unauthorized or
          empty state is not polish — it is the state a first-run user sees.

Scenario: A new section is linked as /case/:id?focus=evidence.
Wrong:    Consume the parameter and delete it.
Correct:  routes.ts documents why this broke: no active state, reload lost the section, and
          repeat clicks produced no navigation. Use ROUTES.caseSection and a CASE_SECTION slug.

Scenario: The UI hides an action the attorney should not have.
Wrong:    Ship it — the button is not rendered.
Correct:  Hiding is not authorization. The server must refuse it, and a test must prove the refusal;
          the hidden button is a usability decision layered on top of an enforced rule.
```

## 30. Self-review

1. Does the spec exist, and does what shipped match it?
2. Can a real user finish this journey in Spanish and in English?
3. Is every state in the matrix implemented and reachable?
4. Are permissions enforced on the server, with a test?
5. Did I reuse the existing sections, operations and components?
6. Does the flow leave the audit trail a later question would need?
7. Does it work at 320px with the keyboard open?
8. Does it still work with no model provider configured?
9. Is there an e2e spec that would fail if this broke?
10. Did I update the demo script, or leave it describing the old product?
