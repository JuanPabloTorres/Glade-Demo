# Changelog

What shipped, and what was scoped and deliberately did **not** ship, in one place.

This repository already records deliveries in two places: `RELEASE_NOTES.md` explains
*why* a release happened, in prose, and `changes/<task-id>.md` records a single delivery
in detail. Neither answers the question this file exists for — *what did we commit to
that is still not done?* — because a deferral written in one fragment's
"Risks / limitations" is invisible from every other fragment.

So each entry below has two halves. **Delivered** is what a user or a test can observe.
**Not delivered** is what was in scope and was not built, with the reason and where it is
tracked. An item that appears under "Not delivered" stays visible in the
[Open ledger](#open-ledger) until a later entry closes it.

## How to keep it consistent

1. **Every governed delivery edits this file** in the same commit as its
   `changes/<task-id>.md`, under `## [Unreleased]`.
2. **Nothing enters "Delivered" without evidence** — a passing command, a test name, or a
   measured browser observation. If the evidence is "it looks right", it is not delivered.
3. **Everything scoped and not built goes under "Not delivered"**, with a status word and
   a pointer. Silence is the failure mode this file exists to prevent.
4. **An item leaves the open ledger in exactly two ways**: a later entry delivers it, or a
   later entry drops it and says why. Neither is a silent edit — the closing entry names
   the version that opened it.
5. **Integration-manager owns the promotion.** At the SemVer bump, `[Unreleased]` becomes a
   version heading and the open ledger is re-derived from the entries above it. Worktrees
   append to `[Unreleased]`; they do not create version headings.
6. **One line per item, past tense, naming the artifact.** The prose belongs in
   `RELEASE_NOTES.md`; this file is the index.

**Status vocabulary** — `DONE` observed, `PARTIAL` built but not fully covered,
`NOT STARTED`, `BLOCKED` waiting on something outside the repository, `DROPPED` decided
against, `UNVERIFIED` implemented but never exercised. `UNVERIFIED` is not `DONE`: that
distinction is the whole point of the file.

---

## Open ledger

Carried forward and still open against `integration/demo-close` at 4.9.0. Measured in
[`docs/audits/COMPLETION-GAP-AUDIT.md`](docs/audits/COMPLETION-GAP-AUDIT.md).

| Item | Status | Opened | Blocked by | Tracked in |
| --- | --- | --- | --- | --- |
| Live agent provider verification | `BLOCKED` | 4.0.0 | no `GROQ_API_KEY` / `OPENAI_API_KEY` in env, `.env` or repo — an owner must write the secret | `changes/provider-capability-hardening.md` |
| Attorney cross-case intelligence | `NOT STARTED` | 4.9.0 | needs repository → service → attorney-scoped tool; no list-by-assignment exists | gap audit §B1 |
| Structured observability (one record per AI turn) | `NOT STARTED` | 4.9.0 | — | gap audit §B2 |
| Agentic multi-turn continuity matrix | `PARTIAL` | 4.9.0 | rule-based path pinned; ES/EN × client/attorney through the agentic path needs the credential | gap audit §B3 |
| 320 in the E2E responsive sweep | `PARTIAL` | 4.9.0 | 390 and 1440 covered by `ui-quality-evidence.spec.ts` at 4.11.0; `responsive-overflow.spec.ts` still starts at 375 | gap audit §D |
| Sidebar collapse end to end | `UNVERIFIED` | 3.2.0 | control moved onto the brand row at 4.11.0 and rendered at 390/1440; still never driven (expand/collapse) at each governed breakpoint | gap audit §D |
| Login centring at all five governed widths | `UNVERIFIED` | 4.9.0 | — | gap audit §D |
| Rendered-DOM i18n audit | `DONE` at 4.11.0 | 4.3.0 | closed — `e2e/ui-quality-evidence.spec.ts` asserts the rendered body of five screens in both languages at two widths | `changes/ui-quality-i18n-components.md` |
| AI failure states in the UI | `UNVERIFIED` | 4.9.0 | provider down / timeout / malformed / empty retrieval never driven in a browser | `changes/demo-ready-verification.md` |
| Document intelligence end to end | `UNVERIFIED` | 4.0.0 | unit and integration tests only; no upload → extract → index → retrieve against the live app | `changes/demo-ready-verification.md` |
| Modal / a11y / security browser probes | `NOT STARTED` | 4.9.0 | — | `changes/demo-ready-verification.md` |
| Demo fixtures declared once | `NOT STARTED` | 4.9.0 | browser seed and server seed agree by test on identifiers only, not contents | `changes/attorney-demo-case-seed.md` |
| Durable persistence on the hosted demo | `BLOCKED` | 4.4.0 | SQLite on ephemeral storage; needs a managed `DATABASE_URL` | `RELEASE_NOTES.md` 4.4.0 |
| Assistant write actions | `DROPPED` for phase 1 | 4.0.0 | read-only by decision; `requires_confirmation` is carried in the contract so the flow stays additive | `RELEASE_NOTES.md` 4.0.0 |
| `docs/flows/` | `NOT STARTED` | 4.7.1 | referenced by `CLAUDE.md` and `create-feature-flow`, does not exist | `RELEASE_NOTES.md` 4.7.1 |
| `.claude/agents/qa-release-gate.md` baseline | `NOT STARTED` | 4.7.1 | still carries the 55/27 counts and a pre-ADR-0002 Ollama phrasing | `RELEASE_NOTES.md` 4.7.1 |
| Integration debt | `NOT STARTED` | 4.9.0 | `integration/demo-close` is 16 commits ahead of `main`, unpushed; two sibling checkouts hold work it cannot absorb without forking files | gap audit §E |

---

## [Unreleased]

On `integration/demo-close` since the 4.9.0 release commit. No version bump yet.

### Delivered

- Gave the attorney's demo case a server-side fixture, closing the 4.9.0 blocker —
  `case-miguel-demo` seeds with its own client owner and
  `test_case_ids_match_the_ones_the_ui_seeds` pins both identifiers.
- Corrected the 4.9.0 release notes and recorded the readiness verification.
- Audited the Strands agent layer against its acceptance contract: the orchestrator →
  specialist → real tool → authorized DTO path was observed running, and the reason its
  answer never reaches a user was traced rather than assumed.
- Refused an agentic provider that cannot honour the structured contract — an incompatible
  provider now degrades in 0 ms with a diagnostic instead of failing at the model call.
- Measured what is actually left to complete the demo
  ([`docs/audits/COMPLETION-GAP-AUDIT.md`](docs/audits/COMPLETION-GAP-AUDIT.md)); every
  line was produced by running a command or reading a file.
- Ran the committed Playwright suite: **80 passed, exit 0, 2.5 minutes**, closing the
  "E2E never run" item opened by `changes/demo-ready-verification.md`.
- Translated the evidence checklist and moved its per-line tick to the server —
  `EVIDENCE_REQUIREMENT_TYPES` matches canonical slugs, and
  `test_a_document_satisfies_its_own_requirement_and_not_another` pins that a bank
  statement no longer satisfies the housing requirement.
  (`changes/ui-quality-i18n-components.md`, 4.11.0)
- Closed the rendered-DOM i18n audit: `e2e/ui-quality-evidence.spec.ts` asserts the whole
  body of client home, case overview, documents, activity and the attorney home carries no
  foreign-language string, at 390 and 1440, in both languages. **6 passed.**
- Migrated case-history entries persisted before locale keys existed, recovering the key
  from each entry's `stage`, so an English session no longer reads its timeline in Spanish.
- Reduced the assistant to one entry point on every breakpoint. `AiLauncher` is the only
  control; `/assistant` redirects into the panel carrying its `?prompt=`; the panel takes
  the whole viewport below `md`. Pinned by `assistant-page.spec.ts` and the two rewritten
  cases in `shell-overlays-language.spec.ts`.
- Added six reusable case components (`frontend/src/components/case/`) and composed the
  workspace and both dashboards from them, replacing per-page `<Card>` markup.
  `caseComponents.test.tsx`: 8 passed.
- Fixed an English UI rendering a Spanish demo case file: `activeLanguage()` now calls
  `resolveLanguage`, the same rule the UI uses. Gated by
  `the demo seed follows the UI, not its own default`, which runs under `en-US` with nothing
  persisted and was **verified to fail against the old code**.
  (`changes/delivery-guardrails.md`, 4.11.1)
- Ignored `.env*.local`. `.gitignore` had `.env`, which matches only that exact name, so the
  checkout's untracked `.env.production.local` was one non-selective `git add` from being
  committed. `git check-ignore -v` now resolves it.
- Unblocked governed integration on `main`: `git pull --ff-only` and
  `git merge --no-ff <active task's branch>` are permitted, authoring still is not. Nine
  hook cases recorded; used for real to fast-forward `main` from `46f641e` to `dff9efc`,
  the operation that was impossible before.
- Pinned the footer version badge to the tree's `VERSION`, so a build a release behind fails
  a suite rather than being spotted on a screen.
- Replaced the login background. It was a hotlinked iStock URL that this deployment's CSP
  (`img-src 'self' data:`) blocks, so it had **never rendered in production** — the page fell
  back to flat near-black. Now a self-hosted vector built from the product's colour tokens.
  (`changes/login-polish-system-guide.md`, 4.14.0)
- Added a favicon and fixed the tab title. There was no `public/` directory and no icon link,
  so every tab showed the browser default and `/favicon.ico` 404'd. The mark is the product's
  own glyph; the title is `Fresh Start`.
- Recomposed the login: brand → purpose → form → primary action → demo access, with the demo
  buttons moved below the thing they shortcut, and the password field no longer pre-filled
  with a real credential.
- Pinned that both demo buttons perform a *real* sign-in (one `POST /auth/login`, a written
  session, the correct role's destination) and that a wrong password still fails — 17 cases in
  `e2e/login-demo-access.spec.ts`, including scrolling to and clicking each control at
  320/390/768/1024/1440.
- Wrote `docs/GLADE-DEMO-SYSTEM-GUIDE.md`: 21 sections on architecture, the AI authorization
  boundary, evidence/RAG, i18n, testing, limitations, interview Q&A and a code map — written
  against the code, not from memory.
- Made release gates pass only on `exit 0`. `npm run release:verify` runs twelve gates, parses no
  output and reports each one's real exit code — the rule tested against the failure it exists
  for: a command printing "Tests 143 passed (143)" and exiting 1 is recorded failing.
  (`changes/release-gate-exit-codes.md`, 4.13.0)
- Isolated release regression from other checkouts: `reuseExistingServer` off, OS-assigned ports,
  a per-port e2e database, and a global setup that refuses to run unless `/api/v1/health` reports
  this checkout's version. Refusal verified by making it fire.
- Removed the global `es-PR` Playwright locale. Six suites declare the locale they assert, and
  first-visit acceptance covers `en-US` and `es-PR` with no stored preference, checking that the
  UI and the seeded case file resolve through the same `resolveLanguage` path.
- Gave the assistant the facts an evidence answer needs. `CaseContextDto` now carries held
  documents, evidence requirements and their satisfaction; `get_evidence_status` returns all
  three. The four document questions produce four different grounded answers, and a covered
  requirement is never recommended as missing. 23 cases in `tests/test_golden_scenarios.py`.
  (`changes/agent-answer-quality.md`, 4.12.0)
- Rewrote every tool description to say when and why to call it, and gave the specialists a
  reasoning contract (fetch before asserting, answer first, next step when grounded).
- Taught the attorney assistant the case toolbar: `get_attorney_actions` exposes the nine real
  controls with what each does, so "what should I do next" names a control instead of giving
  generic advice. Vocabulary only — there is still no write action type.
- Recognized two questions the demo's own acceptance script asks and the fallback did not:
  "¿Y cuánto debo?" and "¿Qué sabes de mi caso?". Both fell through to the generic
  missing-items default; found by running the golden scenarios, not by reading the code.
- Categorized portfolio triage (attorney action / client action / ready / none) instead of
  ranking without a reason.
- Fixed **"Could not refresh the financial analysis"** on a new case: the attorney dashboard's
  "Create case" built a case owned by the attorney, which `CaseAccessService` refuses, so every
  one 404'd on its first analyze call. Control removed; both halves pinned by tests.
- Made the floating assistant launcher a 48px circle instead of a labelled pill.
- Made the frontend unit suite exit 0 again. On the 4.11.0 tree it exited 1 while printing
  "143 passed": `ChatPanel` began calling `minimizePanel` and the six `useChatPanel` mocks
  were literals without it, so the click threw into Vitest's unhandled-error channel. One
  factory now builds that mock, and the navigating-suggestion test asserts the call.
- Moved the sidebar collapse control onto the brand row. **Still `UNVERIFIED` end to end**
  — it is driven at 390 and 1440 by the evidence spec but not at each governed breakpoint,
  so the 3.2.0 ledger item stays open.

### Not delivered

- `LIVE_AGENT_PROVIDER_VERIFICATION` — `BLOCKED`. No provider credential exists in the
  process, user or machine environment, in `.env`, or in the repository; searched before
  saying so. Writing a secret to disk is the owner's action, not the agent's.
- `STRUCTURED_OUTPUT_PROVIDERS` is a hand-maintained list. If a future Strands release
  makes the Ollama adapter capable, the list is wrong in the safe direction — it refuses a
  provider that has become capable.
- Items 2–17 of the ordered agentic close-out. The next is the provider-boundary
  integration test with a fake Strands model at the external boundary only.
- Demo figures are duplicated, not shared, between the browser seed and the server
  fixture; only the identifiers are pinned by a test.
- Effort estimates in the gap audit are judgement, not measurement. The gap list is
  measured; the hours attached to it are not.
- `320` in the E2E responsive sweep — still `NOT STARTED`. The new evidence spec adds 390
  and 1440 in both languages; `responsive-overflow.spec.ts` still starts at 375, and
  `frontend/CLAUDE.md` governs 320.
- `evidence_score` moves for cases with self-employment income, secured debts or a bank
  statement. Correcting the matching was the point, but no fixture pins the old numbers, so
  the change is asserted by construction (score equals the tick count) rather than by a
  before/after comparison.
- `ChatPanel`'s `variant="page"` has no caller now that `/assistant` is a redirect. Left in
  place with its tests rather than folded into this change.
- The demo seed follows the language it was created in. A later switch re-labels the
  timeline and the assistant's greeting, which carry keys, but not the synthetic rows —
  they are ordinary case data by then. `resetDemo` regenerates them.

---

## [4.9.0] — 2026-08-07

Consolidated seven delivered branches into one verified state and drove both journeys in a
browser. No contract change.

### Delivered

- Dev loop: vitest 56.3s → 7.6s, lint 33.3s → 2.9s warm, local loop ~2 min → 26s; CI's
  serial `needs:` chain removed; `backend/uv.lock` resynced so the backend job stopped
  failing on every pull request regardless of content.
- The assistant recognizes *"do I qualify"* and *"should I file"* in both languages,
  declines explicitly, quotes the case's own figures and raises
  `requires_attorney_review` at the source instead of answering about uploading documents.
- `backend/tests/evals`: 14 scenarios over 4 synthetic profiles through the unstubbed
  production stack, 7 blocking graders, 3 baseline-scored, 0.45s, no model.
- The case timeline is bilingual including entries that already existed — entries carry
  locale keys and are translated at render.
- Mobile: the login form is above the fold (first field y=936 → y=528 at 320px, y=884 →
  y=504 at 390px); the assistant sheet shows one header instead of two.
- `DEMO_CASE_ID` aligned to `case-elena-demo`, so both seeds finally name the same cases.
- Suites on the integrated tree: backend 277 passed (292 after the seed fix), frontend 121
  passed across 18 files, `ruff` / `mypy` / `eslint` / `tsc -b && vite build` /
  `i18n:check` / `agent:validate` all clean.

### Not delivered

- **The attorney's demo case had no server-side fixture** — `POST /bankruptcy/analyze`
  returned 404 and the review workspace rendered with no figures. Scoped and deliberately
  not started rather than left half-built. *Closed in `[Unreleased]`.*
- The committed Playwright suite was never run in this pass; journeys were driven directly,
  which covers the same routes but is not the same artifact. *Closed in `[Unreleased]`.*
- Document intelligence, AI failure modes, the modal/a11y audit and browser security probes
  were not exercised — the reason the verdict was READY WITH KNOWN LIMITATIONS.
- `SEED_DEMO_DATA_ON_STARTUP` stays off by default, deliberately: an implicit default could
  arm itself against a real database.

## [4.8.0] — 2026-08-07

One overlay layer system, one action control, one language switcher. No contract, route or
business-rule change.

### Delivered

- `overflow-x: hidden` on `html`/`body` had made both elements scroll containers, which
  disabled every `position: sticky` descendant — the sidebar and the header scrolled away
  on any long page. `overflow-x: clip` fixed it; both values were measured, not reasoned
  about.
- Overlays escape their containers through one governed layer instead of per-page markup.
- Copy composed in code now routes through i18n.
- Nine equal buttons became one action control.

### Not delivered

- Not recorded at the time. This file starts enforcing the second half from `[Unreleased]`
  onward; entries at and below 4.8.0 carry only what their release notes stated.

## [4.7.2] — 2026-08-07

### Delivered

- Production ran on a model name with a trailing newline in it; environment values now
  absorb stray whitespace at the settings boundary.

## [4.7.1] — 2026-08-07

### Delivered

- Rebuilt all nineteen `SKILL.md` files as operational contracts describing the repository
  that exists, with boundaries made explicit. Nothing changed at runtime.

### Not delivered

- `.claude/agents/*.md` untouched — `qa-release-gate.md` still carries the 55/27 baseline
  and an Ollama test phrased for the pre-ADR-0002 provider layout.
- `docs/flows/` is referenced by `CLAUDE.md` and `create-feature-flow` but does not exist;
  the skill states this rather than implying otherwise.
- No new skills invented to complete a taxonomy — the catalog instead records which
  responsibilities have no first-class owner (auth/JWT, document upload and RAG ingestion
  as a domain, test authoring).

## [4.7.0] — 2026-08-07

### Delivered

- The assistant panel stopped answering a question nobody asked, the suggestion chips
  stopped making the user talk to themselves, and the panel now has something to look at.

## [4.6.1] — 2026-08-07

### Delivered

- Fixes from the first hosted-provider run: the agent is no longer asked to invent an
  identifier, and the header no longer contradicts the answer under it.

## [4.6.0] — 2026-08-07

### Delivered

- Free-tier OpenAI-compatible model providers, the Postgres driver, and deployment
  documentation.

## [4.5.0] — 2026-08-07

### Delivered

- The agent runs on Vercel. The original decision that failed is documented alongside how
  it is now wired, the defect that surfaced, and how to enable it.

## [4.4.0] — 2026-08-07

### Delivered

- The Vercel deployment boots, seeds itself and is documented. `test_vercel_entrypoint.py`
  boots `api/index.py` the way Vercel does — subprocess, scratch directory — because
  `Settings` is read and cached at import. Backend 172 tests, `ruff` and `mypy` clean
  across 68 files.

### Not delivered

- **Durable persistence.** Two concurrent instances do not share rows, and a case owned in
  one invocation reads back ownerless after a cold start. Ownership is enforced; it cannot
  be *demonstrated* on ephemeral storage.
- **The Strands agent layer**, excluded from `requirements.txt` on purpose with a test
  keeping it out — every answer came from the deterministic fallback with `degraded: true`.

## [4.3.0] — 2026-08-07

### Delivered

- The assistant flags the answers that need a lawyer and speaks one language at a time;
  `handled_by` is never blank; `mypy` is clean.

## [4.2.0] — 2026-08-07

### Delivered

- Fleet consolidation: the shell became two surfaces over one configuration, the assistant
  became a destination, it answers the question it was asked, overflow became a gate rather
  than an audit, and agents can run in parallel safely.

## [4.1.0] — 2026-08-07

### Delivered

- Dialogs stopped escaping their own panel; the assistant became a dialog rather than a
  drawer; a real model ran through the agent layer for the first time.

## [4.0.0] — 2026-08-06

**Breaking.** The assistant can now look things up.

### Delivered

- Real Strands SDK integration: agents construct, tool specs generate from docstrings and
  type hints, `as_tool()` delegation registers, role gating holds.
- Backend 133 tests, frontend 47 (10 new), and real end-to-end HTTP against a running
  server: auth, ownership, persistence, serialization, 403 on role mismatch, 401
  unauthenticated.
- Governance tooling.

### Not delivered

- **No live LLM ran through the layer** — no reachable Ollama daemon and no
  `OPENAI_API_KEY` in the validation environment. Everything up to the SDK's tool surface
  is exercised; the model call is not. *Still open — see the ledger.*
- **Write actions** — phase 1 is read-only by decision; `requires_confirmation` is carried
  in the contract so the signed-confirmation flow stays additive rather than another
  breaking change.
- `AI_PROVIDER=openai` sends reduced case context to a third party. Opt-in, off by default;
  enabling it is a data-egress decision.
- Carried from 3.1.0: no visual/screenshot QA, no committed production CORS origin, and
  SQLite on Vercel's `/tmp` is not durable across cold starts.

## [3.2.0] — 2026-08-06

Frontend only — no API, contract, auth or data-model change.

### Delivered

- Flowbite v3 semantic token layer (~20 token names) in `frontend/src/index.css`; a sweep
  of `frontend/src/**/*.tsx` returns no raw Tailwind palette class in any JSX.
- Mobile bottom navigation plus an overflow drawer, replacing a single floating menu button
  that cost two taps per navigation and showed no location.
- Collapsible desktop sidebar (256px / 80px) with the preference persisted;
  `useRoleNavigation()` as the single resolver of a role's destinations.
- Fixed: Documents / Tasks / Activities went nowhere useful — the case page read `?focus=`
  once and deleted it from the URL, so a refresh reset to the first stage and Back/Forward
  never moved between stages.

## [3.1.0] — 2026-08-06

### Delivered

- Real persistence (SQLAlchemy + Alembic) behind repositories, and server-side case
  ownership on every case-scoped endpoint with `owner_user_id` always server-derived.
- `GET /api/v1/ai/health` (`ai.health`); a reusable component tier; option values moved
  from Spanish display strings to canonical slugs.
- Fixed: evidence completeness silently scored 0%, the attorney account flipped the UI
  language on login, raw slugs surfaced as file names and in the timeline, and the Spanish
  catalogs were missing accents throughout (`anos` for `años` — a different word, not a
  typo).

### Not delivered

- No visual/screenshot QA and no committed production CORS origin. *Carried into 4.0.0.*

## [3.0.0] — 2026-08-05

**Breaking.** `POST /api/v1/bankruptcy/guide` returns `AssistantResponse` instead of
`GuidanceResponseDto`.

### Delivered

- Client dashboard and the 10-stage workspace rebuilt; the attorney dashboard became an
  operational queue with 10 filter views; chat became an app-shell-level panel rather than
  a workspace tab.
- Pluggable AI providers (`rule_based` / `ollama` / `transformers`) that only ever rewrite a
  deterministic draft's phrasing; `CaseContextBuilder` (reduced, per-role-redacted,
  audited); `ResponseGuardrails` forcing attorney review when triggered.
- Fixed a real authorization gap: the guidance endpoint verifies the declared role against
  the JWT and rejects a mismatch with 403 instead of trusting it.
- Document ingestion pipeline and per-case-isolated RAG behind
  `POST /api/v1/documents/analyze`.
- Backend pytest 10 → 54; frontend 0 → 9 test files; Playwright expanded from one
  happy-path spec to the full client and attorney flows plus a mobile-viewport run.

## [2.0.1] — 2026-08-05

### Delivered

- Removed obsolete persistence foundations and MatterReady-era frontend remnants; Flowbite
  compatibility fixes; added `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`.

## [2.0.0] — 2026-08-05

**Breaking.** Replaced the MatterReady legal-matter-intake domain with the FreshStart
bankruptcy guidance product, and built separate client and attorney portals.

## [1.0.0] — 2026-08-05

### Delivered

- MatterReady AI Intake Copilot: a stateless, chat-first case-packet engine replacing the
  prior matter workflow, with heavyweight AI dependencies isolated from the production API
  runtime.

## [0.4.0 and earlier] — 2026-08-04 → 2026-08-05

Pre-pivot MatterReady history, preserved rather than discarded: a persistent browser-based
demo workspace, an explicit product purpose in the UI, a guided recovery flow replacing a
dead-end error state, and the professional shell at 0.2.1. Full detail in
`RELEASE_NOTES.md`.
