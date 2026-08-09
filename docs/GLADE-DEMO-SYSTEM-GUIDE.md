# FreshStart — system guide

Study material for explaining this system confidently. Every architectural
claim below was checked against the code in this repository at **4.14.0**, not
recalled. Where documentation and code disagreed, the code won and this file
describes the code.

---

## 1. Executive overview

**What it is.** FreshStart is a bankruptcy-*preparation* workspace for two
people: a client organizing their finances, and the attorney who will advise
them. It is not a filing tool and not a legal-advice tool.

**The problem it demonstrates.** Someone considering bankruptcy arrives at a
consultation with a shoebox: incomplete income figures, half the creditors,
no documents. The attorney spends the first (billable) hour doing data entry
instead of judgement. FreshStart moves that work before the meeting, structures
it, and surfaces what is still missing — so the consultation starts from a
complete file and a list of real questions.

**Users.** A *client* preparing their own case, and an *attorney* triaging a
queue of them.

**What the demo proves.** That an AI assistant can be genuinely useful inside a
regulated workflow without ever being authoritative: it reads authorized case
data through tools, explains it, and prepares questions — while every figure,
every authorization decision and every legal boundary stays in deterministic
Python. `AGENTS.md` states the product boundary: no eligibility determination,
no chapter selection, no legal advice.

**Why built this way.** The interesting engineering problem is not "add a
chatbot". It is: how do you let a language model help, when a wrong answer has
consequences, the data is sensitive, and two roles must never see each other's
material? Almost every decision in here follows from that question.

---

## 2. Product story

### Client journey

```text
Login
 → dashboard: where the case stands, the one next action
 → My case: household → income → expenses → debts → assets
 → Documents: evidence checklist, what is covered, what is not
 → Assistant: ask about the case at any point
 → Review: confirm before sending
 → Submit to attorney → Activity: what happens next
```

Why it matters: the client does not know what a bankruptcy consultation needs.
The guided stages (`frontend/src/pages/caseWorkspace/stages.ts`) name it, the
completion score measures it, and the assistant answers "what am I missing?"
from the same computed state the screen shows.

### Attorney journey

```text
Login
 → case inbox: every authorized case, filterable and sortable
 → triage: urgent / incomplete / waiting on client / submitted
 → Assistant (portfolio scope): which need attention, and why
 → open a case
 → financial context, evidence, alerts, private notes
 → case actions: request a document, add a note, schedule, change status
 → attorney review
```

Why it matters: the attorney's scarce resource is attention. The portfolio view
answers "which of these is actually moving" from recorded signals — a filed
collection lawsuit outranks a client's own urgency flag, which outranks an
incomplete file.

---

## 3. Architecture

```text
React 19 / TypeScript / Vite          frontend/src
        ↓  typed API clients           frontend/src/api
FastAPI routers                        backend/app/api/routers
        ↓  HTTP concerns only
Application services                   backend/app/services
        ↓  business orchestration
Repository protocols                   backend/app/repositories/protocols.py
        ↓  Protocol, not concrete class
SQLAlchemy repositories                backend/app/repositories/*_repository.py
        ↓
Database (SQLite in the demo)          DATABASE_URL
```

The assistant is a second path through the same services:

```text
User message
 ↓
ChatPanel                              frontend/src/components/organisms/ChatPanel.tsx
 ↓  POST /api/v1/bankruptcy/guide
CaseAccessService                      server-side ownership check, before anything else
 ↓
BankruptcyGuidanceService              analysis → retrieval → history → context
 ↓
CaseContextBuilder                     reduced, role-redacted CaseContextDto
 ↓
AgentRuntime.execute                   backend/app/ai/runtime.py
 ├─ 1. deterministic draft FIRST, always (RuleBasedProvider)
 └─ 2. Strands orchestrator            backend/app/ai/agents/factory.py
        ↓
      specialist agent                 case / analysis / documents / support / attorney / portfolio
        ↓
      authorized tool                  CaseTools · PortfolioTools
        ↓
      Python service                   BankruptcyAnalysisService, CaseDocumentIndex
        ↓
      authoritative case data
        ↓
      structured AgentAnswer           backend/app/ai/contracts/assistant_response.py
        ↓
 3. action allow-list + ResponseGuardrails
 4. AssistantResponse composed server-side (disclaimer, review flag)
 ↓
UI
```

Read `AgentRuntime.execute`'s docstring — the order of those four steps *is* the
contract.

---

## 4. Technology, and why each piece is here

| Technology | Responsibility | Why |
| --- | --- | --- |
| **React 19 + TypeScript** | The two role workspaces | Case entry is stateful, incremental and heavily conditional; types keep DTO shapes honest across ~70 components |
| **Vite** | Dev server and build | Fast HMR; `define` injects `__APP_VERSION__` from the root `VERSION` file |
| **Flowbite React + Tailwind 4** | Behaviour + tokens | Flowbite supplies accessible behaviour (accordion, modal, tabs); the product supplies the visual language through semantic tokens in `index.css`. Pages compose wrappers, never raw Flowbite |
| **i18next** | ES/EN | Puerto Rico is bilingual; the product would be unusable in one language only |
| **Python 3.13 + FastAPI** | HTTP boundary | Async, typed, and it puts the AI layer in the same process as the domain — no second service to keep in sync |
| **Pydantic v2** | DTOs at every boundary | The AI's structured output is a Pydantic model, so an unusable model response fails validation instead of reaching a user |
| **SQLAlchemy + Alembic** | Persistence | Real schema and migrations (`backend/alembic/versions/700b27b6dfe1_initial_schema.py`), not a JSON blob |
| **Repository protocols** | Dependency inversion | Services depend on `Protocol` types in `repositories/protocols.py`; tests substitute fakes without a database |
| **SQLite (demo) / any `DATABASE_URL`** | Storage | `database_url` defaults to `sqlite:///./data/freshstart.db`; a managed Postgres URL is a config change, not a code change |
| **pwdlib (Argon2) + PyJWT** | Auth | `PasswordHash.recommended()` for hashing; signed JWT with issuer/audience/expiry in `core/security.py` |
| **Strands Agents** | Orchestration | Agents-as-Tools: an orchestrator whose only tools are specialists. Optional extra — nothing imports it at module scope |
| **Provider adapter** | Model access | `ModelFactory` builds OpenAI-compatible or Ollama models; `AGENT_PROVIDERS` gates which can route agentically |
| **Document pipeline** | Evidence | extraction → classification → chunking → embedding → `CaseDocumentIndex` |
| **pytest / Vitest / Playwright** | The three test layers | See §12 |

---

## 5. Design patterns actually used

- **Repository pattern with protocols** — `CaseRepositoryProtocol`,
  `DocumentRepositoryProtocol`, `UserRepositoryProtocol`,
  `AIConversationRepositoryProtocol`. Services never import SQLAlchemy.
- **Service layer** — `BankruptcyAnalysisService` (arithmetic and generated
  prose), `BankruptcyGuidanceService` (one assistant turn),
  `CaseAccessService` (authorization), `CaseContextBuilder` (reduction).
- **DTOs at every boundary** — `BankruptcyCaseDto` in, `CaseAnalysisDto` out,
  `CaseContextDto` to the AI, `AgentAnswer` from the model,
  `AssistantResponse` to the client. Five shapes, five purposes.
- **Dependency injection via `Annotated[..., Depends(...)]`** — `CurrentUserDep`,
  `CaseRepositoryDep`, `CaseAccessDep`.
- **Composition over repetition in the UI** — primitives (`AppButton`,
  `IconButton`, `Typography`) → shared molecules → domain components
  (`components/case/`) → pages.
- **Specialist agents with a closed tool grant** — `SPECIALISTS` in
  `agents/factory.py` is a table you can read in one screen.
- **Deterministic fallback** — every turn has an answer even with no model.

---

## 6. AI architecture — *Strands decides, Python knows*

**Strands decides** what information a question needs and which specialist
should answer it. **Python knows** the facts, does the arithmetic and owns
authorization. The model's job is to explain.

- **Orchestrator** (`prompts/*/orchestrator.md`) — routes to a specialist. It
  holds **no data tool of its own**, so every fact in an answer arrived through
  a specialist that was granted the matching tool.
  `test_agent_wiring_integration.py::test_orchestrator_holds_no_case_data_tool_of_its_own`
  pins that.
- **case_agent** — where the case stands, what is missing.
- **analysis_agent** — any answer containing an amount; chapter questions.
- **documents_agent** — every evidence question.
- **support_agent** — how the app works. No case tools at all.
- **attorney_agent** *(attorney only)* — private notes, alerts, what to review,
  which toolbar action to use.
- **portfolio_agent** *(attorney only)* — reasoning across cases.
- **CaseTools / PortfolioTools** — the only way to case data.
- **AgentAnswer** — `message`, `handled_by`, `actions`, `cards`. Deliberately
  small: no `disclaimer`, no `requires_attorney_review`.
- **ResponseGuardrails** — bilingual patterns that soften eligibility and
  chapter claims and raise the review flag.
- **RuleBasedProvider** — the deterministic floor.

Role gating happens at **construction**: an attorney-only specialist is never
built for a client runtime (`AgentFactory._is_grantable`), and the tool checks
again anyway.

---

## 7. Why tools instead of stuffing the prompt

The rejected alternative is one line: `prompt += case.model_dump_json()`.

| | Prompt dump | Tools |
| --- | --- | --- |
| Context size | The whole case, every turn | Only what the question needs |
| Sensitive data | Attorney notes included by accident | Redacted before the tool exists |
| Authority | Model may restate a stale figure | `get_financial_snapshot` returns the computed one |
| Hallucination | Plausible numbers between real ones | A fact came from a tool or it is not in the answer |
| Testing | Assert on prose | Assert the tool ran and what it returned |
| Authorization | Invisible | `CaseTools.__init__` is the boundary |
| Observability | "The model said something" | `AgentExecutionTrace.tools` lists every call |

Concretely: `AgentRuntime._build_prompt` carries the language, the role and the
user's message — plus recent conversation, framed as inert data. No case facts.

---

## 8. Case vs portfolio authorization

```text
CaseTools(context=…)        closed over ONE authorized case
PortfolioTools(entries=…)   closed over an ALREADY-FILTERED attorney portfolio
```

**No tool takes a `case_id`, a `role`, or any authorization parameter.** The
case is closed over at construction, from the `CaseContextDto` that
`CaseAccessService.authorize_for_submission` already produced.

Why this beats "pass the model a `case_id` and re-validate downstream": that
design puts a model-authored string on the authorization path, and it is only as
safe as every future call site remembering to re-check. Binding at construction
removes the class of bug rather than validating against it. A model can call
every tool in any order with any arguments and still cannot reach a case it was
not granted — pinned by
`test_agent_security.py::test_no_tool_accepts_a_case_identifier`, which fails if
anyone adds such a parameter.

---

## 9. Deterministic calculations

The model never computes an authoritative value. `BankruptcyAnalysisService`
does, from the case's own rows: monthly gross and net income (frequency
normalized), monthly expenses, cash flow, total/secured/priority/unsecured debt,
asset totals, `completion_score`, `evidence_score`.

Example. Elena earns $1,200 gross / $950 net biweekly.

```text
Python:  950 × 26 ÷ 12 = 2,058.33 monthly net
         2,058.33 − 2,400.00 expenses = −341.67 cash flow
Model:   "Your budget is short by $341.67 a month, which is the figure to
          take to the consultation."
```

The tool's docstring says it out loud: *"Report them as given. Never add,
subtract, project or re-derive them."* And `test_analysis_localization.py`
asserts the figures are identical in both languages — prose changes, arithmetic
does not.

---

## 10. Evidence and document intelligence

Four distinct concepts, and conflating them is what made evidence answers
useless for a release:

| Concept | Where | Meaning |
| --- | --- | --- |
| `held_documents` | `CaseContextDto` | What the client actually uploaded |
| `satisfied_requirements` | `evidence_requirements[].satisfied` | Requirements those documents cover |
| `unsatisfied_requirements` | same, `false` | What "missing evidence" means |
| `pending_documents` | `CaseContextDto` | Documents an **attorney requested** |

`pending_documents` used to be the *only* document field. It is empty on almost
every case, so *"¿qué documentos me faltan?"* was answered "no hay documentos
pendientes" — true about requests, useless about evidence, and identical to the
answer for "what do I have?". `get_evidence_status` exists to return all four at
once, because answering any document question needs the contrast between them.

**Canonical slugs, not translated prose.** `EVIDENCE_REQUIREMENT_TYPES` maps a
requirement key to the evidence-type slugs that satisfy it. Matching used to
intersect the requirement's Spanish *words* with the evidence type's Spanish
*label*, which meant business logic depended on interface language — so the
requirements could not be translated without zeroing `evidence_score`. It was
also wrong within Spanish: `"Estados bancarios recientes"` never matched
`"Estado bancario"` (plural vs singular), while `"…o estado hipotecario"`
matched it on the stray word `"estado"`, so a bank statement satisfied the
housing requirement and not the banking one. **Business rules key on slugs;
language is presentation.**

---

## 11. RAG, multi-turn, i18n, frontend, responsive

### RAG

```text
upload → extraction → classification → chunking → embedding
       → CaseDocumentIndex (one bucket per case_id)
       → search(case_id, query, top_k=3)   ← called by BankruptcyGuidanceService
       → CaseContextDto.retrieved_documents / search_case_documents tool
```

Case scoping is **by construction**: a dict keyed by `case_id`, not a flat list
filtered afterwards. Excerpts are treated as untrusted client-authored data —
the prompts say so, and `test_agent_security.py` pins that an injected
instruction changes no action, flag or authorization.

**Honest limitation:** the index is in-memory and per-process
(`services/documents/index.py`). It is rebuilt on restart, and on Vercel's
ephemeral filesystem that means per-invocation. FAISS/Chroma sit behind the
optional `rag` dependency group for a persistent implementation of the same
interface.

### Multi-turn

Both halves of each exchange are persisted to `ai_conversations`
(`BankruptcyGuidanceService.guide`), read back as
`CaseContextDto.recent_conversation`, and injected as an `EARLIER TURNS` block
explicitly framed as data, never instructions. That is what lets *"why those?"*
resolve against the previous answer while *"and how much debt do I have?"*
still switches topic — the prompt says to use history only to resolve what the
current message refers to, and to answer the new subject when the subject
changes. What is stored is the *guarded* message, so a later turn cannot read
back a phrasing the guardrails removed. No chain-of-thought is stored or sent.

### i18n

`resolveLanguage` (`frontend/src/i18n/languages.ts`) is the single rule:
**profile → stored preference → browser locale → default**. The UI resolves
through it in `LanguageProvider`; the demo seed resolves through it in
`BankruptcyWorkspaceContext.activeLanguage`. They disagreed once — the seed had
a private fallback to Spanish — and production rendered an English interface
around a Spanish case file. Backend prose is generated in the session's language
from `analysis_copy.py`; `i18n:check` enforces ES/EN key parity as a build gate.

### Frontend layering

```text
pages/                     purpose, header, primary action, composition
  LoginPage                hero copy, real login form, direct demo entry
  ClientDashboardPage      client summary, next action, evidence, activity
  AttorneyDashboardPage    portfolio triage, filters, actions
  components/case/         domain panels and case-specific composites
  components/molecules/    shared composites (ResponsiveDataView, FloatingField)
  components/ui|atoms/     primitives (AppButton, IconButton, AppIcon)
  Flowbite + index.css     behaviour + semantic tokens
```

Before `components/case/` existed, every panel was a hand-written `<Card>` with
its own border, heading size and bullet treatment — a dozen near-copies that had
already drifted into four heading sizes and three list styles.

### Responsive

Below 768px the app collapses to mobile-friendly layouts instead of shrinking
desktop chrome in place. The login page keeps the purpose text above the form,
the demo buttons stack, and the backdrop is treated as atmosphere rather than a
focal image. The dashboards use their own responsive primitives, so the switch
happens once per surface instead of through duplicated markup.
`frontend/e2e/login-demo-access.spec.ts` and the viewport gate sweep
320→1440.

---

## 12. Testing strategy

```text
pytest        385   services, authorization, guardrails, agent wiring, golden scenarios
Vitest        143   components, hooks, contract mirrors
Playwright    121   real journeys in a real browser, ES and EN, 320→1440
```

What each catches: pytest catches business rules and authorization; Vitest
catches component behaviour and the frontend's copy of a contract drifting;
Playwright catches everything that only exists when the whole thing runs — the
CSP blocking an image, a control below the fold, a language leak in rendered
DOM.

**Two lessons worth telling.**

1. **A printed summary is not a result.** Vitest printed `Tests 143 passed (143)`
   and exited **1** — a `TypeError` had reached its unhandled-error channel from
   a click handler, which fails a *run* without failing a *named test*. It
   shipped. `npm run release:verify` now judges every gate by exit code and
   parses no output.
2. **Playwright will happily test the wrong code.** With
   `reuseExistingServer` on, a release run accepted a sibling worktree's dev
   server on the port it picked and spent three minutes measuring another
   branch. Release mode now disables reuse, asks the OS for free ports, and
   refuses to start unless `/api/v1/health` reports this checkout's version.

A third, smaller one worth keeping: an asset can return **200 with the right
content-type and still be broken**. The login backdrop was invalid XML (a `--`
inside an XML comment), so it served perfectly and painted nothing. The test now
decodes it.

---

## 13. Observability

`AgentExecutionTrace` (`backend/app/ai/tracing.py`) emits one record per turn:
`correlation_id`, `provider`, `model`, `runtime_mode`, `role`, `language`,
`agent`, `specialist`, `tools` (name, status, duration), `degraded`,
`fallback_reason`, `handled_by`, total duration. It is emitted in a `finally`,
so a turn is never unobservable.

It deliberately does **not** record chain-of-thought, case contents, notes or
credentials. The point is to distinguish *the model answered poorly* from *the
model never received the data* — which is a debugging question, not a reason to
log someone's finances.

---

## 14. Security

- **Authentication** — Argon2 via `pwdlib`, signed JWT with issuer, audience and
  expiry; login is rate-limited.
- **Roles** — `client` and `attorney`, from the authenticated session. A `role`
  in a request body that disagrees with the session is rejected 403
  (`guide_case`).
- **Case ownership** — `CaseAccessService.authorize_for_submission` looks up the
  *persisted* owner and never trusts the client-submitted `owner_user_id`.
- **Portfolio** — resolved server-side from the session; a client asking for
  portfolio scope is refused, not handed a one-item list.
- **The model cannot grant itself access** — no tool takes an authorization
  parameter; actions are filtered against `ALLOWED_ACTION_RESOURCES`;
  `requires_attorney_review` is OR-combined and can only rise.
- **Secrets** — server-side only; `.env*.local` is gitignored.
- **Data** — every demo record is synthetic.

---

## 15. Fallback architecture

```text
agentic success     model answered, tools ran, guardrails passed   degraded=false
degraded success    deterministic draft answered                   degraded=true
hard failure        does not exist on this path
```

The deterministic draft is computed **first, for every request**, including ones
the agent goes on to answer — it is both the fallback and the
`requires_attorney_review` baseline. Any failure in the agent layer returns it
with `degraded=true`. There is no path where a model outage produces an error.

This is a strength, not an apology. The product must answer a distressed person
asking about their finances; "the AI is down" is not an acceptable state. And
because the floor exists, the agent layer is free to be strict — an unusable
structured output is discarded rather than salvaged.

---

## 16. Known limitations

- **No live model credential in this environment.** The agentic path is proven
  end to end with a fake at the provider boundary (`tests/support/fake_model.py`,
  which reacts to the tools it is offered and cannot answer until a real tool
  ran). Prose quality against a real model is therefore **not** measured.
- **In-memory document index** — per process, rebuilt on restart.
- **Ephemeral persistence on Vercel** — SQLite on a serverless filesystem. A
  managed `DATABASE_URL` is a configuration change.
- **One attorney, no assignment table** — "attorney may access assigned cases"
  is approximated as "any existing case". A `case_assignments` table would
  narrow `_ensure_role_can_access`.
- **Conversation history is case-scoped, not role-scoped** — a client and their
  attorney share a case's chat history. Documented in
  `AIConversationRepositoryProtocol`.
- **No attorney-initiated intake** — an attorney cannot open a case for a
  walk-in client; a case must have a client owner.
- **Write actions are phase 2** — the action vocabulary is read-only by
  decision; `requires_confirmation` is already carried so the flow stays
  additive.

**For production:** managed Postgres, a persistent vector store, per-attorney
assignment, structured log shipping, a real secret manager, and the signed
confirmation flow before any write action.

---

## 17. Questions Glade may ask

### Product

**What problem does this solve?**
*Short:* consultations start from a shoebox; this makes them start from a
structured file and a list of real questions.
*Deeper:* completeness is measurable — `completion_score` over eight sections,
`evidence_score` over adaptive requirements — so "what is missing" is computed,
not guessed.
*Point at:* `BankruptcyAnalysisService.analyze`.

**Why these two roles?**
*Short:* they are the two people in the room, and they must see different things.
*Deeper:* the split is what makes authorization real rather than decorative —
attorney notes exist only in an attorney's context, and role gating happens at
agent construction.
*Point at:* `CaseContextBuilder.build`, `AgentFactory._is_grantable`.

**Most valuable workflow?** Evidence. It is where "what do I still owe you" has
a precise answer, and where the assistant does something a checklist cannot:
prioritize and explain.

### Architecture

**Why Python/FastAPI?** The AI layer and the domain live in one process, so a
tool calls a service directly instead of crossing a network boundary; typed
async HTTP with Pydantic at the edges.

**Why React?** Case entry is stateful, incremental and conditional across two
roles — the natural fit, and TypeScript keeps ~70 components honest about DTO
shapes.

**Why repository/service patterns?** So authorization and business rules have
one home, and tests can substitute a fake repository. `protocols.py` is the
seam.

**How is it organized?** `routers` (HTTP) → `services` (orchestration) →
`repositories` (persistence), with `schemas` as the DTO boundary and `ai` as a
parallel consumer of the same services.

### AI

**How does the AI know about a case?** It does not, until it asks. Facts arrive
through tools bound to one authorized case; the prompt carries language, role
and the message.

**What does Strands do?** Routing and synthesis. It decides which specialist and
which tool; it never decides a fact or an authorization.

**What are the agents / the tools?** Six specialists (§6) and two tool holders
(§8).

**How do you reduce hallucinations?** Structured output validated by Pydantic;
tools as the only fact source; bilingual guardrails; a deterministic floor; an
action allow-list; and tests asserting the tool ran and what it returned.

**Why not send the whole database?** §7 — context size, exposure, authority,
testability, authorization and observability, all worse.

**What happens if the AI fails?** The deterministic answer, with
`degraded=true`, surfaced honestly in the UI. Never a 5xx.

**How does multi-turn work?** §11.

### Security

**Can the AI reach another client's case?** No, structurally: no tool accepts a
case identifier. `test_agent_security.py::test_no_tool_accepts_a_case_identifier`
fails if anyone adds one.

**How are attorney assignments protected?** `CaseAccessService.attorney_portfolio`
resolves the collection from the authenticated session; a client is refused
outright.

**Where does authorization happen?** In the router, before the service, before
the agent — `authorize_for_submission` is the first call in both endpoints.

### Documents

**How does document intelligence work?** §11. **How do you know what evidence is
missing?** §10 — canonical slug matching, server-side, disjoint by construction.

### Frontend

**Responsive?** §11. **Duplicated UI logic?** `components/case/` plus a
governance check (`npm run agent:flowbite`). **ES/EN?** One `resolveLanguage`
rule and a parity gate.

### Testing

**How did you test the AI?** Three layers: the tool ran (grounding), the facts
reached the model (`FakeProviderModel.transcript`), and the deterministic prose
is semantically correct — `tests/test_golden_scenarios.py`.

**Authorization?** `test_agent_security.py`: cross-case access, role gating,
prompt injection, no authorization parameter on any tool.

**Mobile?** Playwright across 320–1440 with overflow measured on
`documentElement`, not `body` — `overflow-x: clip` hides the scrollbar, not the
overflow.

**What did E2E catch that unit tests did not?** That the login background never
rendered in production, because the deployment's own CSP (`img-src 'self'`)
blocked the hotlinked image. No unit test can see that.

### Engineering decisions

**Hardest problem?** Making the assistant useful without letting it become
authoritative. The answer was the tool boundary plus the deterministic floor.

**What would you improve?** Live-model quality scoring, a persistent vector
store, per-attorney assignment, and the signed confirmation flow for writes.

**Tradeoffs for the demo?** In-memory index, SQLite, one attorney, read-only
actions — each recorded in `CHANGELOG.md`'s open ledger rather than left to be
discovered.

---

## 18. How I would explain FreshStart in 60 seconds

> FreshStart is a bankruptcy-preparation workspace for two people: someone
> considering bankruptcy, and the attorney who will advise them. Today that
> consultation starts with a shoebox, and the first hour goes on data entry
> instead of judgement. FreshStart moves that work earlier — the client
> organizes income, expenses, debts, assets and documents, and the system
> computes what is still missing.
>
> There is an AI assistant, and the interesting part is what it is *not* allowed
> to do. It never calculates a figure and never decides who may see what. Python
> computes every number and every authorization; the assistant reads authorized
> case data through tools bound to one case, and explains it. It cannot
> determine eligibility or pick a chapter — that is a lawyer's call, and the
> guardrails enforce it rather than merely asking.
>
> If the model is unavailable, there is still an answer: a deterministic path
> runs first on every request and is the fallback. The value is that the
> consultation starts from a complete file and a real list of questions.

---

## 19. Five-minute technical walkthrough

1. **Product** (30s) — the problem, the two users, the boundary: preparation,
   not advice.
2. **Client workflow** (45s) — guided stages, completion score, the evidence
   checklist, "what am I missing?" answered from computed state.
3. **Attorney workflow** (45s) — inbox and triage, portfolio scope, open a case,
   alerts and private notes, case actions.
4. **Architecture** (45s) — React → FastAPI → services → repository protocols →
   SQLAlchemy; DTOs at every boundary.
5. **Strands and tools** (60s) — *Strands decides, Python knows*. Orchestrator →
   specialist → tool → service. Show `case_tools.py`: no tool takes a `case_id`.
6. **Security** (45s) — authorization before the agent; tools closed over an
   authorized case; the model cannot raise its own privileges or lower the
   review flag.
7. **Documents and RAG** (30s) — the four evidence concepts, canonical slugs,
   case-scoped retrieval, and the in-memory limitation stated plainly.
8. **Testing** (45s) — three layers; the exit-code lesson and the wrong-server
   lesson.
9. **Tradeoffs** (15s) — the open ledger, and what production would need.

---

## 20. Glossary

| Term | Meaning here |
| --- | --- |
| **CaseContextDto** | The reduced, role-redacted slice of one case the AI layer may see |
| **CaseTools** | Read-only tools closed over one authorized case |
| **PortfolioTools** | Read-only tools closed over an authorized attorney portfolio |
| **AgentRuntime** | Orchestrates one turn: draft → agent → filter → compose |
| **AgentAnswer** | What the *model* may produce: message, handled_by, actions, cards |
| **AssistantResponse** | What the *server* returns, composed around AgentAnswer |
| **assistant_scope** | `case` or `portfolio` — a hint about which authorized scope to build, never a grant |
| **evidence requirement** | A document the case needs, keyed by a canonical slug, satisfied or not |
| **RAG** | Case-scoped retrieval of uploaded document excerpts |
| **specialist** | An agent with a named prompt and a fixed tool grant |
| **deterministic fallback** | `RuleBasedProvider` — always available, no model |
| **degraded** | The answer came from the fallback; surfaced, not hidden |
| **repository** | Persistence behind a `Protocol`; the only thing that touches SQLAlchemy |
| **service** | Business orchestration; depends on protocols, never on the ORM |
| **DTO** | A Pydantic/TypeScript model at a boundary |

---

## 21. Where things live

| Responsibility | Path |
| --- | --- |
| Login and demo access | `frontend/src/pages/LoginPage.tsx`, `frontend/src/components/auth/DemoAccess.tsx` |
| Auth/session | `frontend/src/auth/AuthContext.tsx`, `frontend/src/auth/session.ts`, `frontend/src/api/authApi.ts` |
| Brand assets | `frontend/public/favicon.svg`, `frontend/public/login-backdrop.svg`, `frontend/index.html` |
| Role landing | `frontend/src/pages/RoleHomePage.tsx`, `frontend/src/pages/ClientDashboardPage.tsx`, `frontend/src/pages/AttorneyDashboardPage.tsx` |
| Router | `frontend/src/router.tsx` |
| Domain UI components | `frontend/src/components/case/`, `frontend/src/components/molecules/`, `frontend/src/components/ui/`, `frontend/src/components/atoms/` |
| Assistant UI | `frontend/src/components/organisms/ChatPanel.tsx` and related case panels |
| API clients | `frontend/src/api/` |
| i18n | `frontend/src/i18n/`, `frontend/src/locales/{en,es}/` |
| HTTP routers | `backend/app/api/routers/bankruptcy.py`, `backend/app/api/routers/documents.py`, `backend/app/api/routers/auth.py` |
| Services | `backend/app/services/case_access_service.py`, `backend/app/services/documents/`, `backend/app/services/` |
| Repositories and ORM | `backend/app/repositories/`, `backend/app/domain/` |
| AI runtime and guardrails | `backend/app/ai/runtime.py`, `backend/app/ai/tracing.py`, `backend/app/ai/contracts/assistant_response.py` |
| Agents and tools | `backend/app/ai/agents/factory.py`, `backend/app/ai/tools/case_tools.py`, `backend/app/ai/tools/portfolio_tools.py` |
| Prompts | `backend/app/ai/prompts/{en,es}/` |
| Document intelligence | `backend/app/services/documents/index.py` and the document ingestion flow in `backend/app/api/routers/documents.py` |
| Contracts | `contracts/api-contracts.json`, `backend/app/schemas/` |
| Backend tests | `backend/tests/` |
| E2E | `frontend/e2e/` |
| Release gate | `scripts/agent/release-verify.mjs` |
| Deployment | `vercel.json`, `api/index.py` |
| Decisions and evidence | `docs/decisions/`, `docs/evidence/`, `CHANGELOG.md` |
