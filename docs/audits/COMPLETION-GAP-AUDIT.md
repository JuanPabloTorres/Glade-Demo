# Completion gap audit — what is actually left

Measured against `integration/demo-close` at 4.9.0, 16 commits ahead of `main`.
Every line below was produced by running a command or reading the file named.
Nothing here is recalled.

**The headline: the remaining list is shorter than the acceptance addenda
assume, because several items are already built and only need verifying.** Three
capabilities are genuinely missing, one is blocked on something I cannot supply,
and the rest is verification.

---

## A. Already done — measured, not assumed

| Capability | Evidence |
| --- | --- |
| Backend suite | **292 passed**, `ruff` clean, `mypy` clean (69 files) |
| Frontend suite | **121 passed** across 18 files, `build` clean, `eslint` 0 errors |
| i18n key parity | `i18n:check` passes, 14 module files |
| Governance | `agent:validate` passes |
| Client journey | 10/10 case sections render, console clean (browser) |
| Attorney journey | 11/11 sections incl. `attorney-review`, console clean (browser) |
| Attorney analysis | server-derived score renders on a fresh seeded database |
| Responsive | no horizontal overflow at 320 / 390 / 768 / 1024 / 1440 |
| Agentic architecture | orchestrator → specialist → real tool → authorized DTO, observed |
| Tool authorization | no tool accepts a `case_id` or `role`; both closed over |
| Deterministic boundary | figures computed by services, never by the model |
| Provider capability gate | incompatible provider degrades in **0ms** with a diagnostic |

### Two items the addenda list as missing that already exist

**Sidebar collapse is implemented.** `Sidebar.tsx` carries
`COLLAPSED_STORAGE_KEY`, a `collapsed` state and an effect persisting it to
`localStorage`. §23 needs *verification*, not construction.

**Hardcoded user-facing Spanish is at zero.** A scan for accented text inside
JSX across `components/` and `pages/` returns **0 matches**. The static i18n
surface is clean; what remains is the rendered-DOM audit of dynamic content.

---

## B. Genuinely missing — three capabilities

### B1. Attorney cross-case intelligence

**Status:** not built. `CaseTools` is correctly bound to one authorized case, and
`CaseRepositoryProtocol` exposes no list-by-assignment — `get`,
`get_owner_user_id`, `upsert_case_snapshot`, `record_timeline_event`,
`get_recent_timeline`, `add_note` and nothing else.

**Owner layer:** repository → service → a new attorney-scoped tool. Not the
existing tools; adding a `case_id` parameter to them would put a model-authored
string on the authorization path, which is the one property those tools were
designed to remove.

**Shape:** attorney identity → assignment/access service → authorized case
collection → reduced DTO (id, display identity, status, urgency, completion,
missing evidence, review state) → tool. The model never chooses which cases it
may see.

**Effort:** repository method, service, DTO, tool, factory registration, and the
seven authorization tests §12 lists. Half a day, and it is the largest single
remaining item.

### B2. Structured observability

**Status:** not built. No `request_id` or `correlation_id` anywhere in
`backend/app`. Tool execution is visible only as Strands' own stdout.

**Owner layer:** `AgentRuntime` plus a small logging helper.

**Shape:** one structured record per turn — correlation id, provider, model,
runtime mode, agent, specialist, tools invoked, tool status, duration, degraded,
fallback reason, final handler. No chain-of-thought, no raw financial data.

**Effort:** a few hours. Low risk, high demo value — it is what makes agentic
execution demonstrable without exposing model reasoning.

### B3. Agentic multi-turn continuity

**Status:** partially covered.
`test_assistant_usefulness.py::test_a_real_follow_up_still_inherits` pins
follow-up inheritance at the rule-based provider, and
`CaseContextDto.recent_conversation` is populated from the real table. What does
not exist is the §15 matrix: pronoun reference, omitted subject and deliberate
topic change, across ES/EN × client/attorney, through the agentic path.

**Owner layer:** tests, not code — unless the matrix exposes a defect.

**Effort:** a few hours once B4 below unblocks the agentic path.

---

## C. Blocked on something I cannot supply — one item

**LIVE_AGENT_PROVIDER_VERIFICATION.**

No `GROQ_API_KEY` or `OPENAI_API_KEY` exists in the process environment, the
user or machine registry scopes, `.env` (27 variables, none of them a provider
key), `backend/.env` or `frontend/.env` (neither file exists), or anywhere in
the repository under a `gsk_` pattern. Searched before saying so.

Until a credential exists, no agent-authored answer can reach a user, because
the only capable provider class is OpenAI-compatible. This blocks *only* the
live gate — it does not block B1, B2, B3 or anything in section D.

**What unblocks it:** three lines in `backend/.env` (git-ignored):

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_BASE_URL=https://api.groq.com/openai/v1
```

I do not create that file: writing a secret to disk is the owner's action.

---

## D. Verification only — nothing to build

These have implementations and lack evidence.

| Item | What is missing | Cost |
| --- | --- | --- |
| E2E suite | 38 tests across 5 specs, never run in these sessions | one run |
| Sidebar collapse | expand → collapse → layout → expand, at each breakpoint | ~1h browser |
| Login centering | centred at all five widths without scroll | ~1h browser |
| Rendered-DOM i18n | ES/EN residue across every listed surface | ~2h browser |
| AI failure states | provider down, timeout, malformed, empty retrieval, in the UI | ~2h |
| Document intelligence | upload → extract → index → retrieve against the live app | ~2h |
| Modals / a11y / security probes | viewport audit, keyboard, spoofing attempts | ~3h |

---

## E. Integration debt

`integration/demo-close` is 16 commits ahead of `main` and carries **34 change
fragments**. None of it is pushed or merged. Two sibling checkouts hold work
that is not in it:

- `Glade-Demo-skills-standard` — 19 recorded edits, working tree clean. Its
  branch `docs/skills-standard` rebuilt all 19 skills and is the reason
  `.claude/skills/**` cannot be touched from here.
- `Glade-Demo-ui-mobile-responsive` — 5 uncommitted paths including
  `AppShell.tsx` and `playwright.config.ts`, which is why Playwright
  parallelism and the phone `/assistant` layout were left alone.

Neither can be integrated from here without forking files another checkout is
holding.

---

## F. The critical path

Ordered by what unblocks what, not by the addenda's numbering:

1. **Run the E2E suite** — one command, and it either removes an unknown or
   surfaces real defects. Cheapest information available.
2. **B2 observability** — independent of everything, few hours, and it is what
   makes the agentic story demonstrable in a demo.
3. **B1 cross-case tools** — the largest item, independent of the credential;
   its authorization tests do not need a model.
4. **Section D verification sweep** — browser work, independent of AI.
5. **Credential arrives → live gate → B3 multi-turn matrix.**

Items 1–4 are roughly one to two days and need nothing from outside. Item 5 is
minutes of work once the key exists.

**The honest summary: nothing on the critical path is blocked except the live
provider gate, and that is one file with three lines.**
