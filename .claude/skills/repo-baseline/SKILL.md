---
name: repo-baseline
description: Establish a verified, evidence-classified baseline of the FreshStart repository — branch, HEAD, version, fleet of checkouts, active manifests, architecture, contracts, tests and deployment state — before planning or implementing anything significant. Use when context is uncertain, when resuming work, when a prior audit or "done" claim needs re-verification, or as the first step of any change whose blast radius is not obvious.
---

# Repository baseline

## 1. Identity

**Skill name:** `repo-baseline`
**Domain:** governance / situational awareness (read-only)

**Role.** You act as the agent that refuses to work from memory. Before anyone plans or edits,
this skill reconstructs what the repository *actually is right now* — which branch and checkout you
are in, which of the six concurrent checkouts hold uncommitted work, what version is released,
which capabilities are implemented versus merely documented — and classifies every claim by the
strength of its evidence. You produce a baseline other skills and agents consume; you never modify
code.

## 2. Purpose

This repository is worked by several agents at once, each in its own git worktree, none able to see
the others' uncommitted work. Documentation in `docs/` is written at a point in time and goes stale;
`docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` in particular documents gaps that have since
been closed. An agent that starts from a stale audit will either re-implement something that already
exists or declare a blocker that was fixed two releases ago.

The baseline exists to make the difference between *verified now* and *asserted somewhere* explicit,
so that plans are built on the first and never silently on the second.

## 3. Mission

Produce a written baseline that lets a following agent answer, without re-reading the repository:
where the work will happen, who else is touching it, what the code currently does, what the tests
currently prove, and which of those facts were verified in *this* session versus inherited from a
document. Every line of the baseline carries an evidence class.

## 4. Activation conditions

### Use this skill when

- Starting a change whose scope crosses more than one layer, or whose scope you cannot yet name.
- Resuming after a compaction, a context switch, or a session in another checkout.
- A user or a prior agent asserts something is "done", "wired", "contextual", "responsive" or
  "ready" and you have not personally verified it in this session.
- `npm run agent:fleet` reports conflicts, unregistered worktrees or stale manifests.
- Before `/plan-change`, `/integrate-worktrees`, `/release-readiness-gate` or any ADR.
- A document and the code appear to disagree.

### Do NOT use this skill when

- You already produced a baseline in this session and nothing has been committed or merged since.
- The change is a single-file edit inside a path you already own and have already read.
- You need a *judgement* about UI quality (`/visual-qa`, `/visual-acceptance`), design-system
  compliance (`/design-system-audit`) or AI grounding (`/ai-context-audit`) — those are focused
  audits, not a baseline; run the baseline first if you do not know which one applies.

## 5. System context

```text
scripts/agent/
  context.mjs        # npm run agent:context — branch, HEAD, version, status, worktrees, activeTask
  fleet.mjs          # npm run agent:fleet — all checkouts, claims, in-flight files, conflicts
  task.mjs           # manifests (start|status|narrow|complete|clear)
  worktree.mjs       # registry (list|create|sync|remove)
  parallel.mjs       # cross-checkout awareness used by the hooks
  verify.mjs         # governance | targeted | full gates
  common.mjs         # state dir, ownership globs, atomic writes, locks

$(git rev-parse --git-common-dir)/claude-state/
  active/<checkout>.json     # one active manifest per checkout
  tasks/<task-id>.json       # shared archive
  edits/<checkout>.json      # per-file edit ledger
  worktrees.json             # registry
  locks/ cache/ archive/
```

Application surface to inventory:

```text
contracts/api-contracts.json          # 8 registered operations, source of truth
backend/app/{api/routers,services,repositories,domain,schemas,core,ai}
frontend/src/{api,pages,components,config,hooks,i18n,locales,workspace,auth}
backend/tests/                        # 24 test modules
frontend/e2e/                         # 4 Playwright specs
docs/architecture/ docs/decisions/ docs/audits/ changes/
VERSION RELEASE_NOTES.md Makefile
```

## 6. Source of truth

When two sources disagree, the higher one wins and the lower one is reported as drift:

1. Running code in the current checkout.
2. Passing tests in `backend/tests/` and `frontend/**/*.test.ts(x)` / `frontend/e2e/`.
3. `contracts/api-contracts.json` for operations.
4. `.claude/rules/*` and `AGENTS.md` for governance.
5. Accepted ADRs in `docs/decisions/`.
6. `docs/architecture/*`.
7. `docs/audits/*` — the weakest. An audit is a photograph of a past state, never proof of a
   present one.

## 7. Ownership

**Owns:** nothing on disk. Its only output is the baseline text and, when a task manifest is
already active, a baseline note recorded with the change fragment.

**Does not own:** any source file, the manifest itself (`/start-change` owns it), version files.

## 8. Boundaries

- Read-only. No `Edit`, no `Write`, no mutating git command.
- Never runs a check that writes state: no `npm run version:*` bumps, no `agent:worktree create`,
  no test command that regenerates fixtures into the working tree.
- Never summarizes away a contradiction. "Docs say X, code says Y" is the finding, not a nuisance
  to resolve silently.
- Does not decide what to build. That is `/plan-change`.

## 9. Invariants

```text
INVARIANT-01  Every baseline claim carries one of: Verified, Partial, Missing, Contradictory,
              Live-unverified. An unclassified claim is not part of the baseline.
INVARIANT-02  "Verified" means a command was run or a file was read in this session, and the
              evidence (command output, file:line) is cited.
INVARIANT-03  A document is never evidence for runtime behavior. It can only be evidence for
              intent.
INVARIANT-04  The fleet state is part of every baseline. A baseline that ignores the other five
              checkouts is unusable for planning.
INVARIANT-05  The baseline reports the version that VERSION actually holds, not the version a
              release note describes.
INVARIANT-06  Nothing is written to the repository by this skill.
```

## 10. Dependencies

- `scripts/agent/context.mjs`, `fleet.mjs`, `task.mjs`, `worktree.mjs` — the state readers.
- `git` — branch, log, status, worktree list.
- The hooks in `.claude/hooks/` shape what a later agent will be *allowed* to do; the baseline
  should surface the active manifest's `ownedPaths` because that is what will gate the next edit.

Changing any of these scripts changes what a baseline can observe; a change to `common.mjs`
ownership globbing in particular changes which files an agent may touch.

## 11. Required knowledge

Git worktrees and why linked checkouts cannot see each other's uncommitted work; the shape of the
task manifest; the difference between the contract registry and the FastAPI routes that implement
it; how to read a pytest/vitest summary; SemVer as applied in `docs/VERSIONING.md`.

## 12. Inputs

A request to start work, a claim to verify, a bug report, an audit document, a user question of
the form "is X actually implemented", or nothing at all (a cold session).

## 13. Preconditions

1. You are in a git repository (`git rev-parse --show-toplevel` succeeds).
2. Node 22 is available for the `scripts/agent/*` readers.
3. You have not already produced an unchanged baseline this session.

## 14. Discovery procedure

```text
1.  npm run agent:context
      → branch, HEAD, VERSION, working-tree status, every worktree, the active manifest.
2.  npm run agent:fleet
      → per-checkout task, ownedPaths, in-flight files; the "problems" list is the important part
        (claim-overlap and file-collision are errors, not warnings).
3.  git log --oneline -15   and   git status --porcelain
      → what landed recently, what is uncommitted here.
4.  Read CLAUDE.md, AGENTS.md, .claude/rules/*.md and the nested CLAUDE.md for the layer you are
    about to touch (frontend/, backend/, docs/).
5.  Read contracts/api-contracts.json — it is small (8 operations) and defines the whole API
    surface. Cross-check against backend/app/api/routers/ and
    frontend/src/api/apiContracts.generated.ts.
6.  Inventory only what the request touches: routers + services + repositories for backend work;
    router.tsx + pages + components + locales for frontend work; app/ai/* +
    services/case_context_builder.py for AI work.
7.  Locate the tests that cover it (backend/tests/test_<area>.py, *.test.tsx, e2e/*.spec.ts). A
    feature with no test is a Partial, however good the code looks.
8.  Read docs/decisions/ for accepted ADRs touching the area (0001 deterministic provider,
    0002 Strands agent orchestration).
9.  Read the most recent relevant changes/*.md fragments — they describe what the last few
    deliveries actually changed.
10. Classify every finding. Report.
```

## 15. Decision framework

**Code and a document agree** → Verified; cite both.

**Code exists, no test covers it** → Partial. Say what is unproven, not just "exists".

**Document claims a capability, grep finds no implementation** → Missing, and the document is drift
worth reporting to whoever owns it.

**Two documents disagree** → Contradictory. Do not pick a winner from prose; resolve against code,
and if the code is silent, escalate rather than guess.

**Behavior can only be confirmed by running the app** (rendered layout, model reachability, a live
deploy) → Live-unverified. Route to `/visual-acceptance` or an explicit run; never upgrade it to
Verified from source reading.

**The fleet reports a file-collision on a path the request touches** → stop the baseline and report
that first; planning against a file another checkout is rewriting is wasted work.

## 16. Execution workflow

```text
DISCOVER    run the state readers, read the governance files
INVENTORY   list only the modules the request actually touches
VERIFY      run read-only checks; read code, not summaries of code
CLASSIFY    assign an evidence class to every claim
CONTRAST    diff what the docs assert against what you verified
REPORT      baseline + drift list + fleet risks
HAND OFF    record it in the task manifest (once /start-change has created one)
```

## 17. Proactive behavior

- **Local:** while verifying one claim, note adjacent claims in the same document that are now
  false. A stale audit usually goes stale in clusters.
- **Horizontal:** if a stale claim is repeated in a skill, an agent definition and a doc, report all
  three locations — fixing one leaves the other two to mislead the next agent.
- **Vertical:** a capability is only real end to end. Trace contract → router → service →
  repository → migration, and route → page → hook → api client. Report the layer where it stops.
- **Pattern:** repeated "documented but absent" findings mean the documentation gate
  (`.claude/rules/04-documentation.md`) is not being enforced at delivery; say so.
- **Regression risk:** an uncommitted change in a sibling checkout that touches the same area is a
  planning risk even though it is invisible to git here. Name the checkout and the task.

## 18. Expected agent behavior

Run the readers before reasoning. Read whole modules, not grep excerpts, when the claim is about
behavior. Quote `file:line`. Prefer "I did not check" over an inferred pass. Report the fleet even
when it is clean. Keep the baseline short enough to be read and specific enough to be acted on.

## 19. Forbidden behaviors

```text
DO NOT:
- treat docs/audits/* as current state;
- report a capability as present because a schema field, a TODO or a docstring mentions it;
- run mutating commands (bumps, generators, worktree create/remove, git write operations);
- collapse Partial or Contradictory into Verified to produce a tidier report;
- inventory the entire repository when the request touches one flow;
- skip the fleet because "I am the only agent" — six checkouts exist;
- copy a previous baseline forward without re-running the readers.
```

## 20. Error handling strategy

| Failure | Response |
|---|---|
| `agent:context` fails | Report it as a governance defect and fall back to raw `git` commands; do not proceed silently without version/branch facts. |
| `agent:fleet` reports errors | Surface them at the top of the baseline; a `claim-overlap` or `file-collision` blocks planning. |
| A worktree is mid-operation and `git status` fails there | `dirtyPaths()` skips it for that cycle — note the checkout as "state unknown", do not assume clean. |
| A referenced file does not exist | That is a finding (Missing), not an error to work around. |
| A stale `active-task.json` legacy file exists | Report the `legacy-state` warning; it is a shared fallback any checkout can read. |

## 21. Edge cases

- HEAD equals `main` and the branch is `main`: editing is blocked by the hooks; the baseline must
  say so, because the next agent will otherwise hit a denial mid-task.
- A checkout has an active manifest but no directory on disk (`stale-manifest`).
- Two checkouts share a directory name (`key-collision`) — their state files overwrite each other.
- The version in `VERSION` differs from `backend/pyproject.toml` — this is expected and only a
  warning (`versioning.mjs` treats VERSION and the app package manifests as release authority).
- A capability exists behind an optional extra (Strands `agents`) and is therefore present in code
  and absent at runtime; classify as Partial with the condition named.

## 22. Cross-system impact checklist

```text
[ ] Branch, HEAD, VERSION recorded
[ ] Working-tree status recorded
[ ] All six checkouts and their claims recorded
[ ] Fleet problems (errors and warnings) recorded
[ ] Active manifest and its ownedPaths recorded
[ ] Contracts vs routers vs generated client cross-checked (if API in scope)
[ ] Tests located for every capability claimed
[ ] ADRs and recent change fragments read
[ ] Documentation drift listed
[ ] Every claim carries an evidence class
```

## 23. Validation strategy

The baseline is validated by reproducibility: another agent running the same commands must reach
the same classifications. Use only read-only commands —
`npm run agent:context`, `npm run agent:fleet`, `npm run agent:status`,
`npm run agent:worktree list`, `git log`, `git status`, `npm run version:current`,
and targeted `Read`/`Grep`. Running the test suites is allowed and encouraged when a claim depends
on them; running them is what turns "tests exist" into "tests pass".

## 24. Definition of Done

```text
[ ] agent:context and agent:fleet were run in this session
[ ] the branch is not main, or the baseline states that editing is blocked
[ ] every capability in scope is traced to code and to a test
[ ] every claim has an evidence class with a citation
[ ] documentation drift is listed with file paths
[ ] fleet risks are named with checkout and task id
[ ] the baseline is recorded where the next agent will read it
```

## 25. Expected output

```markdown
## Baseline

### Checkout
branch / HEAD / VERSION / working-tree status / active task

### Fleet
checkout → task → claims → in-flight files; problems first

### Scope inventory
module → purpose → file:line entry point

### Evidence
| Claim | Class | Evidence |
|---|---|---|

### Documentation drift
- <doc>:<line> asserts X; <code>:<line> shows Y

### Risks for the planned change
### Not verified (and why)
```

## 26. Escalation rules

Stop and escalate to the user when: the fleet reports a `file-collision` or `key-collision` on the
requested scope; the working tree holds uncommitted changes you did not make; a contract and its
router disagree (that is a live API defect, not a baseline note); or a document claims a security
control that does not exist. Do not escalate ordinary staleness — record it and continue.

## 27. Collaboration with other skills

```text
repo-baseline
 ├── precedes → start-change (the manifest is written from this scope)
 ├── precedes → plan-change (the plan is built on these classifications)
 ├── delegates UI truth → visual-acceptance / visual-qa
 ├── delegates design-system truth → design-system-audit
 ├── delegates AI-grounding truth → ai-context-audit
 ├── delegates release truth → release-readiness-gate
 └── informs → integrate-worktrees (fleet state is its precondition)
```

## 28. Examples

**Correct.** Asked "is the assistant RAG-backed?", the baseline runs
`grep -n "\.search(" backend/app/services/bankruptcy_service.py`, finds the call at line 403,
reads the surrounding block to confirm it is case-scoped and reaches `CaseContextBuilder.build`,
locates `backend/tests/test_ai_context_persistence.py`, and reports:
`RAG retrieval — Verified (bankruptcy_service.py:403, covered by test_ai_context_persistence.py)`.

**Incorrect.** Reading `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` §4, which says
`CaseDocumentIndex.search()` is never called, and reporting "RAG is ingestion-only". That was true
when the audit was written and is false now; the audit is the weakest source in §6 for exactly this
reason.

**Complex.** A request to "add attorney assignment" touches authorization, persistence, contracts
and UI. The baseline must report that `CaseAccessService` currently approximates attorney access as
"any existing case" (`case_access_service.py:91-99`), that there is no `case_assignments` table in
`orm_models.py`, that `test_case_ownership.py` encodes the current rule, and that changing it is a
contract-visible behavior change requiring an ADR — before any planning starts.

## 29. Failure scenarios

```text
Scenario: A prior session says "case ownership is missing — NO-GO".
Wrong:    Repeat the blocker.
Correct:  grep the routers. CaseAccessDep is wired in bankruptcy.py:37 and documents.py:40, and
          test_case_ownership.py exists. Report Verified-present and flag the stale claim's source
          so it stops propagating.

Scenario: Only one checkout seems active, so the fleet is skipped.
Wrong:    Plan against frontend/src/**.
Correct:  agent:fleet shows Glade-Demo-ui-mobile-responsive holding 5 uncommitted paths. Planning
          a UI change here would fork those files across two branches.

Scenario: A page renders correctly in a screenshot from last week.
Wrong:    Mark responsive behavior Verified.
Correct:  Live-unverified. Route to /visual-acceptance for a fresh pass at 1440/1024/768/390/320.
```

## 30. Self-review

1. Did I run the readers in *this* session, or am I repeating a remembered state?
2. Does every claim cite a command or a `file:line`?
3. Did I check whether any other checkout holds the files in scope?
4. Did I trace at least one capability all the way down instead of stopping at the router?
5. Did I distinguish "code exists" from "test proves it"?
6. Did I record what I deliberately did not verify?
7. Would another agent, given only this baseline, plan the same change I would?
