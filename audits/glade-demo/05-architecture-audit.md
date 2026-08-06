# 05 — Architecture Audit

## Frontend reuse

The progression the master brief asks for (tokens → basic UI → forms → feedback → data → composed
→ layouts → features) is genuinely present, not just organized into folders that look right:

- `ui/AppButton`, `feedback/ConfirmDialog`, `data-display/DataTableToolbar` + `RowActionsMenu` are
  new, generic, domain-agnostic primitives added this pass specifically because pages were
  hand-rolling buttons/menus/dialogs per-screen (verified: `RowActionsMenu` replaced inline
  Flowbite `Dropdown` + button markup duplicated in the attorney dashboard's row actions).
- `hooks/useConfirmation`, `hooks/useDisclosure` factor out state patterns (open/close, confirm/
  cancel) that were previously ad hoc `useState` booleans per component.
- `services/api/apiClient.ts` + `services/crud/createCrudService.ts` are a generic REST-call
  factory — not yet adopted everywhere (the existing `bankruptcyApi.ts`/`authApi.ts`/`aiApi.ts`
  still hand-write their calls), so this is a **partially-completed reuse migration**: the
  primitive exists but hasn't replaced its predecessors yet. Worth finishing or removing if unused.
- Configuration (income/expense/debt/asset/evidence categories) lives in one file
  (`config/bankruptcyOptions.ts`) as canonical slugs, consumed by both form dropdowns and — after
  this pass's fixes — by the matching logic that checks evidence completeness. Before the fix, two
  independent call sites (frontend and backend) each re-implemented their own slug↔label
  assumptions and drifted out of sync with each other; see finding below.
- Translations, validations, and business rules are cleanly separated: components call `t()` with
  namespaced keys, never inline strings (confirmed no remaining hardcoded UI strings after this
  pass's fixes to `RowActionsMenu`, request-document, and status-change flows).

## Backend reuse

- Controllers are thin: every router handler is 5–15 lines, delegates to a service, returns a DTO.
  No business logic found inside a router in this pass.
- Services depend on Pydantic DTOs and a settings object, never a concrete DB/ORM (there is none —
  see `01-system-map.md`), so the "services depend on provider protocols, not concrete
  implementations" rule (AGENTS.md #3) is satisfied by construction rather than by discipline: the
  pluggable AI provider architecture (`ai/providers/base.py` protocol + `factory.py`) is a real,
  working instance of this pattern, not just a rule on paper.
- Centralized error handling: `DomainError` hierarchy with `code`/`message_key` + three FastAPI
  exception handlers (`DomainError`, `HTTPException`, `RequestValidationError`) produce one
  consistent, localized JSON error shape (`code`, `messageKey`, `message`, `parameters`, `traceId`)
  everywhere — verified this pass while fixing the missing-accents bug in the error catalog.
- `contracts/api-contracts.json` as a single source of truth for operation id/method/path/
  controller/action, loaded into a registry both the backend routers and the frontend's generated
  client read — this is the strongest reuse/consistency mechanism in the codebase and is exactly
  what AGENTS.md's non-negotiable rule #1 asks for.
- No repository/unit-of-work layer exists, which is *correct* here, not a gap: there's no database
  to abstract (see below). Introducing one now would be exactly the "artificial abstraction" AGENTS.md
  warns against.

## Findings from this audit pass

### 1. Evidence-type slug refactor broke two independent, duplicated matching implementations (fixed)

The frontend (`CaseWorkspacePage.tsx`'s `requiredEvidencePresent`) and backend
(`bankruptcy_service.py`'s `_evidence_matches`) each independently fuzzy-match a Spanish requirement
string against evidence-type values. When evidence types moved from literal Spanish strings to
canonical slugs (a good change, needed for i18n), **both** matching functions broke identically,
because neither is the other's source of truth — they're two hand-written reimplementations of the
same concept. Both were fixed to resolve the slug to its canonical label before matching, but the
underlying duplication remains: a future change to evidence-type slugs will need to be applied
correctly in both places again, with nothing enforcing that. **Recommendation**: if this domain
keeps evolving, consider a single shared "evidence requirement satisfied" concept exposed by the
backend (which already computes `required_evidence`) rather than the frontend re-deriving its own
completion percentage with its own copy of the matching heuristic.

### 2. Tab-transition race (functional finding, architectural root cause — not fixed)

`CaseWorkspacePage.tsx` mixes two mechanisms for driving the active tab: a controlled `activeTab`
state updated via Flowbite's `onActiveTabChange` callback (for clicks), and an imperative
`tabsRef.current.setActiveTab(index)` ref call (for programmatic jumps from the chat's suggested
actions and the attorney-review shortcut). In one reproduction, a tab switched via the imperative
path left its previous panel un-hidden, overlapping the newly active one and intercepting clicks —
plausibly because the ref-based path and the click-driven path don't reliably converge on the same
internal "which panel is hidden" state. This wasn't reliably reproducible in isolation, which is
itself a signal of a timing race rather than a deterministic bug. **Recommendation**: pick one
mechanism — either drive `Tabs` fully as a controlled component (`activeTab` prop instead of the
ref) so both click and programmatic navigation go through the same state update, or confirm with
Flowbite's docs/issues whether `setActiveTab()` is documented to synchronously update panel
visibility. This is a P2, not a P0/P1 — the demo click cadence (with `expect().toBeVisible()` waits)
never actually hit it in three consecutive stable e2e runs — but it's worth root-causing before this
navigation pattern is reused elsewhere.

### 3. Unused database infrastructure

`render.yaml` and `docker-compose.yml` both provision Postgres and wire `DATABASE_URL` into the API
container, but no code in `backend/app` ever connects to it. This isn't broken — it's just paying
for and configuring infrastructure the app doesn't use yet. It's almost certainly reserved for the
document-ingestion RAG index (`services/documents/index.py` and friends already exist as a scaffold)
but that isn't stated anywhere. **Recommendation**: either wire it up, or add a one-line comment in
`render.yaml`/`docker-compose.yml` saying it's reserved for the (currently rules-based) document
pipeline's future vector index, so the next engineer doesn't assume it's dead weight to delete.

### 4. Frontend bundle size

`vite build` warns on a single 758 KB (228 KB gzip) JS chunk. Not demo-breaking (page loads
in well under a second on a normal connection), but worth code-splitting (e.g. lazy-loading the
attorney dashboard/case-workspace routes, which likely account for a large share of the bundle)
before this app needs to scale past a demo — flagged in the master brief's performance section as
something to prioritize only if it's perceptible during the actual demo, which at this size it
is not.

## What's genuinely well-designed here (worth stating, not just gaps)

- The AI-provider architecture is a legitimate abstraction, not over-engineering: three
  interchangeable providers (deterministic/rule-based default, local Ollama, optional
  Transformers) behind one `BaseAIProvider` protocol, with the deterministic provider as both the
  default *and* the automatic fallback when a model-backed provider is unavailable or errors.
  `CaseContextBuilder` reduces the full case to a per-role-redacted, locale-aware context before any
  AI provider sees it — attorneys never leak client-private notes to a client's context and vice
  versa, verified by a dedicated redaction test (`test_case_context_builder.py`).
- `ResponseGuardrails` (mentioned in `RELEASE_NOTES.md` 3.0.0, confirmed present in `ai/guardrails.py`)
  softens eligibility/chapter-recommendation language on every AI turn — an actual product-boundary
  enforcement mechanism, not just a disclaimer string.
