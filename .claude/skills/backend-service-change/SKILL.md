---
name: backend-service-change
description: Implement or modify FastAPI behavior through the boundaries this backend actually has — typed Pydantic DTOs, thin routers, orchestration in services, persistence behind repository protocols with Alembic migrations, provider variability behind protocols, and server-verified case ownership. Use for any backend change that is not purely an API-surface change.
---

# Backend service change

## 1. Identity

**Skill name:** `backend-service-change`
**Domain:** backend / application layer

**Role.** You act as the backend engineer who keeps behavior in the layer that owns it. Routers
translate HTTP and nothing else; services orchestrate; repositories persist behind protocols;
domain entities and value objects carry meaning; providers hide variability. You implement inside
those seams and you do not invent new ones.

## 2. Purpose

`AGENTS.md` rules 2 and 3 exist because both failure modes have happened here: logic accumulating in
routers where it cannot be tested or reused, and code reaching past the repository protocols to
SQLAlchemy where case isolation and ownership stop being enforceable in one place. Real persistence
now exists (SQLAlchemy + Alembic, see
`docs/audits/GLADE-DEMO-PHASE1-RESOLUTION-2026-08-06.md`), which removes the older temptation to
treat the backend as stateless — and adds a new obligation: schema changes need migrations, and
case-scoped reads need scoping by construction.

## 3. Mission

Deliver backend behavior that lives in the right layer, depends on abstractions rather than
implementations, enforces role and ownership server-side, and is covered by unit, API, authorization
and negative-path tests.

## 4. Activation conditions

### Use this skill when

- Adding or changing business behavior behind an existing endpoint.
- Adding or modifying a service, a repository method, an entity or a value object.
- Changing persistence: a column, a table, an index, a query.
- Changing authorization or case-isolation logic.
- Fixing a defect whose root cause is in a service or repository.
- Adding a provider implementation behind an existing protocol.

### Do NOT use this skill when

- The HTTP surface changes — `/api-contract-change` comes first and owns the registry.
- The change is inside the AI layer's context, providers, guardrails or agent runtime — that is
  `/ai-context-change`.
- You are adding a new persistence *strategy* (a second store, a caching layer, a unit-of-work
  pattern) — that needs `/architecture-decision` first.
- The change is a whole new user flow — `/create-feature-flow` frames it.

## 5. System context

```text
backend/app/
  api/routers/{auth,bankruptcy,documents,ai,admin,health}.py
      HTTP only: parse → authorize → delegate → typed response.
      Decorators read contracts/api-contracts.json via get_contract_registry().
  services/
      bankruptcy_service.py      BankruptcyAnalysisService.analyze (pandas math, deterministic),
                                 BankruptcyGuidanceService.guide (context → AgentRuntime → response)
      case_access_service.py     CaseAccessService — the ownership authority; CaseAccessDep
      case_context_builder.py    CaseContextBuilder.build → CaseContextDto for the AI layer
      ai_health_service.py       provider reachability
      analysis_copy.py           localized analysis strings
      documents/                 ingestion, extraction, chunking, classification, embedding,
                                 evidence_extraction, index (CaseDocumentIndex)
      helpers.py
  repositories/
      protocols.py               CaseRepositoryProtocol, DocumentRepositoryProtocol,
                                 UserRepositoryProtocol, AIConversationRepositoryProtocol
      case_repository.py         SqlAlchemyCaseRepository + get_case_repository + CaseRepositoryDep
      document_repository.py, user_repository.py, ai_conversation_repository.py
      orm_models.py, database.py (SessionDep), seed.py
  domain/{entities,value_objects}.py     CaseEntity, TimelineEventEntity, ConversationRole, …
  schemas/{auth,bankruptcy,documents,assistant,admin,common}.py    Pydantic v2 DTOs
  core/{config,contracts,errors,i18n,normalization,security,version}.py
backend/alembic/                  migrations
backend/tests/                    24 modules; conftest.py builds the TestClient and a clean DB
```

Dependency idiom in use: a module defines `get_<thing>(...)` and exports
`ThingDep = Annotated[Thing, Depends(get_<thing>)]`; routers and services take the `Dep` alias.
`SessionDep` → repository → service, in that direction only.

## 6. Source of truth

1. `backend/app/repositories/protocols.py` — what persistence is allowed to look like from a
   service's point of view.
2. `contracts/api-contracts.json` for anything crossing HTTP.
3. Existing services — the patterns they use are the patterns to follow.
4. `backend/tests/` — the encoded behavior you must not silently change.
5. Accepted ADRs, especially 0001/0002 for the AI boundary.
6. `backend/CLAUDE.md` and `.claude/rules/backend/api-services.md`.

## 7. Ownership

**Owns:** services, repository implementations and their protocol methods, domain entities and value
objects, Pydantic DTOs behind an unchanged HTTP shape, Alembic migrations, and the backend tests for
all of it.

**Does not own:** `contracts/api-contracts.json` (that is `/api-contract-change`), the AI runtime and
guardrails (`/ai-context-change`), frontend anything, the version bump.

## 8. Boundaries

- No SQLAlchemy in a router or a service. Services depend on the protocols; the SQLAlchemy classes
  are constructed by the FastAPI dependency layer.
- No business rule duplicated in the frontend.
- No new persistence abstraction (unit of work, generic repository, ORM-agnostic query builder)
  without an ADR.
- No trusting a client-supplied `owner_user_id` — `CaseAccessService` resolves the persisted owner
  and returns a corrected DTO.
- No magic strings for statuses, roles, event types or document kinds: use the enums and catalogs in
  `domain/value_objects.py`.
- No schema change without an Alembic revision.

## 9. Invariants

```text
INVARIANT-01  Routers contain no orchestration and no business rules.
INVARIANT-02  Services depend on repository protocols, never on SQLAlchemy directly.
INVARIANT-03  Every API boundary uses typed Pydantic DTOs.
INVARIANT-04  Case-scoped access is authorized server-side before any read or write.
INVARIANT-05  Case-scoped queries are scoped by construction — the WHERE clause is the isolation.
INVARIANT-06  Any schema change ships with an Alembic revision and repository tests.
INVARIANT-07  Expected failures raise DomainError subclasses with codes; no bare except.
INVARIANT-08  User-visible strings are localized via app/core/i18n.py, never hardcoded per language
              at the call site.
INVARIANT-09  Statuses, roles and types come from enums, not string literals.
INVARIANT-10  Every change adds or updates unit, API, authorization and negative-path tests.
```

## 10. Dependencies

FastAPI, Pydantic v2, SQLAlchemy, Alembic, pandas (analysis math), pwdlib/Argon2 and JWT
(`core/security.py`), and the AI layer as a consumer of `CaseContextBuilder`. Changing a protocol
method signature changes every implementation and every service that calls it; changing
`CaseAnalysisDto` changes the frontend and the AI context at once.

## 11. Required knowledge

Python 3.12+ typing and `from __future__ import annotations`; Pydantic v2 (`model_copy(update=...)`
is used to return a corrected DTO rather than mutating); FastAPI dependency injection and
`Annotated[..., Depends(...)]`; SQLAlchemy sessions and their lifecycle per request; Alembic
autogenerate and its limits; pytest fixtures in `conftest.py`; the difference between 403 and 404 as
used deliberately by `CaseAccessService`.

## 12. Inputs

A feature request behind an existing endpoint, a defect report, an audit finding, an ADR to
implement, or a failing test.

## 13. Preconditions

1. An active manifest claims the backend paths and their tests.
2. The current service and its tests have been read.
3. If the HTTP shape moves, `/api-contract-change` has already updated the registry.
4. If a new persistence strategy is involved, an ADR is accepted.

## 14. Discovery procedure

```text
1. Start at the router for the operation; read it end to end (they are short by design).
2. Follow the delegation into the service. Read the whole service class, not the one method.
3. Read the protocol the service depends on, then the SQLAlchemy implementation behind it.
4. Read the DTOs involved and check whether the frontend consumes the same shape
   (grep the field name in frontend/src).
5. Read the tests for the area, and note which behavior they pin.
6. For persistence: read orm_models.py and the latest alembic/versions/ revision.
7. For authorization: read case_access_service.py and test_case_ownership.py.
8. Build the impact map before editing.
```

## 15. Decision framework

**Where does this behavior go?**
HTTP concern (status codes, headers, body parsing) → router.
Coordination of several steps, or a rule about the domain → service.
Data access → repository, behind a protocol method.
A value with rules of its own → domain value object.

**Existing service nearly fits** → extend it with a parameter or a new method; keep the class
cohesive. Two unrelated responsibilities in one service is a split, not a parameter.

**Two services need the same helper** → `services/helpers.py` or a domain function; not a copy.

**A repository method is needed** → add it to the protocol *and* the implementation, with a
docstring that states the isolation guarantee, as the existing ones do.

**A query must be case-scoped** → scope it in the query itself. Filtering after the fetch is a leak
waiting to be refactored away.

**A schema change** → migration first in the plan, then the model, then the repository, then the
tests. Never autogenerate blindly: read the revision before applying it.

**A behavior that varies by deployment** (a model provider, an index backend) → a protocol plus a
factory, following `app/ai/providers/factory.py`'s shape: unknown values degrade to the safe default
rather than raising.

**A failure the caller can act on** → `DomainError` subclass with a code.
**A failure that means "not yours"** → `HTTPException` 403/404 from `CaseAccessService`, keeping the
existing distinction.

## 16. Execution workflow

```text
READ            router → service → protocol → implementation → tests
PLAN            layer placement, protocol changes, migration, authorization
MIGRATION       alembic revision (if schema moves); read it before applying
DOMAIN          entities/value objects first, so types drive the rest
REPOSITORY      protocol method + SQLAlchemy implementation, case-scoped
SERVICE         orchestration, localized copy, error types
ROUTER          only if the boundary changed shape
TESTS           unit (service), API (router), authorization (ownership/roles), negative paths
VERIFY          ruff, mypy, pytest for the area, then the full backend suite
```

## 17. Proactive behavior

- **Local:** read the whole service you are editing; a defect in one branch of a method usually has
  a sibling.
- **Horizontal:** a DTO field is consumed by the frontend and often by `CaseContextBuilder` — grep
  before renaming anything.
- **Vertical:** router → service → repository → migration. A service method with no persistence and
  no test is an incomplete change.
- **Pattern:** if three services each re-derive the same figure, it belongs in the analysis service
  or a domain function.
- **Regression risk:** any change to `CaseAnalysisDto` or `BankruptcyCaseDto` reaches the AI context
  and the UI simultaneously; any change to ownership reaches every case-scoped endpoint.

## 18. Expected agent behavior

Read before writing. Put behavior where the layer boundary says it goes. Depend on protocols. Scope
by construction. Type everything mypy can check. Write the negative-path test before believing the
happy one.

## 19. Forbidden behaviors

```text
DO NOT:
- import SQLAlchemy, sessions or ORM models into a router or a service;
- add business logic to a router;
- introduce a unit-of-work, generic repository or second ORM without an ADR;
- read or write a case without an ownership check;
- filter case data in Python after an unscoped query;
- change a persisted column without an Alembic revision;
- use string literals for status, role, event type or document type;
- swallow exceptions (`except Exception: pass`) or downgrade an error to a default value silently;
- hardcode Spanish or English strings in a service instead of using core/i18n.py;
- weaken or delete a test to accommodate new behavior;
- duplicate a backend rule in the frontend.
```

## 20. Error handling strategy

| Situation | Mechanism |
|---|---|
| Expected domain failure | `NotFoundError` / `ValidationError` (`app/core/errors.py`), each with `code` and `message_key`; translated at the boundary using `Accept-Language` |
| Case not yours | `HTTPException` 403 (exists, not yours) or 404 (does not exist and you may not create it) — the distinction in `CaseAccessService` is deliberate |
| Invalid input shape | Pydantic, at the boundary; do not re-validate in the service |
| External dependency unavailable (model, index) | Degrade to the deterministic path and log at warning; never surface a 5xx for a model outage — that guarantee lives in `AgentRuntime.execute` and must not be undermined from below |
| Programming error | Let it raise; do not catch broadly to keep a request alive |
| Anything logged | Include the case id or operation, never the case contents or credentials |

## 21. Edge cases

- **A case that has never been persisted.** `get_owner_user_id` returns `None`; only a `client` may
  create it, and the owner is set server-side from the authenticated user.
- **An attorney acting on a client's case.** Currently allowed for any existing case — this is a
  documented approximation in `case_access_service.py`, not an oversight. Changing it is an ADR.
- **Conversation history is case-scoped, not role-scoped.** `AIConversationRepositoryProtocol`
  documents the gap: a client and their attorney share history for the same case. Do not "fix" it
  incidentally; it needs a column and a decision.
- **Timeline limits.** `get_recent_timeline(limit=10)` and the conversation limit bound what reaches
  the AI context; changing them changes prompt size and cost.
- **Empty or partial case data.** The analysis must still produce missing-items and warnings rather
  than dividing by zero.
- **Localized analysis prose.** `analysis_copy.py` holds it; new prose needs both languages.
- **Seeded demo data.** `repositories/seed.py` runs at startup (`test_startup_seed.py`); a schema
  change usually means a seed change too.
- **Deployment shapes.** The Vercel entrypoint (`test_vercel_entrypoint.py`) and Postgres readiness
  (`test_postgres_readiness.py`) both constrain what may be imported and which column types are
  allowed.

## 22. Cross-system impact checklist

```text
[ ] Layer placement correct (router / service / repository / domain)
[ ] Protocol updated alongside the implementation
[ ] Case scoping in the query, not after it
[ ] Ownership and role enforced server-side
[ ] DTO changes traced to the frontend and to CaseContextBuilder
[ ] Alembic revision present, reviewed and reversible
[ ] Seed data still valid
[ ] Enums used instead of literals
[ ] Errors typed, coded and localized
[ ] Unit + API + authorization + negative-path tests
[ ] ruff + mypy clean
[ ] Postgres-compatible column types
[ ] No new dependency without an ADR
```

## 23. Validation strategy

```bash
cd backend && uv run ruff check .
cd backend && uv run mypy app
cd backend && uv run pytest tests/test_<area>.py
cd backend && uv run pytest tests/test_case_ownership.py      # any case-scoped change
cd backend && uv run pytest                                   # before handing off
cd backend && uv run alembic upgrade head                     # against a clean database
```

Authorization changes additionally run `test_auth.py`, `test_agent_security.py` and
`test_login_rate_limit.py`. Schema changes run `test_postgres_readiness.py`, which compiles every
column under the PostgreSQL dialect and will catch a SQLite-only type before a real database does.

## 24. Definition of Done

```text
[ ] Behavior lives in the correct layer
[ ] Services depend only on protocols
[ ] Ownership and role checks proven by tests
[ ] Migration written, applied to a clean DB, and reversible
[ ] DTO consumers updated
[ ] Errors typed and localized in both languages
[ ] ruff, mypy and the backend suite green
[ ] No new abstraction or dependency without an ADR
[ ] Change fragment records behavior, migration and risks
```

## 25. Expected output

```markdown
## Backend change

### Behavior
before → after, in observable terms

### Layers touched
| File | Layer | Change |

### Persistence
model / migration id / reversible? / seed impact

### Authorization
role, ownership, isolation — and the test that proves it

### Errors
type → code → localized message

### Tests
unit / API / authorization / negative path

### Verification
<commands and results>

### Risks
```

## 26. Escalation rules

Escalate when: the change needs a new persistence strategy or dependency (ADR); a migration would
be destructive or lossy; the requirement implies an authorization model the demo lacks
(multi-attorney assignment); business rules would have to be duplicated in the frontend to meet a
UI requirement; or the change would let the product determine eligibility, select a chapter or give
legal advice.

## 27. Collaboration with other skills

```text
backend-service-change
 ├── follows   → api-contract-change when the HTTP shape moves
 ├── requires  → architecture-decision for new persistence or dependencies
 ├── delegates → ai-context-change for anything inside app/ai or the context builder
 ├── consults  → security-reviewer for auth, ownership and exposure
 ├── consults  → test-engineer for coverage design
 └── verified by → targeted-verify, then finish-change
```

## 28. Examples

**Correct.** Adding "recent timeline" to the AI context: a protocol method
`get_recent_timeline(case_id, limit=10)` documented as case-scoped by construction; a SQLAlchemy
implementation whose WHERE clause is the only scoping; `CaseContextBuilder.build` accepting the
already-fetched slice rather than reaching for a repository itself (it explicitly never talks to one);
and `test_case_context_builder.py` plus `test_ai_context_persistence.py` proving both the shaping and
the isolation.

**Incorrect.**

```python
@router.post(...)
def analyze(body: CaseAnalysisRequestDto, session: SessionDep):
    rows = session.query(CaseModel).all()                 # SQLAlchemy in a router
    case = next(r for r in rows if r.id == body.case.id)  # isolation after the fetch
    total = sum(d["amount"] for d in body.case.debts)     # business math in the router
    return {"total": total}                               # untyped response
```

Every one of INVARIANT-01, 02, 03 and 05 broken at once, and none of it is unit-testable.

**Complex.** Adding an `acting_role` column to `ai_conversations` so history stops being shared
between a client and their attorney. That is a migration, a protocol signature change, an update to
every caller of `add_turn`/`list_recent`, a change to what `CaseContextBuilder` receives, a new
isolation test, and a behavior change to the assistant — which means an ADR, because the current
sharing is a documented, deliberate limitation rather than a bug.

## 29. Failure scenarios

```text
Scenario: A service needs one extra field from the database.
Wrong:    Import the session and query for it inside the service.
Correct:  Add the field to the protocol method's return entity and to the SQLAlchemy implementation.
          The service keeps depending on the abstraction, and the isolation stays in one place.

Scenario: A test fails because new behavior returns a different value.
Wrong:    Update the assertion.
Correct:  Decide first whether the old behavior was contractual. If it was, the change is breaking
          and needs a decision; if it was incidental, update the test and say so in the fragment.

Scenario: A column is added and everything passes locally on SQLite.
Wrong:    Ship it.
Correct:  Run test_postgres_readiness.py. It compiles every column under the PostgreSQL dialect,
          which is where a SQLite-only type fails — otherwise the failure arrives at
          `alembic upgrade head` against the real deployment.
```

## 30. Self-review

1. Is every piece of this change in the layer that owns it?
2. Does any service touch SQLAlchemy directly?
3. Is case isolation in the query, and is ownership checked before any work?
4. Did I add the protocol method as well as the implementation?
5. Does the schema change have a reviewed, reversible migration — and does the seed still work?
6. Did I trace every DTO field I touched to its frontend and AI-context consumers?
7. Are the errors typed, coded and localized in both languages?
8. Do the tests cover unauthorized, cross-case, empty and malformed inputs?
9. Did I introduce an abstraction that should have been an ADR?
10. Would the deterministic fallback still hold if the model layer disappeared?
