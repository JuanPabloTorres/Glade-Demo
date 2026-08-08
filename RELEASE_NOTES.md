# FreshStart 4.10.0

Closes the demo. Every gate runs from one integrated tree, and the two release
journeys work in Spanish and English on a phone and a desktop. No contract change.

## The assistant now remembers the conversation it is in

`AgentRuntime._build_prompt` sent the language, the role and the current message.
`recent_conversation` reached `CaseContextDto` and stopped there — only the
deterministic providers ever read it. So on the agentic path a follow-up had
nothing to resolve against: the "y" in *"¿Y cuánto pago al mes?"* referred to
nothing, and *"Why the first one?"* had no first one.

Prior turns now reach the prompt as an `EARLIER TURNS` block, framed as data
rather than instructions. Case facts still arrive through tools; the block is
omitted entirely on a first turn. What is stored is the guarded message, so a
later turn cannot read back a phrasing the guardrails removed.

Four two-turn conversations cover the release contract — client in Spanish and
English, attorney across the portfolio and inside one case — each asserting that
turn two was handed turn one. Removing the change fails exactly those four.

## The demo cases carry the evidence their triage depends on

No seeded case had a single document. The client's evidence screen was never
empty, because the browser workspace seeds it, but the server's record was — and
two things read that record. `evidence_count` was zero for every case, so the
attorney tool that separates "waiting on me" from "waiting on the client"
matched all three. And the retrieval index was empty on a fresh database, so
document intelligence only worked for a document uploaded in that same process.

Evidence is now distributed by what each case has to show: Elena has two
documents and an open request for more, Miguel has the three a review needs,
Rosa deliberately has none.

## One icon button, and a checkbox that was already built

Five standalone icon-only buttons agreed on what they were and disagreed on
everything else — three hover treatments, two focus rings, two spellings of a
square, and an accessible name that was right at all five only because five
authors each remembered it. `IconButton` requires the label in its type. The
login "remember me" control was a raw checkbox input in a codebase that already
had `CheckboxField`.

`ActionGroup`'s menu trigger and `FileField`'s two controls were classified and
deliberately left alone; both are recorded in `docs/POST-DEMO-BACKLOG.md`.

## Verification

351 backend tests, 132 frontend tests, 95 Playwright tests, all green from one
tree. Lint, typecheck, build, i18n, contracts and governance all pass.

The first end-to-end run reported three failures and was thrown away: Playwright's
`reuseExistingServer` had adopted another checkout's dev server, so all 95 results
described code that was not under test. The re-run with reuse disabled, against a
server verified to be serving this tree, passes completely. The mechanism is
recorded, because it fails toward green just as easily.

Live AI against a real provider and deployment smoke tests are not included: no
OpenAI-compatible credential exists in this environment.

# FreshStart 4.9.0

Consolidates seven delivered branches into one verified state and drives both
product journeys in a browser. No contract change.

## The development loop stopped costing two minutes

Vitest spent 52 of its 56 seconds on scaffolding: the Tailwind and Flowbite
plugins were loaded under test, where nothing reads their output, and each test
file built its own jsdom. The config is now a function of `mode` and reuses one
environment per worker. Tests 56.3s → 7.6s, lint 33.3s → 2.9s warm, the full
local loop ~2min → 26s.

CI ran five jobs as a serial chain although no job consumes another's artifacts.
The `needs:` edges are gone, so the critical path is the slowest single job.

`backend/uv.lock` was out of sync with `pyproject.toml`, so `uv lock --check`
failed and every pull request inherited a red backend job regardless of content.

## The assistant now recognizes the two questions the product exists for

`RuleBasedProvider` reached its only review-raising branch by testing for the
literal tokens "capítulo 7" / "chapter 7". Six formulations of *"do I qualify"*
and *"should I file"*, in both languages, fell through to a generic next-step
answer about uploading documents, with `requires_attorney_review` left false.

The guardrails could not have caught it: they inspect the answer, and the answer
made no prohibited claim — it was simply about something else. The reply now
declines explicitly, names what the determination depends on, quotes the case's
own figures and raises the review flag at the source.

## Assistant quality is measurable

`backend/tests/evals` adds a golden dataset: 14 scenarios over 4 synthetic case
profiles, run through the production stack unstubbed, with seven blocking
graders and three scored against a committed baseline. It runs in 0.45s with no
model, and it is what found the defect above.

## The case timeline is bilingual, including its history

Timeline entries were generated as Spanish prose and persisted to
`localStorage`, so an English session read the whole history in Spanish and
switching language changed nothing. Entries now carry locale keys and are
translated at render, so the switch re-labels entries that already existed.

## Mobile

The login form is above the fold on a phone — the first field moved from y=936
to y=528 at 320px and from y=884 to y=504 at 390px. The assistant sheet shows
one header instead of two stacked ones announcing the same title twice.

## The attorney's demo case now exists server-side

Opening a case as the attorney returned 404 from `bankruptcy.analyze`, so the
review workspace rendered with no cash flow, no debt composition and no missing
items. The authorization rule was right — an attorney may review a case, not
conjure one — but the demo cases were seeded only in the browser, and a case
reaches the database only after its own client analyzes it. `case-miguel-demo`
belongs to a client nobody signs in as.

`DEMO_CASE_ID` is aligned to `case-elena-demo` and a second fixture seeds
`case-miguel-demo`, so both seeds now name the same cases. Verified in a browser
on a fresh database: the attorney opens the queued case, the preparation score
renders from the server analysis, and the console is clean.

`SEED_DEMO_DATA_ON_STARTUP` is still off by default, so a demo deployment must
opt in.

# FreshStart 4.8.0

Integrates `refactor/ui-global-audit`: one overlay layer system, one action control, one language switcher. No contract, route or business-rule change.

## Sticky positioning had been disabled globally

`overflow-x: hidden` on `html`/`body` computes `overflow-y` to `auto`, which makes the element a scroll container — and `position: sticky` descendants then bind to a scrollport that never scrolls. The sidebar *and* the header scrolled away on any long page.

`overflow-x: clip` suppresses horizontal scroll without creating a scroll container. Both values were measured before and after rather than reasoned about.

## Overlays could not escape their containers

`flowbite-react`'s `Tooltip` and `Dropdown` render as absolutely positioned siblings at `z-10` with no portal, so every table wrapper and `Card` clipped them — and `z-10` sits below the header and the bottom bar. Replaced with portaled primitives on a documented layer scale (`--z-index-*` in `index.css`, `docs/ux/OVERLAY-LAYERS-AND-ACTIONS.md`).

`useOverlayPosition` handles viewport-aware placement — flip, shift, scroll and resize tracking. `AppTooltip` adds hover plus keyboard focus, Escape, and `aria-describedby`.

## Copy composed in code bypassed i18n entirely

The attorney's generated summary was roughly seventeen hardcoded Spanish template literals. Locale-file parity passed the whole time, because none of that text lived in a locale file — the check could only see what was declared to it.

Two related defects: the profile's language outranked the device's explicit choice on every load, silently reverting a switch to English; and `fallbackLng` pointed at Spanish, so any English gap rendered Spanish and looked like a translation that existed.

## Nine equal buttons became one action control

`ActionGroup` is the standard: a primary segment plus a portaled menu, keyboard navigation, permission gating, an async loading guard, and mandatory confirmation for destructive actions.

`LanguageSwitcher` replaces the competing switchers with one component in `surface` and `onDark` tones. The assistant becomes a global surface (`AiLauncher`, `AiPanel`) with `closed | open | minimized` state.

## Evidence

Frontend 88 tests (10 new), lint 0 errors, i18n parity across 14 namespaces, production build. Backend 231 tests, `ruff` and `mypy` clean. `agent:verify` passes.

# FreshStart 4.7.2

Production was running the agent against a model called `llama-3.3-70b-versatile

`.

## What happened

The Vercel variables were set by piping values into `vercel env add` from PowerShell. The pipeline appends a line ending, and Vercel stored it as part of the value. Pulling the production environment back showed it plainly, and the API key carried the same tail.

Groq rejected every call: an unknown model, and an authorization header with a newline in it. `AgentRuntime` caught each failure and answered from the deterministic draft, exactly as designed, and nothing in the response said why. The only symptom was an assistant that never reached the agent — precisely what the reported transcript showed.

`ModelFactory` already stripped `openai_base_url`, which is why that one alone would have survived. `openai_model` and the key did not.

## The fix

A `field_validator("*", mode="before")` on `Settings` strips surrounding whitespace from every string setting. One place to absorb it beats every call site remembering to, and an invisible character in a dashboard-entered variable is common enough that the guard belongs at the boundary.

The test that matters most: a padded `DEFAULT_JWT_SECRET` is **still rejected** in production. That guard compares against an exact literal, so trimming has to happen first — otherwise a trailing newline would have smuggled the public demo signing key past it.

Backend 231 tests (12 new), `ruff` and `mypy` clean.

## What the audit also found

**Groq's free tier is 100,000 tokens per day.** Each agent turn costs roughly 12k, because the orchestrator delegates to specialists and the case context is re-sent at each hop — about eight turns a day. The corrected configuration reached `analysis_agent` before the daily limit stopped it, which is the delegation working.

The deployment now runs `llama-3.1-8b-instant`, which costs a fraction per turn, so a demo is not one conversation away from exhausting the day's budget. A demo that degrades halfway through looks exactly like the defect this release fixed.

# FreshStart 4.7.1

The skills agents load before touching this repository now describe the repository that exists.

## Nineteen contracts instead of nineteen paragraphs

`.claude/skills/*/SKILL.md` was the thinnest layer in the governance system: 281 lines across nineteen files, most of them a title and one paragraph of imperatives. `start-change` said "populate owned/shared paths" without saying that two agents claiming one path is rejected at registration, or that `changes/<task-id>.md` is claimed rather than `changes/**`. An agent loading it learned the step and not the reason, which is how the same collisions kept happening.

Each skill is now an operational contract: what it owns and does not own, when *not* to use it, numbered invariants, the searches to run before editing, a decision framework, the commands that actually validate the work, and worked examples taken from this codebase — including the wrong ones. 6,397 lines, derived by reading the agent scripts, the hooks, the contract registry, the repository protocols, the AI runtime, the component inventory, the locale validator and the test suite, then verifying that every path, command and enum cited exists.

## The corrections matter more than the length

Four skills were confidently describing a system that had moved on, and two of those errors were load-bearing.

`release-readiness-gate` listed absent case ownership and absent login rate limiting as confirmed blockers. Both have been present for several releases — `CaseAccessDep` is wired into the bankruptcy and documents routers, and the rate limiter spans config, security, the auth router and app startup, each with its own test. A gate that repeats a fixed blocker withholds a shippable release, and it costs exactly as much trust as one that waves a broken one through.

`ai-context-audit` searched for `backend/app/ai/providers/ollama_provider.py`, which ADR 0002 removed; Ollama has been a model behind `AgentRuntime` since 4.0.0. It also described RAG as possibly ingestion-only, when `bankruptcy_service.py` calls `CaseDocumentIndex.search` and feeds the result into the case context. Both checks were re-derived against the current layout, and four more added: allow-list mirroring between server and client, role redaction at specialist construction, the bounded agent loop with its lazy `strands` import, and whether injection and cross-case isolation are pinned by tests at all.

`design-system-audit` claimed only colour tokens existed and named icon-registry and hardcoded-copy violations that have since been migrated. Measured against the tree: the typography and spacing scales both exist, icon-registry bypasses are zero, and the hardcoded-copy heuristic returns nothing. What it found instead were four unregistered hex literals in `CaseWorkspacePage` and `LoginPage` — real drift that no mechanical rule covers, because `flowbite-check` enforces four specific rules and hardcoded colours is not one of them. Four checks were added for exactly that gap.

Stale test baselines were replaced with measured ones — 192 backend test functions across 24 modules, 73 frontend unit cases, 21 end-to-end cases — against a checklist still citing 55 and 27. Both audit skills now instruct the reader to re-measure, to compare like with like (pytest collects 219 because parametrized cases expand past the function count), and to say so when the numbers no longer match. A baseline written into a document is a claim with an expiry date.

## Boundaries made explicit

`visual-qa` and `visual-acceptance` had drifted into near-duplicates. They are now separated on the axis that matters: change-scoped and run by the implementer, versus app-wide and run independently before a release verdict. Both files say so, and both say that running one does not satisfy the other.

## Limitations

`.claude/agents/*.md` were not touched. `qa-release-gate.md` still carries the 55/27 baseline and still asks for an Ollama test phrased for the pre-ADR-0002 provider layout; that is a follow-up. `docs/flows/` is referenced by `CLAUDE.md` and by `create-feature-flow` but does not exist yet — the skill states this rather than implying otherwise. No new skills were created; the catalog records which responsibilities have no first-class owner (authentication and JWT, document upload and RAG ingestion as a domain, test authoring) instead of inventing files to complete a taxonomy.

Nothing in this release changes what the application does at runtime.

# FreshStart 4.7.0

Three defects a real transcript exposed. Together they made the assistant look like it was answering at random and showing nothing worth reading — and all three sat on the deterministic path, which is what every default deployment actually runs.

## It answered a question nobody asked

A client typed `2+2` and got *"No hay documentos pendientes en este expediente por ahora"* — the reply to the question before it.

`_detect_topic` inherited the previous turn's topic whenever the current message was four words or fewer. That is not what a follow-up is. Reproduced against the same history, `gracias`, `asdfgh` and `cuanto es 5*3` inherited `documents` too, so the assistant confidently answered something nobody had asked.

Inheritance now requires an explicit continuation — `¿y ahora?`, `otra vez`, `sí`, `what about` — with the length limit kept on top, so *"sí, pero ¿qué pasa con mi carro?"* opens a new subject rather than inheriting one.

## The chips made the user talk to themselves

The suggestions under an answer read *"Solicitar los documentos faltantes antes de discutir una estrategia."* and *"Programar una consulta para comparar alternativas disponibles."*

An `ask` action's label is sent verbatim as the user's next message, and those labels came from `next_steps`, `warnings` and `discussion_points` — imperatives aimed at the user and statements about the case. Clicking one made the user issue an instruction to themselves, which the assistant then had to interpret as a question.

Chips are follow-up questions now, three per intent, in the user's voice and the session's language. The information those lists carried is already in the answer's prose.

## The panel had nothing to look at

Every figure was already in the case context, and the deterministic path showed none of them — it emitted prose and no cards, while the agent path could emit cards. That is backwards.

Every deterministic answer now carries a `case_summary` card: monthly cash flow, total debt, assets, completion and evidence scores, plus pending-document and missing-section counts when there are any. Values come straight off the authorized context, so the card cannot disagree with the workspace behind it.

## Evidence

`test_assistant_usefulness.py` (19 new) is written against the reported transcript: junk inherits nothing while real follow-ups still do, the reported turn no longer repeats the previous answer, every chip ends in a question mark and none begins with an imperative lifted from `next_steps`, and the card reports `$18,000.00` of debt and `$9,000.00` of assets — what the case actually holds.

Backend 219 tests, `ruff` and `mypy` clean.

**Still limited:** an unrecognized message now gets the status-derived default rather than a wrong topic. Better, but not an acknowledgement that it was not understood — saying so would need an out-of-scope detector narrow enough not to fire on legitimate questions the keyword lists do not cover.

# FreshStart 4.6.1

Two defects a live run against Groq exposed. Both were invisible until a strict provider was pointed at this layer, and both made the agent look broken for reasons nothing in the response explained.

## The agent was being asked to invent an identifier

Half the turns degraded on one error:

```
tool call validation failed: parameters for tool AgentAnswer did not match
schema: errors: [`/actions/0`: missing properties: 'id']
```

`AssistantAction.id` was a required field. It is a React list key — it carries no meaning a model could know, so requiring it made the model guess. Providers differ in how strictly they validate structured output, which meant the agent path worked or failed depending on which vendor was configured, and the failure surfaced as a silent degrade rather than an error.

The field is optional now, and `AgentRuntime` assigns it after the allow-list filter, so the numbering has no gaps and a model that did supply one keeps it.

## The header contradicted the answer under it

`/ai/health` reported `ai_model_id` on the OpenAI path — the transformers provider's setting, defaulting to a HuggingFace repo id. The run answered with `llama-3.3-70b-versatile` through Groq while the endpoint said `Qwen/Qwen3-0.6B`, and the chat header renders that value. Same root cause as the `ModelFactory` fix in 4.5.0, in the one place that had been missed.

## Evidence

A real run through the agent layer against Groq (`llama-3.3-70b-versatile`): **4 of 8 turns answered by real specialists** — `documents_agent`, `analysis_agent`, `case_agent` — with `degraded: false`. Every one of the four that degraded failed on the missing-`id` error above.

This is the first time this layer has run against a hosted provider. `docs/evidence/live-agent-turns.json` still records the Ollama run; `live_agent_turns.py` is provider-agnostic now, since it hardcoded the one path the deployed demo does not use.

Backend 200 tests, `ruff` and `mypy` clean.

# FreshStart 4.6.0

The demo runs its agent and keeps its data without a paid account. Two blockers, both one variable away once the code supports them.

## The agent, on a free tier

OpenAI has no meaningful free tier, and the agent is the part of this product worth demonstrating — so the deployed demo could show everything except the thing 4.0.0 was built for.

`OPENAI_BASE_URL` points the `openai` provider at any endpoint speaking OpenAI's Chat Completions API. Groq, Cerebras, OpenRouter and Google AI Studio all expose one with a real free tier; `docs/DEPLOYMENT.md` lists the base URL and a working model for each. `OPENAI_API_KEY` holds whichever provider's key — the variable is named for the protocol, not the vendor.

**It switches the protocol, not just the host.** The existing path uses OpenAI's *Responses* API, which today only OpenAI implements. Sending that shape to a compatibility endpoint fails every call, and the runtime converts a failed call into a silent degrade — the symptom would have been "the agent never answers", with nothing explaining why. The token cap changes spelling with the protocol as well: `max_tokens`, not `max_output_tokens`. Some endpoints reject the unknown parameter and others ignore it silently, and in both cases the configured cap would not have been applied.

## The database, on a free tier

`docs/DEPLOYMENT.md` already promised that moving to Postgres was "a connection string and nothing else" — a promise that could not be kept, because no Postgres driver shipped anywhere.

`psycopg[binary]` now ships in both `requirements.txt` and `backend/pyproject.toml`, so the deployed runtime and the test suite exercise the same set. Neon and Supabase both have free tiers that suit this demo. Their DSN needs exactly one edit, now documented: `postgresql://` has to become `postgresql+psycopg://`, or SQLAlchemy looks for `psycopg2` and fails at the first request.

## Evidence

`test_postgres_readiness.py` holds the upgrade-path claim to account without needing a server: the driver imports, SQLAlchemy resolves the DSN to it, and **every column of every table compiles under the PostgreSQL dialect** — a SQLite-only type would fail there rather than at `alembic upgrade head` against a real database.

The provider tests assert against the real installed SDK classes: a base URL produces a Chat Completions model, no base URL still produces a Responses model, a whitespace-only value counts as unset (which is how an unset Vercel variable arrives), and the cap is emitted under the right name.

Size re-measured after adding the driver: a clean install of `requirements.txt` is **176.8 MB** against Vercel's 250 MB limit. Backend 196 tests, `ruff` and `mypy` clean.

**Not verified: a live call through any of these providers.** No key of any kind exists in this environment. What is proven is that the right class is built with the right parameters. Because the runtime degrades silently rather than erroring, a rejected model looks identical to a working deterministic answer — so on the first real turn, check that the response carries `degraded: false` and that `handled_by` names a specialist rather than `deterministic`.

# FreshStart 4.5.0

The Strands agent runs on the deployed demo. Until now Vercel could only answer from the deterministic fallback, because the SDK was deliberately excluded from the function's dependencies.

## Why the original decision failed

ADR 0002 kept `strands-agents` out of `requirements.txt`, reasoning that the function ran `AI_PROVIDER=rule_based` anyway, so the SDK would be "dead weight in a size-constrained runtime". Both halves failed.

The first was circular: the function ran `rule_based` *because* the SDK was absent. Asked to demonstrate the agent, the deployment could not, and no amount of configuration would have changed it.

The second was never measured. A clean install of `requirements.txt` is **101 MB**; with `strands-agents[openai]` it is **163 MB**, against Vercel's 250 MB unzipped limit — nowhere near the constraint it was rejected for. The ML stack it was grouped with (torch, transformers, docling) genuinely is, and stays excluded. The dependency test now enforces both directions instead of one.

## How it is wired

`api/index.py` sets `AI_PROVIDER=openai` unconditionally. That is safe because of a property ADR 0002 already established: with no `OPENAI_API_KEY` the model factory raises, `AgentRuntime` catches it, and the answer is the deterministic draft marked `degraded: true`. A deployment without the key behaves exactly as it did before; one with the key gains the agent.

OpenAI rather than Ollama because Ollama needs a model server on localhost and a serverless function has none.

## The defect this surfaced

`ModelFactory._create_openai` passed `settings.ai_model_id` as the model id. That setting belongs to the *transformers* provider and defaults to `Qwen/Qwen3-0.6B`, a HuggingFace repo id. OpenAI rejects it on every call, and the runtime converts a failed call into a silent degrade — so the observable symptom would have been "the agent is configured and never answers", with nothing in the response or the logs explaining why.

OpenAI now has its own `openai_model`, defaulting to `gpt-4o-mini`, mirroring the `ollama_model` setting that already existed.

## Enabling it

Set `OPENAI_API_KEY` in the Vercel project. Optionally `OPENAI_MODEL` — note that is **not** `AI_MODEL_ID`, for the reason above.

`AI_PROVIDER=openai` sends reduced case context — income, debts, and for an attorney session the private notes — to a third party. Every case in this deployment is synthetic (AGENTS.md rule 9), which is what makes this a demo decision rather than a disclosure one. It stops being true the moment real information is entered.

## Evidence

Backend 177 tests, `ruff` and `mypy` clean. The factory builds a real `OpenAIResponsesModel` against the installed SDK, asserted with `ai_model_id` simultaneously set to the HuggingFace default so a regression cannot pass by coincidence. The deployed function reports `openai` as its provider and still serves a login and `/ai/health` with no key present. Size measured with two clean `uv` environments, not estimated.

**Not verified: a live OpenAI call.** No key exists in this environment, so what is proven is the wiring up to the SDK's model object — the same limitation ADR 0002 recorded, now narrowed to one unverified hop. The Ollama path is exercised end to end in `docs/evidence/live-agent-turns.json` and shares every layer above `ModelFactory`. Confirm one real turn after setting the key.

# FreshStart 4.4.0

The Vercel deployment works. Three things stood between the repository and a usable deploy, and none of them was visible from the code you would read first.

## The API could not boot

`api/index.py` forces `ENVIRONMENT=production`, and `Settings` refuses to construct in production while `JWT_SECRET` is still the public demo key. That refusal happens at import time, so without the variable set in Vercel every `/api/*` route returns a function error — a completely dead backend, not a degraded one.

The guard is correct and stays. What was missing was anywhere that said so: `docs/DEPLOYMENT.md` now marks `JWT_SECRET` as boot-blocking, and `api/index.py` records why it is the one variable that must never be defaulted there — a default would silently sign real sessions with a key published in this repository.

## Every cold start served an empty workspace

The lifespan called `init_db()`, which creates tables and nothing else. `reset_demo_data()` was reachable only from a CLI script and an admin endpoint, so a visitor logged in and found nothing until somebody remembered to POST the reset — and lost it again at the next cold start, because the SQLite file lives in a per-instance `/tmp`.

`seed_demo_data_if_absent` is the non-destructive counterpart to `reset_demo_data`: it writes only into a database with no cases and no users, so it can safely sit on a boot path. The lifespan calls it behind `SEED_DEMO_DATA_ON_STARTUP`, off by default and on in the Vercel function.

The flag is deliberately not inferred from `environment`. The one deployment that needs it also runs with `ENVIRONMENT=production`, so any environment-derived rule would either miss it or arm itself against a real production database. Because the helper refuses to overwrite, the worst case of leaving it on is a no-op rather than a wipe.

## The deployment guide was wrong

`docs/DEPLOYMENT.md` stated the backend is stateless, that no code path reads Postgres, and that `DATABASE_URL` is "dead config… don't rely on it doing anything yet". All three were true before 4.0.0 and false since — anyone provisioning from that document would conclude no database was needed.

Rewritten with the real persistence story, a table of Vercel variables, an explicit account of what this target can and cannot demonstrate, and the concrete Alembic steps for moving to Postgres.

## What Vercel still cannot show

**Durable persistence.** Seeding makes the demo present, not permanent: two concurrent instances do not share rows, and a case owned in one invocation reads back ownerless after a cold start. Server-side ownership is enforced — it simply cannot be *demonstrated* on ephemeral storage. Point `DATABASE_URL` at managed Postgres to change that.

**The Strands agent layer.** The SDK is excluded from `requirements.txt` on purpose and a test keeps it out, so every answer comes from the deterministic fallback with `degraded: true`. Since 4.3.0 that path answers the question actually asked, so the demo reads well — but it is not the agent.

## Evidence

`test_vercel_entrypoint.py` boots `api/index.py` the way Vercel boots it — in a subprocess, from a scratch directory, because `Settings` is read and cached at import and this repository has an untracked `.env` that would otherwise supply the very secret the first test is trying to prove is missing. Without `JWT_SECRET` the process exits non-zero with the guard's message; with it, a cold start against a database that did not exist a moment earlier answers `/health`, logs the demo client in, and reports a populated case table; with the flag off, zero cases.

Backend 172 tests (7 new), `ruff` and `mypy` clean across 68 files.

# FreshStart 4.3.0

Closes the three defects the 4.0.0 live agent run recorded and 4.2.0 shipped with, and clears the six `mypy` errors that came with them. Two of the three turned out to be narrower symptoms of wider gaps; both wider gaps are fixed rather than patched at the reported spot.

## The assistant flags the answers that need a lawyer

A live turn answered *"No podemos determinar si debes declararte en bancarrota o no. Por favor, habla con tu abogado"* and returned `requires_attorney_review: false` — exactly backwards. An answer that declines to advise and routes to a professional is the clearest possible signal a professional has to look.

`ResponseGuardrails` gains a second family of trigger. The existing three rewrite an overreaching claim in place; the new one changes nothing about the message — it is already correct — and only raises the flag. It is deliberately narrow: matching the bare word "abogado" would fire on nearly every answer this product gives, since routing questions to the attorney is its whole purpose.

**The wider gap:** every guardrail pattern and every replacement clause was Spanish-only. An English session had no eligibility guard and no legal-advice guard *at all* — the product boundary held for `es` and was simply absent for `en`. All three now match both languages, and every user-visible string follows the session's.

## The assistant speaks one language at a time

Two Spanish turns came back with English action labels, and an English turn with Spanish ones. The model-authored half is addressed in the shared agent prompts, which now state that labels and card titles follow the answer's language instead of leaving it implied.

The deterministic half was structural. `BankruptcyAnalysisService` generated all of its prose — missing items, warnings, discussion points, chapter questions, next steps — as hardcoded Spanish, and the degraded path turns `next_steps` into the assistant's suggested-action labels. An English session received Spanish controls no matter what. That copy now lives in `app/services/analysis_copy.py` as a two-language catalogue; `guide()` passes the session's language and the `analyze` endpoint reads `Accept-Language`, so the request contract is unchanged.

**The trap that came with it:** `_section_for_missing` routes a missing item to a workspace section by matching Spanish words in its text. Translating the items alone would have sent every English session to "overview" — a link that still renders and always goes to the wrong place. Both languages are in the keyword lists now, with a test pinning that each English item routes where its Spanish counterpart does.

`required_evidence` is deliberately still Spanish-only: those strings are matched word-by-word against `EVIDENCE_TYPE_LABELS` to compute `evidence_score`, and translating one side without the other would silently zero it. A separate defect, recorded rather than half-fixed.

## `handled_by` is never blank

A turn answered from the agent path with `handled_by: ""`. The field has a default, but a model that emits the key explicitly overrides it, and the empty string is neither a specialist name nor `"deterministic"`. Normalized to `"orchestrator"` rather than rejected — discarding a good answer over an unfilled label would degrade a turn the agent actually handled.

## `mypy` is clean

All six errors were the same shape: a runtime check that was correct but invisible to the type checker. `decode_access_token` validated four JWT claims through `all(...)` over a generator, which narrows nothing, and tested the role with `in` against a set, which does not narrow `str` to a literal — so the one function that turns an unverified token payload into an authenticated identity reached its constructor with four unverified arguments. Roles now resolve through an allow-list mapping whose values carry the narrowed type.

## Evidence

Backend 165 tests (19 new), `ruff` and `mypy` clean across 68 files. Frontend 78 tests, lint 0 errors, i18n parity, production build. E2E 63 tests.

One note for anyone running the suite locally: an orphaned API server from another checkout was holding port 8000 and answering as 4.1.0, and `reuseExistingServer` adopted it — so runs were exercising stale backend code, taking 10+ minutes on timeouts and reporting failures that did not reproduce. With the port freed the same suite is 63 passed in 1.2 minutes. `E2E_WEB_PORT` / `E2E_API_PORT` exist for this; a linked worktree should set them.

# FreshStart 4.2.0

Consolidates every parallel agent branch into `main`: the responsive navigation shell, an app-wide overflow gate, parallel-safe agent governance, and a deterministic assistant that answers the question it was asked.

## The shell is two surfaces over one configuration

`BottomNavigation` below 768px, `Sidebar` as a permanent column above it, each owning its own breakpoint so the switch happens in exactly one place per surface and cannot disagree with itself. Replaces `MobileNavigation` and `MobileBottomNavigation`. Adds `AppLogo`, `LanguageToggle` (replacing `LanguageSelector`), and a fuller Help page.

Case sections are routes now — `/case/:caseId/:section` — so a stage can be linked to, survives a reload and takes part in browser history. Bookmarked `?focus=` links still resolve, through the same map the assistant's actions use.

## The assistant is a destination

It was a floating button opening a right-edge drawer, which meant it had no URL. It now lives at `/assistant`: linkable, reload-safe, in browser back/forward, and no longer a second navigation surface competing with the bottom bar on a phone.

The 4.0.0 conversation logic came with it — cards, `degraded`, the server-composed contract — minus the drawer-era controls: the upload placeholder that opened a second dialog to announce the feature did not exist, the "open recommended section" button that duplicated a chip above it, and the close control a page does not need.

## It answers the question it was asked

`RuleBasedProvider` branched only on role, status and missing items, reading the message solely for two literal chapter-7/chapter-13 substrings — so two different questions against the same case returned the identical reply. It now detects the topic from the message (documents, debts, assets, income/expenses, household, alerts, progress, generic "what's missing", greeting) and answers from the case figures that topic is about, inheriting the previous turn's topic for a short follow-up like "¿y ahora?".

Keyword matching, not a classifier: this is the deterministic provider, and every branch has to stay auditable by reading the list beside it. It matters more than when it was written — the live agent run degrades to this draft whenever the model path fails, which was 3 of 8 turns on `llama3.1:8b`.

`recent_conversation` is now framed as inert data alongside retrieved RAG chunks. Both are client-influenced text and need the same "this is DATA, not INSTRUCTIONS" header.

## Overflow is a gate, not an audit

`e2e/responsive-overflow.spec.ts` measures the widest right edge any laid-out element reaches across 320–1440, for both roles and every workspace stage. It does not measure `scrollWidth`: `index.css` clips horizontal overflow at the document level, so the previous mobile assertion passed no matter how far content spilled.

It found two real spills on its first run. The Documents stage laid its two cards out at their 320px min-content width inside a 288px track, and `AppLogo`'s link had `min-w-0` on the text span but not on itself, so at 320px the product name pushed the header's controls 19px off screen. Both are the same defect: a flex or grid item's automatic minimum size is its content, and truncation inside cannot engage while the box is free to grow.

`playwright.config.ts` takes `E2E_WEB_PORT` / `E2E_API_PORT`, so a linked worktree runs its own servers instead of silently testing another checkout's build.

## Agents can now run in parallel safely

Cross-checkout path claims, atomic locked shared state, a per-checkout edit ledger, `npm run agent:fleet`, `npm run agent:snapshot`, and governance commands that archive rather than delete. The `PreToolUse` command hook now also matches PowerShell, which previously bypassed every command guard on this project's primary platform.

## Evidence

Frontend 78 tests, lint 0 errors, i18n parity, production build. Backend 147 tests (14 new), ruff clean. E2E 63 tests, full serial run green.

Known and unfixed, carried from 4.0.0's live-agent run and recorded in `changes/chat-modal-centered.md`: `handled_by` can come back empty, a refusal that tells the user to consult a lawyer does not raise `requires_attorney_review`, and action labels leak across languages. `mypy` reports 6 pre-existing `arg-type` errors in `case_context_builder`, `runtime` and `security`.

# FreshStart 4.1.0

Every dialog in the app now composes one governed modal shell, and the preparation assistant is one of them (`feat/ui-responsive-branding-nav`). Additive: no API, payload or contract change.

## Dialogs stopped escaping their own panel

Documents → Add Evidence rendered its footer, and both its actions, outside the modal on short viewports — at 320×568 the footer sat 64px below the panel and 23px below the viewport. The cause was structural, not cosmetic: a `<form>` wrapped body and footer *inside* Flowbite's flex column, carrying neither `flex-col` nor `min-h-0`, so it overflowed the panel's `max-h` and dragged the footer out with it.

`components/overlays/AppModal` now owns viewport, scroll and focus behaviour in one place, with `components/forms` (`FormField`, `TextField`, `SelectField`, `TextareaField`, `CheckboxField`, `FileField`, `FormGrid`, `FormActions`) for what goes inside. `ConfirmDialog`, the six `CaseActionBar` action modals and `BankruptcyEntryModal` all compose it.

## The assistant is a dialog, not a drawer

It was a right-edge Drawer capped at `md:max-w-md`, so the assistant's cards — a two-column list of case figures — were squeezed into ~380px on a 1440px display, and below `sm` it took the full width anyway. It is now centred on the same shell: 672px at 1440×900, with the shell's focus trap, Escape, outside-click dismissal and focus return.

`fillHeight` gives it a stable working height. Without it the panel hugged its content, so it grew with every turn and walked the composer down the screen while the user was typing in it.

Four controls left, with their seven i18n keys in both languages: the upload button and its "coming soon" dialog (a placeholder that opened a second dialog from inside the first to say the feature does not exist), the "open recommended section" button (it navigated to the same destination as one of the chips above it), the custom close button, and an unreachable "open a case first" branch.

## A real model has now run through the agent layer

4.0.0 shipped with an open question: *"No live LLM has run through this layer."* `backend/scripts/live_agent_turns.py` closes it. Eight turns against `llama3.1:8b` — five answered by real specialists, three degraded to the deterministic draft, all recorded in `docs/evidence/live-agent-turns.json`.

The answers check out against the case's known figures: `$308.33` monthly cash flow and `$18,000` total debt are exact, and asked directly whether the client qualifies for Chapter 7 the assistant refused and routed to the attorney — once on each path. Every assistant response in the chat's tests is a verbatim transcript of that run.

It also exposed three defects in the 4.0.0 agent layer, recorded in `changes/chat-modal-centered.md` and **not yet fixed**: `handled_by` can come back empty; a refusal that tells the user to consult a lawyer does not raise `requires_attorney_review`; and action labels leak across languages in both directions.

## Evidence

Frontend 67 tests (24 new), lint 0 errors, i18n parity, production build. Backend 133 tests. E2E: `chat-modal.spec.ts` (10) and `documents-add-evidence.spec.ts` (13) across 320–1440, asserting panel geometry, centring, no page-level horizontal overflow, focus trap, Escape and focus return. `matter-workflow`'s client 10-step flow passes again, including the step 4.0.0 recorded as failing.

# FreshStart 4.0.0

Strands Agents orchestration replaces the rewrite-only Ollama provider (`feat/strands-agent-layer`). Contract-breaking: see `docs/decisions/0002-strands-agent-orchestration.md` for the decision, the rejected options and the rollback path.

## The assistant can now look things up

Until 3.1.0 a model could only rephrase a deterministic draft — `RuleBasedProvider` decided every fact, action and section, and `OllamaProvider` swapped the prose. Safe, but the assistant could never answer anything the rule engine had not anticipated.

An orchestrator now delegates to five role-gated specialists (Agents-as-Tools), each holding only the read-only tools it needs: case status, financial figures, documents and RAG search, product help, and attorney review notes. Facts reach the model through tools, never through the prompt.

## What did not change

- **No automated legal advice.** The model cannot author the disclaimer and cannot lower `requires_attorney_review` — both are server-computed from the deterministic draft and the guardrails.
- **No cross-case access.** No tool accepts a `case_id` or `role`; tools close over the case `CaseAccessService` already authorized. Asserted against the JSON schema the model is actually handed, not just the Python signature.
- **The assistant always answers.** The deterministic draft is computed on every request. Missing extra, missing credentials, timeout, bad output or any other failure degrades to it, reported honestly as `degraded: true`.
- **Default deployment is unchanged.** `AI_PROVIDER` stays `rule_based`; the agent layer is an optional `agents` extra, excluded from the trimmed Vercel function.

## Breaking change

`AssistantResponse` becomes `language/message/handled_by/actions/cards/warnings/requires_attorney_review/degraded/disclaimer`. `intent`, `suggested_actions`, `focus_section`, `requested_fields`, `requested_documents`, `summary_updates` and `confidence` are gone. `focus_section` returns as an `open_page` action so the "open the recommended section" affordance survives — a regression a real end-to-end request caught and the unit tests had not. The frontend consumer, types and tests are updated in the same delivery; no other client exists.

Config: `OLLAMA_TIMEOUT_MS` removed (the SDK owns transport); `AI_TEMPERATURE`, `AI_MAX_OUTPUT_TOKENS` and `OPENAI_API_KEY` added. `OLLAMA_EMBEDDING_MODEL` is untouched — it belongs to RAG, not to `AI_PROVIDER`.

## Governance tooling

`scripts/agent/common.mjs` and both `.claude/hooks` resolved every path against the primary worktree and shared one `active-task.json`. A file inside a linked worktree therefore resolved to `../Glade-Demo-<task>/…`, matched no ownership glob and was always denied; and registering a task in any worktree silently replaced every other worktree's manifest. Rule `01-git-delivery` mandates worktrees for parallel work, so the governed workflow was unusable in exactly the setup the rules require. Paths now resolve per checkout, and each checkout owns its manifest under `claude-state/active/`.

## Evidence

Backend 133 tests, ruff, mypy. Frontend 47 tests (10 new), lint, i18n parity, production build. Real end-to-end HTTP against a running server: auth, ownership, persistence, serialization, 403 on role mismatch, 401 unauthenticated. Real Strands SDK integration: agents construct, tool specs generate from docstrings and type hints, `as_tool()` delegation registers, role gating holds.

## Known open items

- **No live LLM has run through this layer.** No reachable Ollama daemon and no `OPENAI_API_KEY` in the validation environment. Everything up to the SDK's tool surface is exercised; the model call is not. Confirm a real turn with `AI_PROVIDER=ollama` before treating the agent path as proven.
- `AI_PROVIDER=openai` sends reduced case context (income, debts, and for an attorney session the private notes) to a third party. Opt-in, off by default; enabling it is a data-egress decision.
- Write actions are not implemented; phase 1 is read-only. `requires_confirmation` is carried in the contract so the signed-confirmation flow is additive rather than another breaking change.
- Carried over from 3.1.0: no visual/screenshot QA, no committed production CORS origin, SQLite on Vercel's `/tmp` is not durable across cold starts.

# Fresh Start 3.2.0

UI design-system foundation, application shell, mobile navigation, branding and
section navigation (`feat/ui-responsive-branding-nav`). Frontend only — no API,
contract, auth or data-model change.

## Design system

- Flowbite v3 semantic token layer in `frontend/src/index.css`: ~20 token names
  (`bg-neutral-*`, `border-default`, `text-heading`, `text-fg-brand`,
  `rounded-base`, …) mapped onto the existing `:root` palette. `flowbite-react@0.12.9`
  does not ship these, so component blocks copied from flowbite.com previously
  rendered unstyled. It is a naming adapter, not a second palette.
- Every component now styles itself through those tokens. A sweep of
  `frontend/src/**/*.tsx` returns no raw Tailwind palette class (`indigo-600`,
  `emerald-700`, `amber-50`, `slate-*`, `gray-*`) in any JSX.
- New shared primitives: `AppAccordion` (restores the `aria-expanded` /
  `aria-controls` that `flowbite-react`'s AccordionTitle omits), `FloatingField`,
  and typography roles (`SectionTitle`, `BodyText`, `HelperText`, `ErrorText`,
  `FieldLabel`).

## Application shell and navigation

- Mobile gets a persistent bottom navigation bar plus an overflow drawer. It
  previously had a single floating menu button as the only route to any
  destination — two taps per navigation, and no indication of where you were.
- The desktop sidebar is collapsible (256px / 80px) with the preference
  persisted, carries the product mark, and no longer renders below 768px.
- `useRoleNavigation()` is the single resolver of which destinations a role
  gets, shared by the sidebar, the bottom bar and the drawer.
- `UserMenu` extracted so the product has one avatar-menu implementation. The
  build version now appears once, in the footer, instead of in both header and
  footer.

## Fixed

- **Documents / Tasks / Activities went nowhere useful.** The case page read
  `?focus=` once, copied it into component state and deleted it from the URL. A
  refresh reset to the first stage, browser Back/Forward never moved between
  stages, and no navigation entry could mark itself active because the
  destination it linked to no longer matched. The active stage is now derived
  from the URL and written back on navigation.
- **The attorney queue forced page-wide horizontal scroll at every viewport
  below 1280px.** `AppShell`'s content column is a flex item, and a flex item
  defaults to `min-width: auto`, so it refused to shrink below its content's
  intrinsic width; the queue's table pinned it at ~1280px and dragged the
  sidebar and header along. Fixed with `min-w-0` at the cause, not with
  `overflow: hidden`.
- The EN/ES control was a dropdown with exactly two items; it is now a direct
  toggle that labels itself with the language it switches to.
- Browser tab and metadata said `MatterReady`; the visible product name was
  written `FreshStart` with no space across the header, login, footer and both
  locale sets. Technical identifiers (`matter-ready-web`, the demo credentials)
  deliberately unchanged.
- `AsyncState` and `ProtectedRoute` rendered hardcoded English during a Spanish
  session; `ConfirmDialog` rendered hardcoded Spanish button labels during an
  English one, with unreachable `t()` fallbacks beneath them.
- `LanguageSelector` announced as just "ES" — its `aria-label` sat on an inner
  `<span>`, which contributes nothing to a button's accessible name.
- `DataTableToolbar` squeezed its search field to ~22px at 768px; the row
  actions trigger and several controls were below a reliable touch size.

## Added

- `/help`: a help centre with seven accordion sections (getting started,
  documents, tasks, activity, AI assistant, account, FAQ) in ES and EN. "Ayuda"
  previously pointed at `/about`, which mixes product help with privacy and
  terms; `/about` keeps the legal and reviewer-facing detail.

## Verification

Verified in a browser against the running backend, at 320 / 375 / 390 / 430 /
768 / 1024 / 1280 / 1440: no horizontal scroll for either role, no duplicate DOM
ids, no console errors, no `href="#"` placeholders, no unlabeled controls, tap
targets at or above the touch floor in the bottom bar, and nothing hidden behind
it. Language switching, accordion ARIA, bottom-nav active state, deep-link
refresh and browser Back/Forward all confirmed live. Build, lint (0 errors),
`i18n:check` (14 modules) and 37/37 unit tests pass on this branch in isolation.

Not covered: a screen-by-screen review of visual hierarchy and density, and the
form/CRUD primitive work being delivered separately.

# FreshStart 3.1.0

Glade interview-demo audit (`fix/glade-demo-audit-i18n-ai-health`) — full bilingual rollout plus the regressions caught while wiring it up. Two later change sets landed on top of this same 3.1.0 line without a version bump (see each subsection).

## Real persistence, case ownership, sidebar/design system, AI context (RAG+timeline), security hardening

Session-driven refactor addressing `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md`; full detail in `docs/audits/GLADE-DEMO-PHASE1-RESOLUTION-2026-08-06.md`.

- Real persistence layer (SQLAlchemy + Alembic); `domain/`/`repositories/` implemented for real. Server-side case-ownership authorization on every case-scoped endpoint — `owner_user_id` is always server-derived, never client-claimed.
- Sidebar-driven app shell, typography/spacing design tokens, consolidated button/icon usage, i18n cleanup, `CaseWorkspacePage` tab-navigation race condition fixed (single `activeStage` source of truth).
- RAG wired into the AI guidance flow (was ingestion-only before), case timeline + conversation history in the AI context, prompt-injection framing for retrieved documents.
- Login rate limiting, JWT production-secret boot guard, CORS production warning, demo-reset scoped to the attorney persona, functional "remember me".
- Backend tests: 55 → 89 (2 skip-gated pending a live Ollama daemon). Frontend tests: 27 → 37.
- Known open items: no visual/screenshot QA this pass; Ollama live-integration test exists but has not run against a real daemon yet; no committed production CORS origin; SQLite on Vercel's `/tmp` is not durable across cold starts.

## Agent governance & tooling (`chore/agent-governance-v2`)

- Added native Claude Code context through root and nested `CLAUDE.md` files plus path-aware `.claude/rules`.
- Added governed lifecycle skills for baseline, task start/planning, Flowbite, feature flows, API/backend/AI/i18n changes, ADRs, verification, worktree integration, versioning and completion.
- Added specialized read-only, isolated implementation, testing, integration and independent release-gate agents (kept our own `ai-context-engineer` and `security-reviewer` definitions where both change sets defined the same agent).
- Added Claude hooks that protect `main`, reject destructive/non-selective Git commands, require task ownership, protect shared version files and block incomplete task closure.
- Added cross-platform Node tooling for repository context, task manifests, ownership, change fragments, architecture/Flowbite checks, worktrees and verification.
- Added Conventional Commit, pre-commit and full pre-push Git hooks.
- Replaced stale MatterReady/TanStack/React Hook Form/Zod/SQLAlchemy-UoW skill assumptions with pointers to the actual FreshStart architecture.
- Added Flowbite and new-flow governance, templates, schemas and agent-system documentation.
- Added CI governance and i18n gates while preserving backend, frontend and Playwright gates.
- Parallel worktrees now use change fragments; only the integration owner performs the final SemVer bump.
- `VERSION` and the root/frontend application manifests are runtime release authorities. The backend API reads `VERSION`; Python package metadata remains lock-consistent and `uv lock --check` preserves dependency reproducibility.
- Frontend lockfile root version is informational; dependency integrity remains enforced by `npm ci`, and local version commands refresh its metadata.

## Bilingual i18n rollout, AI health, reusable UI primitives

- New bilingual i18next system: per-namespace locale files (es/en), a `LanguageProvider` resolving profile → persisted → browser preference, a `LanguageSelector`, `Accept-Language` propagated on every API request, and a `validate-locales` script (`npm run i18n:check`) enforcing matching keys across both languages.
- Backend error responses are now localized from `Accept-Language` via a centralized bilingual message catalog; `DomainError` subclasses carry a `code`/`message_key`.
- New `GET /api/v1/ai/health` endpoint (contract id `ai.health`) reports live AI provider/model/availability; the header and chat panel show real-time connectivity with retry.
- New reusable component tier: `AppButton`, `DataTableToolbar`, `RowActionsMenu`, `ConfirmDialog`, `useConfirmation`/`useDisclosure`, and a generic `apiClient`/`createCrudService` pair.
- Income/expense/debt/asset/evidence option values moved from literal Spanish display strings to canonical slugs so they key into the locale catalogs.
- Fixed: evidence-completeness scoring silently read 0% instead of the correct value after the slug refactor (both frontend and backend keyword-matched against the raw slug instead of its translated label); demo seed data still held pre-refactor evidence-type strings.
- Fixed: the attorney demo account defaulted to English while the client account defaulted to Spanish, silently flipping the UI language on attorney login.
- Fixed: requesting a document showed the raw internal slug (e.g. `government-id`) as its file name; changing case status wrote an untranslated status slug into the case timeline.
- Fixed: the deterministic AI provider's Spanish responses and the backend error catalog were missing accents throughout, including `anos` for `años` (a different word, not a typo).
- Rewrote `e2e/matter-workflow.spec.ts`, stale against the v3.0.0 client-dashboard rebuild, and pinned the Playwright browser locale to `es-PR` so tests don't silently run against an English-rendered app.

# FreshStart 3.0.0

Intelligent-workspace refactor (`feat/freshstart-intelligent-workspace`) — see `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` and `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md` for the full audit and plan.

**Breaking change**: `POST /api/v1/bankruptcy/guide` now returns `AssistantResponse` instead of `GuidanceResponseDto` (`reply` → `message`; `suggested_actions` is now structured `AssistantAction[]` instead of `string[]`; new `intent`/`requested_fields`/`requested_documents`/`warnings`/`summary_updates`/`requires_attorney_review`/`confidence` fields).

- Icon system replaced with a `react-icons/hi2` registry; canonical `--color-*` design tokens.
- Role-aware header/footer; new `/about` page for reviewer-facing detail.
- Client dashboard rebuilt to greeting → status → progress → next action → chat → tasks → documents → financials → timeline → attorney status.
- Client workspace reorganized into the 10-stage flow (Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento); new `ResponsiveDataView` (table on desktop, cards on mobile) and `StageOrientation` components.
- Attorney dashboard rebuilt into an operational queue: 10 filter views, search, sort, pagination.
- New attorney "case command center" action bar: solicitar documento, solicitar aclaración, añadir nota, programar consulta, asignar abogado, marcar urgente, cambiar estado, generar resumen, enviar mensaje al cliente.
- Chat is now a persistent, app-shell-level panel (floating button + drawer), not a workspace tab — reachable from the dashboard and every case.
- New pluggable AI provider architecture (`rule_based` default / `ollama` / `transformers`) — model-backed providers only ever rewrite a deterministic draft's phrasing, never invent facts or actions.
- New `CaseContextBuilder`: AI providers receive a reduced, per-role-redacted, audited context — never the raw case.
- New `ResponseGuardrails`: softens eligibility claims, chapter "best option" claims, and definitive legal-advice phrasing on every assistant turn, forcing attorney review when triggered.
- Fixed a real authorization gap: the guidance endpoint now verifies the request's declared role against the JWT, rejecting a mismatch (403) instead of trusting it.
- New document ingestion pipeline (extraction, classification, evidence extraction, chunking, embedding) and a per-case-isolated RAG index, behind a new authenticated `POST /api/v1/documents/analyze` endpoint.
- Full responsive (320–1440px) and accessibility (focus trap, aria-labels) verification pass.
- Expanded test suites: backend pytest 10 → 54; frontend went from 0 to 9 component/unit test files; Playwright expanded from one happy-path spec to the full client/attorney flows plus a mobile-viewport run.
- Removed unused dependencies (`@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`) and the orphaned `frontend/vercel.json`.
- Retired seven docs describing the pre-pivot legal-matter-intake product; consolidated the duplicate `SECURITY.md`; fixed stale naming in `AGENTS.md`, `.agents/memory/`, `docs/ARCHITECTURE.md`, and `docs/DEPLOYMENT.md`.

# FreshStart UI refresh 2.0.1

- Removed obsolete persistence foundations and legacy frontend remnants left over from the MatterReady-era codebase.
- Flowbite compatibility fixes across the rebuilt frontend.
- Added the bankruptcy product blueprint (`docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`).

# FreshStart Bankruptcy Guide 2.0.0

Major pivot: replaced the legal-matter-intake domain (MatterReady) with the FreshStart bankruptcy guidance product.

- Replaced the matter/conflict/readiness engine with the bankruptcy guidance engine.
- Built separate client and attorney bankruptcy portals.

# MatterReady AI Intake Copilot 1.0.0

- Introduced the AI Intake Copilot: a stateless, chat-first case-packet engine, replacing the prior matter workflow.
- Isolated heavyweight AI dependencies from the production API runtime.

# MatterReady 0.4.0

- Added a persistent, browser-based demo workspace so evaluation state survives reloads.
- Made the product purpose and guided task explicit in the UI.
- Replaced a dead-end error state with a guided recovery flow.

# MatterReady 0.3.1

- Fixed authentication dependency installation in the Vercel runtime.
- JWT security import/formatting fixes.

# MatterReady 0.3.0

- Added authenticated, human-centered workspace foundations.

# MatterReady 0.2.3

- Housekeeping release: version synchronization and CI groundwork ahead of 0.3.0.

# MatterReady 0.2.2

- Simplified delivery pipeline with reproducible CI and Vercel Git deployments.
- Removed blocked release workflows and temporary deployment logic.
- Added versioned health response and production security headers.

# MatterReady 0.2.1

- Professional Flowbite product shell and guided workflow.
- Responsive navigation and visible release version.
- Centralized Semantic Versioning across frontend and backend.
- CI enforcement for version synchronization and release increments.
- Internal routing diagnostics removed from the public product experience.
