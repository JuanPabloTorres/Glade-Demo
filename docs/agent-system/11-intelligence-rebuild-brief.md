# Master brief — rebuild the agent intelligence architecture

**Audience:** a fresh Opus 5 session with no prior context on this repository.
**Mission:** audit and rebuild `.claude/`'s agent layer and the system
intelligence it reads from. **Not** to fix UI, AI or product defects. Those come
after, using what you build here.

This brief is grounded in measurements taken against the tree at `4.8.0`. Where
it states a fact about the repository, that fact was verified by reading the
file or running the command named. **Verify each one again before relying on
it** — the reason this rebuild is necessary is that the last generation of
these artifacts decayed, and this brief will decay too.

---

## 0. The finding that should shape everything you build

The problem with `.claude/` is **not** that it is vague. It is that **parts of
it are confidently wrong**, and nothing detects that.

`.claude/agents/frontend-shell-engineer.md` carries a section literally titled
`## Ground truth (verified)`. It asserts:

- *"There is no sidebar."* — False. `AppShell.tsx` renders `<Sidebar />` and
  `<BottomNavigation />`.
- A tab race condition at `CaseWorkspacePage.tsx:73-74` driven by
  `ATTORNEY_REVIEW_TAB_INDEX = 10`. — False. The page derives the active stage
  from the URL; the constant does not exist. The logic now lives in
  `frontend/src/pages/caseWorkspace/useCaseStageNavigation.ts`.

This is not an isolated slip. `changes/skills-standard.md` records the same
decay one generation earlier: skills searched for
`backend/app/ai/providers/ollama_provider.py`, which no longer exists, and
`release-readiness-gate` listed absent case ownership and absent login rate
limiting as confirmed blockers when both were present — a false NO-GO.

**A vague agent investigates. A confidently-wrong agent acts on a lie.** The
second is worse, and both generations of this repository's agent prose have
produced it.

The corollary decides the architecture:

> Prose that *describes* the system decays silently. A check that *executes
> against* the system cannot. Prefer the executable form for anything load-
> bearing; where prose is unavoidable, make it dated, sourced and cheap to
> re-derive.

Evidence from the session that produced this brief, all of it defects that
existing prose did not prevent and existing tests did not catch:

| Defect | What found it |
| --- | --- |
| CI red on `main` for every PR (`uv.lock` out of sync) | `uv lock --check` |
| Assistant answered "should I file for bankruptcy?" with document boilerplate, unflagged, in both languages | a golden-dataset grader that fails |
| Login card clipped 47px at 320px | a browser measuring pixels — the overflow assertion reported green, because `<main>` is `overflow-hidden` |
| Timeline frozen in Spanish inside `localStorage` | reading the persisted shape, not the component |
| `ChatBubble` leaking a timer past unmount | removing test isolation, which made it fail loudly |

None of these were found by an instruction telling an agent to be thorough.

---

## 1. What already exists — do not rebuild it

Auditing means finding out what is there. Here is what was verified so you do
not spend the budget rediscovering it, and so you do not duplicate finished
work.

### 1.1 The skills are already rebuilt. Leave them alone.

`.claude/skills/` holds 19 skills, ~20 KB each, ~6,400 lines total. Each already
follows one structure: identity, purpose, mission, activation conditions
including when *not* to use it, system context with real repository paths,
source-of-truth precedence, ownership, boundaries, numbered invariants,
dependencies, required knowledge, inputs, preconditions, discovery procedure,
decision framework, execution workflow, proactive behaviour (local / horizontal
/ vertical / pattern / regression), expected and forbidden behaviours, error
handling, edge cases, cross-system checklist, validation strategy, definition of
done, expected output, escalation rules, collaboration edges, worked examples,
failure scenarios, self-review.

That is the same contract a rebuild would specify. **The work is done.**

Two caveats you must handle rather than ignore:

1. **It is uncommitted.** It lives in the sibling checkout
   `Glade-Demo-skills-standard` on branch `docs/skills-standard`, 19 recorded
   edits, claiming `.claude/skills/**`. Run `npm run agent:fleet` and confirm
   before touching anything under that path. Editing it from another checkout
   forks the file and integration keeps one version.
2. **They are monolithic.** ~20 KB per skill means every `/skill` invocation
   spends 5,000–7,000 tokens before a line of code is read. There is no
   progressive disclosure — no `references/` subfiles. That is the one skill-
   layer change worth making, and it is a *split*, not a rewrite: keep the
   contract in `SKILL.md`, move worked examples, catalogues and long tables into
   `references/`. Do it only after `docs/skills-standard` lands.

### 1.2 The rules, hooks and governance scripts are real and they enforce

`.claude/rules/` — 6 top-level rules plus `frontend/`, `backend/`, `ai/`
subdirectories. Short and declarative, which is correct for rules.

`.claude/hooks/` — five hooks that actually deny:

- `validate-edit.mjs` — denies any edit outside the active manifest's
  `ownedPaths`, on `main`, or on a file already modified in another checkout.
- `validate-command.mjs` — blocks destructive git (`reset --hard`, `clean -f`,
  force push, `git add .`, `worktree remove --force`, `stash drop`, `branch -D`)
  and denies mutation with no active manifest.
- `after-file-change.mjs` — records every touched file in the cross-checkout
  fleet ledger.
- `session-start.mjs`, `register-worktree.mjs`, `validate-task-completion.mjs`.

`scripts/agent/` — `context`, `task`, `fleet`, `ownership`, `snapshot`,
`worktree`, `changeset`, `verify`, `architecture-check`, `flowbite-check`.
`npm run agent:validate` runs in 2.5 s.

**These work.** Do not replace them. One known sharp edge worth documenting
rather than "fixing": `validate-command.mjs`'s mutation pattern includes a bare
`>`, so any PowerShell command containing `2>&1` is treated as a mutation and
denied while no manifest is active — which is exactly the moment you are trying
to register one. Document the workaround (drop the redirect) in the workflow
docs you write.

### 1.3 What is genuinely missing — verified absent

```text
docs/system/KNOWN-PATTERNS.md     absent
.claude/architecture/             absent
.claude/workflows/                absent
```

`docs/agent-system/` (11 files) and `docs/architecture/` exist but describe
target architecture and migration history, not a current map.

---

## 2. What is actually broken

### 2.1 The agent layer is bimodal, and both modes fail differently

Measured line counts:

```text
10-13 lines   product-ux-reviewer, repository-architect, change-orchestrator,
              integration-manager, release-gate, test-engineer,
              backend-contract-engineer, flowbite-design-system-engineer,
              frontend-feature-engineer                            (9 of 16)

36-59 lines   ux-product-director, design-system-engineer, security-reviewer,
              backend-persistence-engineer, frontend-shell-engineer,
              ai-context-engineer, qa-release-gate                 (7 of 16)
```

- The nine short ones are the failure the critique describes: a role name and a
  paragraph of imperatives. They carry no ownership, no invariants, no
  definition of done.
- The seven long ones fail the *other* way: they are specific, grounded, and
  **stale** (see §0).

Both need rebuilding. They need opposite fixes, and the second is the dangerous
one.

### 2.2 Governance is defined but not adopted

`npm run agent:fleet` reports, every run:

```text
8 checkouts live
6 with no active task manifest — their edits fall back to shared state
```

The ownership model only works when every checkout registers. Six do not. This
is not a definition problem — the definitions are good and the hooks enforce
them. It is adoption, and adoption is a workflow and a default, not a document.

### 2.3 There is no canonical-component registry

The critique is right that this is the highest-leverage missing artifact. The
raw material exists and is scattered:

- `docs/ux/FLOWBITE-COMPONENT-STANDARDS.md`
- `docs/ux/OVERLAY-LAYERS-AND-ACTIONS.md`
- `frontend/src/config/iconRegistry.ts`
- `scripts/agent/flowbite-check.mjs` and its exceptions registry — which already
  encodes canonical-vs-exception mechanically, and is the model to extend

Nothing states, in one place, "for problem X the canonical component is Y."

---

## 3. Your mission, in phases

Each phase has a gate. Do not start the next until the gate passes. Register a
task manifest per phase (`/start-change`); one coherent change per branch.

### Phase 1 — Audit, and prove the audit

Read every file in `.claude/agents/`, `.claude/rules/`, `.claude/hooks/`,
`.claude/skills/` (read, do not edit), `docs/agent-system/`, and the governance
scripts.

For every factual claim an agent or rule makes about the code — a path, a line
number, a constant, a component, a defect — **verify it against the tree** and
record the verdict. Produce `docs/agent-system/12-intelligence-audit.md` as a
table: artifact, claim, verified true/false/unverifiable, evidence.

**Gate:** the audit names at least the two false claims in
`frontend-shell-engineer.md` documented in §0. If your audit does not find those,
your audit method is not working — fix the method, not the report.

### Phase 2 — System map, derived from code

Create `.claude/architecture/` with maps **generated or verified from the tree**,
never from memory or from `docs/architecture/`'s target state:

- `SYSTEM-MAP.md`, `FRONTEND-MAP.md`, `BACKEND-MAP.md`, `AI-MAP.md`,
  `DATA-FLOW.md`, `COMPONENT-HIERARCHY.md`, `DEPENDENCY-MAP.md`

Every map carries, at the top: the commit it was derived from, the date, and
**the command that regenerates or re-verifies it**. A map without a
regeneration command is a map that will be wrong within a month — the evidence
for that is this repository's own history.

Prefer maps that are *checked* over maps that are *written*. Where a fact can be
asserted by a script (which components exist, which endpoints are registered,
which pages import which primitives), write the script and have the map cite it.

**Gate:** a `npm run agent:map-check` (or equivalent) exists and passes, and
fails when you deliberately introduce a drift.

### Phase 3 — `docs/system/KNOWN-PATTERNS.md`

One row per problem: the canonical component/service, its path, when an
exception is allowed, and how the exception is registered.

Derive it from the code and from `flowbite-check.mjs`'s existing exceptions
registry — do not invent a taxonomy. If two components solve the same problem
today, say so and name which one wins; that decision is the point of the file.

**Gate:** `npm run agent:flowbite` is extended (or a sibling check is added) so
that a page-local reimplementation of a canonical pattern **fails a check**, not
merely contradicts a document.

### Phase 4 — Rebuild the agent layer

Five agents, not twenty-five: `orchestrator`, `frontend`, `backend`, `ai`,
`validation`. Fold the existing sixteen into them; the useful specifics in the
seven long files are worth keeping, once corrected.

Every agent gets: mission, system ownership, boundaries, authoritative sources,
invariants (numbered), required discovery, decision process, execution loop,
dependency analysis, cross-feature impact, proactive completion rule (§5),
anti-patterns, escalation rules, validation matrix, failure recovery, definition
of done, required evidence, handoff contract.

**Hard constraint, and the reason this rebuild exists:** an agent file may state
a fact about the code **only** if it also states how to re-verify it. Either
cite a `.claude/architecture/` map (which carries its own regeneration command)
or give the command inline. No more `## Ground truth (verified)` sections that
freeze a snapshot and rot.

**Gate:** re-run Phase 1's verification method against the new agent files. Zero
unverifiable claims.

### Phase 5 — Workflows and adoption

`.claude/workflows/`: `feature.md`, `bug-fix.md`, `refactor.md`, `release.md` —
each an ordered sequence naming the skills and gates, not a re-statement of
them.

Then close the adoption gap from §2.2: make registering a manifest the path of
least resistance for a new checkout, and make an unregistered checkout visible
at session start rather than only in `agent:fleet` output.

**Gate:** `npm run agent:fleet` reports zero `unregistered-worktree` warnings,
or each remaining one is deliberate and recorded.

---

## 4. Rules you operate under

1. **Read before you write.** Every claim you make about this repository must
   come from a file you opened or a command you ran in this session. If you
   cannot verify it, write "unverified" — never write it as fact.
2. **Do not invent architecture.** If the code does not do something, the map
   says it does not. `docs/architecture/` contains *target* state; it is not
   evidence of current state.
3. **Do not rebuild the skills.** §1.1. Split them for progressive disclosure
   only after `docs/skills-standard` lands.
4. **Governance applies to you.** `/start-change` before the first edit; a
   manifest per phase; `npm run agent:fleet` before claiming paths; never edit
   a file another checkout has in flight; never work on `main`.
5. **Prefer the executable form.** Any invariant you can express as a check that
   fails, express as a check that fails. A sentence in a markdown file is the
   fallback, not the goal.
6. **Do not fix product defects during this work.** If you find one — and you
   will — record it as a row in the audit and move on. Mixing an intelligence
   rebuild with a UI fix makes neither reviewable.

---

## 5. The proactive completion rule

Adopt this verbatim into every agent. It is stated as an algorithm because
"be proactive" measurably is not one — and note that the current skills already
carry a version of this under "Proactive behavior"; the failure is that nothing
verifies it ran.

```text
After satisfying the explicit request:

1. Inspect direct dependents of what changed.
2. Inspect sibling implementations of the same concern.
3. Search the repository for the same pattern.
4. Detect inconsistencies introduced, or already present and now exposed.
5. Correct issues that are all of: directly related, low risk, inside your
   ownership, and objectively verifiable.
6. Run validation.
7. Repeat until no directly related actionable defect remains.

Stop when the affected system capability is coherent — not when the file that
was named in the request works.
```

With one addition this repository's history requires:

```text
8. Anything found but NOT fixed — out of ownership, higher risk, or a different
   change — is recorded in the change fragment with its evidence, and, where the
   defect is expressible as a test, committed as a failing-but-recorded check
   (see backend/tests/evals/scenarios.py `known_gap`, which fails if the defect
   is silently fixed, so the fix cannot land without closing the record).
```

Point 8 is what makes point 7 honest. Without it "no actionable defect remains"
decays into "I stopped looking."

---

## 6. And the rule that lets you refuse a bad instruction

```text
Do not blindly implement the requested surface change.

First determine whether the request reveals a local defect, a shared-component
defect, an architectural defect, a systemic inconsistency, or a regression.

Fix the defect at the lowest correct reusable abstraction.
Never duplicate a fix across consumers when the defect belongs to a shared
primitive.

If the requested change would damage the architecture, say so in one or two
sentences, state what you will do instead, and proceed. Do not stop and wait
unless proceeding under any reading would be unsafe or would waste the work.
```

---

## 7. Definition of done for this brief's mission

```text
[ ] docs/agent-system/12-intelligence-audit.md exists; every agent/rule claim
    has a verdict and evidence; the known false claims in §0 are among them
[ ] .claude/architecture/ exists; every map carries commit, date and a
    regeneration command; a drift check exists and demonstrably fails on drift
[ ] docs/system/KNOWN-PATTERNS.md exists; every row names a canonical
    implementation and an exception path; a mechanical check enforces at least
    the highest-traffic rows
[ ] .claude/agents/ holds five agents on the full contract; zero unverifiable
    factual claims when Phase 1's method is re-run against them
[ ] .claude/workflows/ holds the four workflows
[ ] npm run agent:fleet reports zero unintended unregistered checkouts
[ ] npm run agent:validate passes; backend and frontend suites pass
[ ] a change fragment per phase; VERSION untouched (integration-manager owns it)
[ ] the skills were not rewritten
```

**The single test of whether this worked:** take the defect from §0 — an agent
file asserting "there is no sidebar" — and ask whether the architecture you
built would have caught it. If the answer is "a careful reader would have
noticed," you have rebuilt the same system with better prose. The answer has to
be "a check fails."
