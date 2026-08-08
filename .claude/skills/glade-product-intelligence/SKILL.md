---
name: glade-product-intelligence
description: >
  Product-intelligence skill for FreshStart / Glade Demo. Use before designing,
  modifying, reviewing, debugging, refactoring, testing, or extending any product
  capability whose correct implementation depends on understanding what the demo
  represents, who uses it, how the client and attorney workflows operate, how
  financial information and evidence move through the system, or what the AI
  assistant is allowed to do.
---

# Glade Product Intelligence

**Verified against `4.8.0`.** Every factual claim below about the code was
checked against the tree, and each one names how to re-check it. Claims that
could not be verified are marked `UNVERIFIED`. Re-verify before relying on any
of them: the failure this repository keeps producing is not a vague agent, it is
a confidently-wrong one (see `docs/agent-system/11-intelligence-rebuild-brief.md`
§0).

---

## 1. Purpose of this Skill

This skill gives an agent the product-level understanding required to work on
FreshStart / Glade Demo as a coherent system rather than as a collection of
pages, endpoints, components, and isolated tickets.

The agent MUST use this skill whenever a requested change can affect: user
journeys; client experience; attorney experience; case lifecycle; financial
data; evidence or documents; AI guidance; case analysis; dashboard information;
navigation; workflow stages; status transitions; role behavior; permissions;
product terminology; UX hierarchy; i18n; reports or summaries; demo presentation
quality.

This skill does NOT replace the specialized frontend, backend, AI, persistence,
security, design-system, testing, or release skills. It supplies the product
context those skills operate within. They tell an agent *how to make a change
safely*; this one tells it *what the change is for*.

---

## 2. Product Identity

**FreshStart Bankruptcy Guide** — repository/demo identity Glade Demo /
FreshStart. A bilingual financial-intake, evidence-organization,
case-preparation, and attorney-review demonstration platform.

The project demonstrates how one application can combine structured business
workflows, client and professional roles, financial data collection, evidence
management, document intelligence, persistent domain data, AI-assisted guidance,
professional review, responsive UI, reusable design-system components, bilingual
operation, secure API boundaries, and auditable case progression.

This is not a CRUD demonstration. The value is the integrated workflow, and
every capability should tell one story:

> A person can organize a complicated financial situation into a structured,
> reviewable case package, while the professional reviewing that case receives
> normalized facts, evidence context, missing-information signals, history, and
> intelligent assistance without surrendering professional judgment to AI.

---

## 3. The Problem the Demo Represents

Someone approaching a bankruptcy consultation has financial information spread
across memory, household records, pay information, expense records, creditor
notices, collection activity, debt balances, asset information, legal
correspondence and evidence documents. A professional cannot make a responsible
assessment from scattered, incomplete, poorly normalized information.

The platform helps answer: what facts have been provided; what is still missing;
what evidence supports those facts; what needs urgent professional attention;
what totals can be calculated safely; what gaps or inconsistencies exist; what
the client should prepare next; what the attorney should review; what has
happened so far; what questions should be discussed professionally.

The system organizes and analyzes. It does not make the legal decision.

---

## 4. Primary Actors

### 4.1 Client

The person preparing financial information for professional review. The
experience should let them progressively build a complete, understandable case
without legal expertise: authenticate; access their authorized case; describe
the situation and goal; flag urgent collection activity; provide household
information; record income, expenses, debts and assets; add evidence; review
calculated information; discover what is missing; receive safe AI guidance;
submit for review; understand status; follow subsequent activity.

Favor progressive disclosure, clarity, guidance and mobile usability. Never
require the client to understand internal architecture or legal classifications
before the system gives them something useful.

### 4.2 Attorney

The professional-review side, and **not** an admin user. The workflow shows how
structured client information becomes a review workspace: authenticate; access
authorized submitted cases; identify what needs attention; inspect normalized
cash flow, income and expense composition, secured/priority/unsecured debts,
assets and liens; review evidence coverage; identify missing information and
urgent facts; review history; use contextual AI assistance; request evidence;
add notes; change status; prepare a review summary; record next steps.

The professional remains responsible for legal conclusions.

> **Implementation status — verify before assuming.** Of the attorney actions
> above, the ones with a registered backend operation today are: authentication
> (`auth.login`, `auth.me`), analysis (`bankruptcy.analyze`), assistance
> (`bankruptcy.guide`) and document analysis (`documents.analyze`). Requesting
> evidence, adding professional notes, changing status and generating a review
> summary are **product intent**, and are currently either client-side only or
> absent. `CaseRepositoryProtocol.add_note` exists but no endpoint exposes it.
> Re-check with:
> `node -e "console.log(Object.keys(require('./contracts/api-contracts.json')))"`
> and `grep -rn "@router\." backend/app/api/routers`.

---

## 5. Core Product Journey

```text
Authentication → Case access → Situation / household → Income → Expenses →
Debts → Assets → Evidence / documents → Analysis → Completeness review →
Client submission → Attorney review → Information requests / professional
decision → Case timeline / next steps
```

The UI presentation may evolve. The domain journey must stay coherent.

---

## 6. Client Workflow

The client workflow begins with an incomplete case and gradually raises its
quality and review readiness.

**Stage A — Situation.** Capture why the request was started and facts that may
need prompt attention: lawsuits, garnishments, foreclosure, repossession,
arrears, collection activity, unusual recent transfers. These are *facts for
professional review*; never convert them automatically into legal conclusions.

**Stage B — Household.** Context that may influence how other information is
interpreted, but which stays factual.

**Stage C — Income.** Sources across wages, self-employment, Social Security,
pension/retirement, support received, rental and other income. Preserve the
original entry. Where frequency normalization exists, the backend computes the
monthly equivalent — never silently replace the user's amount with it.
*Verified: `_monthly_amount` in `backend/app/services/bankruptcy_service.py`.*

**Stage D — Expenses.** Recurring household expenses across housing, utilities,
food and household, clothing and laundry, medical and dental, transportation,
insurance and taxes, childcare, education, dependent-related, support paid,
personal care, recreation and other. They feed normalized cash-flow analysis.

**Stage E — Debts.** Creditor obligations classified as secured, priority or
unsecured, with creditor, description, balance, payment, delinquency,
collateral, collection activity, legal activity and evidence. The application
organizes these facts; it must not draw unauthorized legal classification
conclusions.

**Stage F — Assets.** Real property, vehicles, bank accounts, retirement
accounts, personal property, insurance value, business interests, claims or
rights to payment, other. Values, ownership and liens stay traceable to what was
provided.

**Stage G — Evidence.** Entered metadata, uploaded or analyzed demo documents,
extracted information, indexed content, linked case context. Evidence is not
decorative attachment functionality: it exists to improve completeness,
traceability, professional review and contextual AI assistance.

**Stage H — Review.** Help the client understand totals, missing sections,
missing evidence, incomplete information, warnings, unresolved questions and
readiness.

**Stage I — Submission.** Communicates that the client considers the information
ready. It must create a meaningful lifecycle transition, not behave as a visual
button with no domain consequence.

**Stage J — Tracking.** After submission the client should understand current
status, outstanding requests, recent activity, next steps and review
progression.

---

## 7. Attorney Workflow

Begins with structured information rather than an empty intake form, and should
prioritize review and decision support: which cases need attention, what
financial picture exists, what is missing, what evidence exists, what happened
recently, what needs professional discussion.

High-value composition:

```text
Case identity + Current status + Urgency signals + Cash flow +
Debt composition + Assets + Evidence coverage + Missing information +
Timeline + Recent conversation/context + Professional notes/actions
```

Do not force the attorney to reconstruct the case manually from isolated CRUD
screens.

---

## 8. Financial Analysis

The backend may calculate monthly income, monthly expenses, cash flow, debt
totals and composition, asset totals, completion indicators, evidence coverage,
missing information, warnings, questions and next-step suggestions.

Calculated information must stay distinguishable from user-entered facts.

```text
User facts → Validated structured data → Deterministic calculations →
Derived case indicators → Professional review
```

AI must not replace deterministic financial calculation where deterministic
logic exists.

*Verified: `BankruptcyAnalysisService.analyze` in
`backend/app/services/bankruptcy_service.py` produces `CaseAnalysisDto`;
`app/ai/runtime.py` computes the deterministic draft **first, always**, for
every request including ones the agent goes on to answer.*

---

## 9. Evidence and Document Intelligence

```text
Document → Extraction → Classification → Evidence extraction → Chunking →
Indexing → Retrieval → Authorized case context → AI assistance / review
```

Distinguish document storage, document metadata, extracted facts, searchable
chunks, evidence linked to a case, and retrieved AI context. Do not flatten them
into one generic "document" concept. Preserve provenance wherever supported.

*Verified: every stage has a module — `backend/app/services/documents/`
contains `extraction.py`, `classification.py`, `evidence_extraction.py`,
`chunking.py`, `embedding.py`, `index.py`, `ingestion.py`. Re-check with
`ls backend/app/services/documents`.*

---

## 10. AI Assistant Purpose

A contextual workflow participant, not a generic chatbot. Its job is to help the
user understand and move through the case using authorized information.

It may consider, where available: current role; authorized case; workflow state;
household; income; expenses; debts; assets; evidence; retrieved document
context; case timeline; recent conversation; missing information; calculated
metrics.

*Verified: `CaseContextDto` in `backend/app/schemas/assistant.py` carries
`timeline`, `recent_conversation` and `retrieved_documents`, populated by
`BankruptcyGuidanceService.guide()` before the context reaches a provider, and
`attorney_notes` only when the role is attorney.*

**AI should help with** explaining what information is needed; identifying
incomplete areas; summarizing what was provided; explaining financial
organization; preparing questions for professional review; guiding toward the
next relevant action; contextualizing retrieved evidence; helping attorneys
inspect a case; surfacing information already in the case.

**AI must not** provide definitive legal advice; choose Chapter 7 or 13; make
eligibility determinations; claim to perform an official means test; replace
attorney judgment; fabricate facts; silently modify financial records; use
information outside the authorization scope; invent document contents; claim
actions it did not execute.

---

## 11. AI Interaction Philosophy

Proactive but grounded means: understand the objective; inspect authorized
context; answer the immediate question; identify a directly relevant missing
fact or next action; guide toward completing the workflow; avoid asking for what
the context already contains.

It does not mean hallucinating, issuing legal conclusions, generating unrelated
suggestions, or changing records without an explicit supported action.

```text
User intent → Authorized case context → Relevant evidence retrieval →
Deterministic facts / calculations → LLM reasoning and communication →
Guardrails → Actionable response
```

> **Known failure mode, fixed and now gated.** Recognition happens *before*
> reasoning. `RuleBasedProvider` once reached its only review-raising branch by
> testing for the literal tokens "capítulo 7"/"chapter 7", so *"¿Debo declararme
> en bancarrota?"* fell through to a generic next-step answer with
> `requires_attorney_review` false, in both languages. Guardrails could not
> catch it: they inspect the *answer*, and the answer made no prohibited claim —
> it was simply off-topic. When guidance quality looks wrong, check intent
> classification before you touch prompts or guardrails.
> Gate: `cd backend && uv run pytest tests/evals`, scorecard
> `uv run python -m tests.evals.report`.

---

## 12. Persistence and Case Ownership

**Read this section carefully; its shape is not what either extreme of the
existing documentation says.**

What is true today, verified:

- **Server-side authorization is real and enforced.**
  `backend/app/services/case_access_service.py` provides
  `authorize_for_submission` and `authorize_for_case_id`, wired into
  `routers/bankruptcy.py` and `routers/documents.py`. A client-declared
  `owner_user_id` is never authoritative.
- **Backend persistence is real**: SQLAlchemy + Alembic behind repository
  protocols (`backend/app/repositories/protocols.py`). `CaseRepositoryProtocol`
  offers `get`, `get_owner_user_id`, `upsert_case_snapshot`,
  `record_timeline_event`, `get_recent_timeline`, `add_note`.
- **But there is no case CRUD API.** `contracts/api-contracts.json` registers
  eight operations: `health.get`, `ai.health`, `auth.login`, `auth.me`,
  `bankruptcy.analyze`, `bankruptcy.guide`, `documents.analyze`,
  `admin.resetDemoData`. No create, list, read, update or delete for a case.
  `analyze` and `guide` are stateless in shape: the whole case travels in the
  request body.
- **The case snapshot is persisted as a side effect** of those two calls, after
  authorization — `routers/bankruptcy.py:54` and `:99` call
  `cases.upsert_case_snapshot(...)`.
- **The client's working case therefore lives in the browser.**
  `frontend/src/workspace/BankruptcyWorkspaceContext.tsx` holds it in
  `localStorage` under `freshstart-bankruptcy-workspace-v2`, seeded with
  synthetic demo cases, and no frontend code reads a case back from the server.

So both of these statements are wrong, and an agent that believes either will
make a bad change:

- *"Persistence is browser-only"* — no: ownership, snapshots, timeline,
  documents and conversations are persisted server-side.
- *"The case is loaded from the backend"* — no: the frontend workspace is
  `localStorage`, and there is no endpoint to load it from.

Moving the workspace behind the API is therefore **a new API surface**, not a
refactor: new contract entries (a MAJOR change requiring an ADR), new repository
methods (list by owner, attorney queue, delete), a router and service with
ownership, a frontend client, server-side seeding of the demo cases, loading and
error states in every consumer, and a migration for existing `localStorage`.

Re-verify with:
`node -e "console.log(Object.keys(require('./contracts/api-contracts.json')))"`,
`grep -rn "@router\." backend/app/api/routers`,
`grep -n "STORAGE_KEY\|localStorage" frontend/src/workspace/BankruptcyWorkspaceContext.tsx`.

The canonical trust model, which is never bypassed for demo convenience:

```text
Authenticated identity + Server-side authorization + Case ownership rules
= Authorized case operation
```

---

## 13. API Contract Model

`contracts/api-contracts.json` is the operation source of truth. Frontend and
backend must not independently invent equivalent endpoint strings.

For API work: identify the registered operation; inspect its method and path;
inspect DTOs; inspect the frontend's generated contract metadata
(`frontend/src/api/apiContracts.generated.ts`); inspect the backend
registry/router; preserve synchronization. CI enforces the generated file is
in sync (`git diff --exit-code` after `contracts:generate`).

No magic endpoint strings.

---

## 14. Bilingual Product

Spanish and English. Bilingual behavior is a product requirement, not polish.
All user-facing copy uses the governed translation system, and a change to a
feature inspects both locales.

Defects: Spanish copy in English UI; English copy in Spanish UI; page-level
hardcoded strings; missing keys; translated labels backed by untranslated domain
values; AI states that ignore the selected language.

Canonical domain identifiers stay language-neutral; presentation text is
translated at the UI boundary.

> **The defect class this repository keeps producing** is copy generated in one
> language and then *persisted*, so a later language switch cannot fix it. The
> case timeline stored Spanish prose in `localStorage`; the backend's guardrails
> and analysis copy were Spanish-only until 4.2.0. When you add copy generated
> at runtime, persist the **key**, not the sentence — unless the text is a
> record of what a person actually said or wrote, which is not translatable.
> Gate: `npm --prefix frontend run i18n:check`.

---

## 15. Design and UX Meaning

UI decisions reinforce the product journey; do not optimize a page while
damaging workflow comprehension. The interface communicates where the user is,
what the current task is, what is done, what remains, what needs attention, what
the primary action is, what happened after an action, and what comes next.

Desktop/tablet use a persistent workflow/navigation model. Mobile exposes
focused workflow sections rather than a squeezed desktop workspace. Navigation,
modals, actions, forms, tables, cards, AI surfaces, tooltips and overlays are
validated independently for mobile.

*Governed viewports: 320 / 390 / 768 / 1024 / 1440 (`frontend/CLAUDE.md`).*

---

## 16. Reusable UI Principle

The product should look like one application.

```text
Design tokens → Primitive/shared UI → Molecules → Organisms →
Feature composition → Pages
```

Do not hand-build repeatedly: action buttons, modal structures, form controls,
navigation patterns, dropdowns, tooltips, data presentation, confirmation
dialogs, empty states, badges, AI message primitives. If several features need
the same pattern, improve the shared abstraction.

*Enforcement today: `npm run agent:flowbite` checks design-system compliance and
carries a registry of accepted exceptions. A canonical-component registry
(`docs/system/KNOWN-PATTERNS.md`) does **not** yet exist — see
`docs/agent-system/11-intelligence-rebuild-brief.md` §3 Phase 3.*

---

## 17. Product Invariants

- **INV-001 — No automated legal conclusion.** The system organizes facts and
  assists review; it does not make the attorney's decision.
- **INV-002 — Financial facts remain traceable.** User values are never silently
  transformed; derived values are identifiable as derived.
- **INV-003 — Case access is server-authorized.** Never trust client-declared
  ownership.
- **INV-004 — AI context is authorized.** The assistant receives only what the
  active identity may use.
- **INV-005 — Evidence is case-scoped.** Retrieval never crosses case
  boundaries.
- **INV-006 — Client and attorney workflows are related but distinct.** Do not
  collapse them into one generic dashboard.
- **INV-007 — Domain status has meaning.** Status and timeline transitions
  represent actual workflow state.
- **INV-008 — i18n is complete.** A feature that works in one language is
  incomplete.
- **INV-009 — Responsive behavior is functionality.** A feature unusable at a
  supported viewport is broken.
- **INV-010 — Shared patterns remain shared.** Do not solve systemic problems
  with repeated page-level patches.

---

## 18. How an Agent Must Analyze a Request

1. **Affected capability** — client intake, financial forms, evidence, attorney
   review, AI, navigation, case lifecycle, persistence, API, i18n, shared UI.
2. **Affected actors** — client, attorney, both, AI, backend only.
3. **Domain impact** — case state, financial values, evidence, status,
   ownership, calculations, AI context.
4. **Integration impact** — API contract, backend service, repository, DTO,
   frontend service, state, UI, translations, tests.
5. **Find canonical abstractions** — search before creating.
6. **Implement at the correct abstraction** — fix the owning layer; never patch
   every consumer when a shared primitive is responsible.
7. **Inspect related implementations** — siblings, direct consumers, the same
   pattern elsewhere; correct directly related low-risk inconsistencies.
8. **Verify the full affected journey** — not unit-level compilation.

---

## 19. Product-Aware Definition of Done

**Functional:** the explicit request works; the surrounding workflow stays
coherent; role behavior is correct; state transitions work; the API contract is
valid; persistence behaves correctly.

**UX:** primary action clear; loading, empty, error and success states where
needed; mobile and desktop both work; overlays do not collide; no incorrect
overflow.

**Data:** source facts accurate; derived values correct; ownership enforced; no
cross-case leakage.

**AI:** authorized context only; relevant context included; guardrails applied;
fallback works; no fabricated execution; correct language.

**i18n:** Spanish verified; English verified; no new hardcoded user-facing copy.

**Quality:** targeted tests pass; integration tests pass; build passes; browser
verification for UI changes; related regression surfaces inspected.

---

## 20. Proactive Product Completion Loop

```text
Explicit request → Direct dependents → Sibling implementations →
Shared abstractions → Related product invariants → Regression surfaces →
Verification
```

Fix a directly related defect when it is clearly in scope, objectively
incorrect, low-risk and verifiable, rather than knowingly leaving the capability
inconsistent. Do not expand into unrelated refactors: the objective is coherent
completion, not scope growth.

**And record what you do not fix.** Anything found but left — out of ownership,
higher risk, or a different change — goes in the change fragment with its
evidence, and, where the defect is expressible as a test, as a
failing-but-registered check. `backend/tests/evals/scenarios.py`'s `known_gap`
is the working model: it fails if the defect is silently fixed, so the fix
cannot land without closing the record. Without this step, "no actionable defect
remains" decays into "I stopped looking."

---

## 21. Questions the Agent Must Be Able to Answer

Before claiming a major feature complete: what user problem does it solve; which
actor uses it; where does it sit in the case journey; what data does it read;
what data does it change; what backend operation owns the behavior; what
persistence boundary applies; what authorization applies; does AI consume or
affect it; what evidence relationship exists; how does it work in Spanish; in
English; on mobile; on desktop; what happens while loading; with no data; on
failure; what test proves it; what could regress; why is it at this abstraction
level.

If several cannot be answered, the agent does not understand the feature well
enough to refactor it safely.

---

## 22. Anti-Patterns

Never: treat the demo as unrelated CRUD pages; implement UI without
understanding the workflow; make legal recommendations through AI; duplicate
business calculations in React; bypass repository/service boundaries; trust
client-supplied ownership; send unrestricted case data to AI; invent evidence;
patch translations directly into components; create duplicate design patterns;
introduce magic API paths; claim responsive quality without checking the
governed viewports; confuse a successful HTTP request with successful product
behavior; stop after fixing the exact element named by the user when the same
root defect affects the shared system.

**And one more, learned from this repository's own history:** never state a fact
about the code without a way to re-check it. Two generations of agent and skill
prose here have shipped assertions that were true when written and false within
weeks — a deleted provider file still being searched for, a sidebar declared not
to exist, blockers declared open that were already closed. A claim with no
re-verification path is a future false statement.

---

## 23. Source-of-Truth Priority

1. current executable architecture and tests
2. `AGENTS.md`
3. `CLAUDE.md`
4. `contracts/api-contracts.json`
5. current product blueprint (`docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`)
6. current architecture documentation
7. current flow specifications
8. current ADRs
9. dated audit documents
10. release notes
11. historical plans

Dated audits are snapshots. Never let one override current implementation —
including this skill, which is itself dated.

---

## 24. Final Principle

FreshStart / Glade Demo should demonstrate a believable professional system, not
a collection of technical features. Every decision preserves the narrative:

**collect → structure → validate → support with evidence → analyze → identify
gaps → assist intelligently → submit → review professionally → track next
steps.**

Between two implementations, prefer the one that makes that workflow clearer,
safer, more reusable and easier to verify.
