---
name: api-contract-change
description: Add, change or remove an API operation while preserving one-to-one traceability from contracts/api-contracts.json through the FastAPI router to the generated frontend client. Use before touching any endpoint, path, method, operation id or response DTO; the registry is the source of truth and every other artifact is derived from it.
---

# API contract change

## 1. Identity

**Skill name:** `api-contract-change`
**Domain:** backend + frontend integration / API surface

**Role.** You act as the owner of the HTTP boundary. Every operation this product exposes is
declared once, in `contracts/api-contracts.json`, and both sides derive from it: FastAPI reads the
registry to build its routes and operation ids, and the browser bundle receives a generated,
client-safe copy. You keep those three views identical and make sure the change is traceable,
typed, tested and versioned correctly.

## 2. Purpose

`AGENTS.md` rule 1 makes the registry the operation source of truth, and rule 6 forbids magic
endpoint strings. The reason is concrete: with eight operations spread across two languages and two
build systems, a hand-written path in a page is a defect that no type checker and no test will
catch until a route quietly 404s in a demo. The registry plus `test_api_contracts.py` turns that
class of error into a build failure.

## 3. Mission

Land an API change in which the registry, the FastAPI routes, the generated client and the callers
agree exactly — with typed DTOs at the boundary, a thin router, tests that would fail if they
diverged, and the correct SemVer classification.

## 4. Activation conditions

### Use this skill when

- Adding a new endpoint.
- Changing an existing path, method, operation id, request shape or response shape.
- Removing or renaming an operation.
- Adding a path or query parameter.
- Wiring a new frontend call to an existing operation and finding it is not in the registry.
- `backend/tests/test_api_contracts.py` fails.

### Do NOT use this skill when

- Only the *implementation* behind an unchanged contract changes — that is
  `/backend-service-change`.
- Only the UI consuming an unchanged endpoint changes — that is `/create-feature-flow` or
  `/flowbite-design-system`.
- The change is to the AI assistant's internal response contract
  (`backend/app/ai/contracts/assistant_response.py`) without changing the HTTP surface — that is
  `/ai-context-change`.
- The change would be incompatible and no ADR exists — write it first with
  `/architecture-decision`.

## 5. System context

```text
contracts/api-contracts.json          ← the single declaration
   │   key → { operationId, method, path, controller, action }
   │
   ├── backend/app/core/contracts.py         ContractRegistry.load() / get(key) / find_by_http()
   │     get_contract_registry() is lru_cached; routers call
   │     registry.get("<key>").path and .operation_id in their decorators
   │
   └── frontend/scripts/generate-api-contracts.mjs
         → frontend/src/api/apiContracts.generated.ts   (operationId, method, path only —
           controller/action stay server-side)
         → frontend/src/api/endpointRegistry.ts         getEndpoint(key), buildPath(key, params)
         → frontend/src/api/{authApi,aiApi,bankruptcyApi}.ts
         → frontend/src/services/api/apiClient.ts

Registered operations today (8):
  health.get            GET  /api/v1/health
  ai.health             GET  /api/v1/ai/health
  auth.login            POST /api/v1/auth/login
  auth.me               GET  /api/v1/auth/me
  bankruptcy.analyze    POST /api/v1/bankruptcy/analyze
  bankruptcy.guide      POST /api/v1/bankruptcy/guide
  documents.analyze     POST /api/v1/documents/analyze
  admin.resetDemoData   POST /api/v1/admin/demo/reset

Routers          backend/app/api/routers/{auth,bankruptcy,documents,ai,admin,health}.py
DTOs             backend/app/schemas/{auth,bankruptcy,documents,assistant,admin,common}.py
Errors           backend/app/core/errors.py → translated in app/main.py and
                 frontend/src/i18n/backendErrors.ts
Tests            backend/tests/test_api_contracts.py plus per-router tests
Docs             docs/API-CONTRACTS.md
Generation       npm --prefix frontend run contracts:generate  (also runs on predev/prebuild)
```

## 6. Source of truth

1. `contracts/api-contracts.json` — declaration.
2. The FastAPI app's OpenAPI output — what is actually served; `test_api_contracts.py` asserts every
   registry entry appears there with the same method, path and operation id.
3. `frontend/src/api/apiContracts.generated.ts` — derived; never authored.
4. `docs/API-CONTRACTS.md` — descriptive; updated after, never ahead.

If the registry and a route disagree, the test fails and one of them is wrong — decide which
deliberately, do not "fix the test".

## 7. Ownership

**Owns:** `contracts/api-contracts.json`, the router decorators and signatures, the request/response
DTOs, the generated client (by regeneration), the API-level tests, and `docs/API-CONTRACTS.md`.

**Does not own:** business orchestration inside services (`/backend-service-change`), persistence
(`backend-persistence-engineer`), page composition (`/flowbite-design-system`), copy
(`/i18n-change`), the version bump.

## 8. Boundaries

- The registry is edited first. Nothing else moves before it.
- `apiContracts.generated.ts` is never hand-edited — the header says so and the generator overwrites
  it on `predev`/`prebuild`.
- No literal endpoint string anywhere: routers use `registry.get("<key>").path`, clients use
  `getEndpoint`/`buildPath`.
- Routers stay thin: parse, authorize, delegate, return a typed DTO. No pandas, no business rules,
  no repository composition in the router body.
- Only client-safe metadata reaches the browser. `controller` and `action` stay server-side, and the
  health test asserts no `x-backend-controller` header leaks.

## 9. Invariants

```text
INVARIANT-01  Every operation exists exactly once in contracts/api-contracts.json.
INVARIANT-02  Router decorators take path and operation_id from the registry, never literals.
INVARIANT-03  apiContracts.generated.ts is regenerated, never edited, and committed with the change.
INVARIANT-04  Frontend calls resolve through getEndpoint/buildPath, never a string.
INVARIANT-05  Request and response bodies are Pydantic DTOs; response_model is declared.
INVARIANT-06  Case-scoped operations authorize server-side via CaseAccessService before any work.
INVARIANT-07  test_api_contracts.py passes: registry ⊆ OpenAPI, matching method/path/operationId.
INVARIANT-08  Errors surface as DomainError subclasses with codes, localized at the boundary.
INVARIANT-09  An incompatible change is MAJOR and has an accepted ADR.
INVARIANT-10  docs/API-CONTRACTS.md matches the registry when the change lands.
```

## 10. Dependencies

`app/core/contracts.py` (lru-cached registry — a stale process will not see a contract edit until
restart), `app/core/security.py` (`CurrentUserDep`), `app/services/case_access_service.py`
(`CaseAccessDep`), `app/core/errors.py`, `app/core/i18n.py` (`Accept-Language` handling),
`frontend/src/api/http.ts` and `apiClient.ts`, and the Playwright specs that exercise the journeys.

Changing an operation's shape ripples to: the router, its service, the client, every calling
component, the e2e specs, and `frontend/src/types/api.ts`.

## 11. Required knowledge

FastAPI routing and dependency injection; Pydantic v2 models and `response_model`; the
`Annotated[..., Depends(...)]` idiom used for `CurrentUserDep`/`CaseAccessDep`; TypeScript literal
union types (the generated `ApiOperationKey`); how `buildPath` substitutes and validates `{params}`;
SemVer for API surfaces.

## 12. Inputs

A feature needing a new endpoint, a shape change requested by the UI, an audit finding, a failing
contract test, or an ADR authorizing a breaking change.

## 13. Preconditions

1. An active manifest claims `contracts/api-contracts.json`,
   `frontend/src/api/apiContracts.generated.ts`, the router, the DTOs, the client and the tests.
2. The existing operation and its callers have been read.
3. For an incompatible change, an ADR is accepted.
4. You know the SemVer classification you are heading for.

## 14. Discovery procedure

```text
1. Read contracts/api-contracts.json in full — it is eight entries.
2. Find the router that implements the operation (grep the key, e.g. "bankruptcy.analyze").
3. Read the router function: dependencies, authorization, delegation, response_model.
4. Read the request/response DTOs in backend/app/schemas/.
5. Find the frontend consumers: grep the key in frontend/src/api/ and the components that call
   those functions.
6. Read the tests: backend/tests/test_api_contracts.py and the per-router module
   (test_bankruptcy.py, test_documents_router.py, test_auth.py, test_ai_health.py, test_admin.py).
7. Find the e2e specs that traverse the operation (frontend/e2e/*.spec.ts).
8. Determine compatibility: would a client built against origin/main still work?
```

## 15. Decision framework

**New operation** → new registry key; choose a stable `key` (`<area>.<verb>`), an `operationId` in
camelCase, a versioned path under `/api/v1/`, and `controller`/`action` matching the implementation.

**Additive change** (new optional field, new endpoint) → MINOR; existing clients keep working.

**Breaking change** (path/method change, required field added, field removed or re-meaninged) →
MAJOR plus an ADR. Consider whether an additive path forward exists first: a new optional field, or
a new operation alongside the old one, is often better than breaking eight consumers.

**Path parameters** → declare them in the path (`/api/v1/cases/{case_id}`) and let `buildPath`
substitute; it throws on an unresolved `{param}`, which is the behavior you want.

**Where does authorization go?** If the resource id is in the path or query, a dependency can
resolve it. If it is in the body — as it is for `bankruptcy.analyze` and `documents.analyze` — the
router must call `CaseAccessService` explicitly after parsing, which is why `CaseAccessDep` injects
the service rather than the decision. Follow the existing pattern rather than inventing a third one.

**Where does the logic go?** In a service. If the router grows a second responsibility beyond
"authorize and delegate", it is in the wrong layer.

**Should the request carry the locale?** No — use the `Accept-Language` header, as
`analyze_case` does, so the request contract is unchanged and the error handlers already agree.

## 16. Execution workflow

```text
1. REGISTRY     edit contracts/api-contracts.json
2. GENERATE     npm --prefix frontend run contracts:generate   (commit the generated diff)
3. DTOs         request/response models in backend/app/schemas/
4. ROUTER       decorator from the registry; authorize; delegate; return the DTO
5. SERVICE      the actual behavior (see /backend-service-change)
6. TESTS        contract test + router test (happy path, validation, 401/403/404)
7. CLIENT       frontend/src/api/<area>Api.ts via getEndpoint/buildPath
8. TYPES        frontend/src/types/ if the shape is shared
9. UI           consume through a hook/context, never a raw call in a page
10. i18n        any new user-visible message in es + en
11. E2E         extend or add a Playwright spec for the journey
12. DOCS        docs/API-CONTRACTS.md, and an ADR if incompatible
13. VERIFY      §23
```

Doing 3–5 before 1–2 is the single most common way this change goes wrong: the generated client and
the registry drift, and the failure appears later, in someone else's branch.

## 17. Proactive behavior

- **Local:** while editing the router, check its siblings for the same defect — an unauthorized
  case-scoped endpoint, a missing `response_model`, a literal path.
- **Horizontal:** grep every consumer of the operation before changing its shape. Eight operations
  means a small, enumerable set — there is no excuse for missing one.
- **Vertical:** contract → router → service → repository → migration, and client → hook → component
  → e2e. State where your change stops.
- **Pattern:** if two operations need the same DTO fragment, extract it into `schemas/common.py`
  rather than duplicating.
- **Regression risk:** a shape change invalidates cached demo data and any fixture; check
  `backend/app/repositories/seed.py` and the e2e specs.

## 18. Expected agent behavior

Registry first. Regenerate rather than hand-edit. Keep routers thin. Type both directions. Test the
negative paths — unauthenticated, wrong role, wrong owner, malformed body — not just the happy one.
Update the docs in the same change.

## 19. Forbidden behaviors

```text
DO NOT:
- add a route whose path or operation id is a literal in the decorator;
- hand-edit frontend/src/api/apiContracts.generated.ts;
- call an endpoint from a page with a string path or a raw axios/fetch call;
- return an untyped dict or omit response_model;
- put business logic, pandas or repository composition in a router;
- trust a client-supplied owner_user_id;
- break a contract without an ADR and a MAJOR bump;
- change a shape without updating every consumer and the e2e specs;
- edit test_api_contracts.py to accommodate a mismatch;
- leave docs/API-CONTRACTS.md describing the previous shape.
```

## 20. Error handling strategy

- Domain failures raise `NotFoundError` / `ValidationError` from `app/core/errors.py`, each carrying
  a `code` and a `message_key`; the boundary translates them using `Accept-Language`.
- Authorization failures raise `HTTPException` 403/404 from `CaseAccessService` — 404 when the case
  does not exist and the caller may not create it, 403 when it exists and is someone else's. Keep
  that distinction; it is deliberate.
- Validation of the body is Pydantic's job — do not re-implement it in the router.
- The frontend maps codes to copy in `frontend/src/i18n/backendErrors.ts`; a new code needs an entry
  in both locales, or the user sees a raw code.
- Never return a 500 for an expected condition, and never leak internal detail in `detail`.

## 21. Edge cases

- **The registry is `lru_cache`d.** A running server will not pick up a contract edit until restart;
  a "route not found" right after editing is usually this.
- **Multiple candidate contract paths.** `ContractRegistry.load()` tries the repo path, `/contracts`
  and the parent of the CWD — relevant when running from `backend/` or in the Vercel function.
- **`buildPath` with a missing parameter** throws with the parameter name; treat that as a caller
  bug, not something to guard around.
- **Removing an operation.** Remove it from the registry, regenerate (the `ApiOperationKey` union
  shrinks and every stale caller becomes a build error — that is the point), delete the route and
  its tests, and record it as breaking.
- **Admin/demo endpoints** (`admin.resetDemoData`) still need authorization and still appear in the
  registry; they are not exempt because they are demo tooling.
- **File upload** (`documents.analyze`) has a multipart shape; the registry still declares method
  and path, and the client still resolves through `getEndpoint`.

## 22. Cross-system impact checklist

```text
[ ] Registry updated first
[ ] Generated client regenerated and committed
[ ] Router uses registry path + operation_id
[ ] Typed request/response DTOs, response_model declared
[ ] Authorization: role and case ownership, server-side
[ ] Service layer holds the behavior
[ ] Backend tests: happy path, validation, 401, 403, 404
[ ] test_api_contracts.py passes
[ ] Frontend client updated; no literal paths
[ ] Every consumer updated (grep the key)
[ ] i18n for any new message, es + en
[ ] E2E journey updated
[ ] docs/API-CONTRACTS.md updated
[ ] SemVer classified; ADR if incompatible
```

## 23. Validation strategy

```bash
npm --prefix frontend run contracts:generate
cd backend && uv run pytest tests/test_api_contracts.py
cd backend && uv run pytest tests/test_<area>.py
cd backend && uv run ruff check . && uv run mypy app
npm --prefix frontend run lint
npm --prefix frontend run build        # the ApiOperationKey union is checked here
npm --prefix frontend run test -- --run
npm --prefix frontend run test:e2e     # for the affected journey
```

`make contracts` runs the generation and the contract test together. The frontend `build` step is
not optional: it is where a removed or renamed key becomes a compile error at every call site.

## 24. Definition of Done

```text
[ ] Registry, OpenAPI and generated client agree
[ ] test_api_contracts.py green
[ ] Router thin, typed, authorized
[ ] Negative-path tests exist and pass
[ ] All consumers updated; no literal endpoint strings anywhere
[ ] Frontend build passes
[ ] Affected e2e journey passes
[ ] i18n parity for new messages
[ ] docs/API-CONTRACTS.md current
[ ] SemVer classified; ADR present if incompatible
[ ] Change fragment records the contract delta
```

## 25. Expected output

```markdown
## API contract change

### Operations
| Key | Method | Path | operationId | Change |

### Compatibility
additive | breaking (ADR NNNN) → SemVer <minor|major>

### Backend
router / DTOs / service / authorization

### Frontend
client / consumers updated / generated diff

### Tests
contract, router (happy + 401/403/404), component, e2e

### Docs
docs/API-CONTRACTS.md, ADR

### Verification
<commands and results>
```

## 26. Escalation rules

Escalate when: the change is breaking and no ADR exists; two operations would overlap in path and
method; the requested shape would force business logic into the router or the frontend; the
operation would expose data across case boundaries; or the requirement implies an authorization
model this demo does not have (multi-attorney assignment, for instance).

## 27. Collaboration with other skills

```text
api-contract-change
 ├── requires  → architecture-decision for incompatible changes
 ├── delegates → backend-service-change for the behavior behind the route
 ├── delegates → create-feature-flow when the endpoint serves a whole new flow
 ├── delegates → i18n-change for new user-visible messages
 ├── consults  → security-reviewer for authorization and exposure
 ├── consults  → test-engineer for negative-path and e2e coverage
 └── feeds     → version-release (the contract diff is the objective breaking test)
```

## 28. Examples

**Correct.** `bankruptcy.analyze`: the decorator reads
`registry.get("bankruptcy.analyze").path` and `.operation_id`; the body is
`CaseAnalysisRequestDto`; `response_model=CaseAnalysisDto`; ownership is resolved by
`case_access.authorize_for_submission(body.case, current_user)` *before* anything else runs; the
locale comes from `Accept-Language` so the request contract is untouched; the service does the work;
the repository persists. Everything the boundary owes is at the boundary, and nothing more.

**Incorrect.**

```python
@router.post("/api/v1/bankruptcy/analyze")     # literal path, no operation_id
def analyze(body: dict, request: Request):     # untyped in, untyped out
    owner = body["case"]["owner_user_id"]      # client-claimed ownership
    ...                                        # pandas math inline in the router
```

Four invariants broken in five lines, and `test_api_contracts.py` catches only the first.

**Complex.** Adding pagination to a list operation: the response shape changes for every consumer,
so either it is a MAJOR with an ADR, or you add an optional `page`/`page_size` with defaults that
reproduce the current behavior exactly — additive, MINOR, and no consumer changes. The plan should
compare both before writing code; that comparison is the whole decision.

## 29. Failure scenarios

```text
Scenario: A new page needs data and the endpoint does not exist yet.
Wrong:    Call a plausible path from the page and add the route later.
Correct:  Registry → generate → router → service → tests → client → page. The literal string would
          also have bypassed endpointRegistry, which nothing would have caught.

Scenario: test_api_contracts.py fails after a rename.
Wrong:    Update the test's expectation.
Correct:  The test compares the registry against the live OpenAPI. A failure means the route and the
          declaration disagree — fix whichever is wrong and regenerate the client.

Scenario: The generated client shows a diff nobody expected.
Wrong:    Revert the generated file to keep the diff clean.
Correct:  It is derived output. If it changed, the registry changed. Commit it, or find out who
          edited the registry and why.
```

## 30. Self-review

1. Did I edit the registry first and regenerate, or did I write the route first?
2. Are there any literal endpoint strings left, on either side?
3. Is the router thin — authorize and delegate, nothing else?
4. Is every request and response a typed DTO with `response_model` declared?
5. Is case ownership verified server-side, ignoring anything the client claimed?
6. Did I grep every consumer of the operation and update it?
7. Do the negative paths have tests?
8. Would a client built against `origin/main` still work — and if not, is there an ADR?
9. Does `docs/API-CONTRACTS.md` describe what now exists?
10. Did the frontend `build` actually run, so a shrunken key union would have failed?
