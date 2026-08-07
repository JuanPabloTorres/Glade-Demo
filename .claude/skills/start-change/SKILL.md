---
name: start-change
description: Open any code or documentation change under governance — classify type and SemVer impact, choose a branch or a registered worktree, register a task manifest with non-overlapping ownedPaths, acceptance criteria and verification commands. Mandatory before the first edit; the PreToolUse hooks deny every Edit/Write until an active manifest claims the path.
---

# Start change

## 1. Identity

**Skill name:** `start-change`
**Domain:** governance / change lifecycle (entry gate)

**Role.** You act as the agent that turns an intention into a governed unit of work. You decide
whether this change belongs on a branch in the current checkout or in an isolated worktree, you
claim exactly the paths the change needs and no more, and you write the manifest that every later
hook, verification and integration step reads. Nothing you do here is cosmetic: the manifest is the
enforcement object, not a record of one.

## 2. Purpose

Six checkouts of this repository can be live at once, and none of them can see another's
uncommitted work. Before the manifest existed, two agents could both claim `frontend/src/**`, both
pass their own checks, and discover the collision only when integration kept one version and threw
the other away. `scripts/agent/task.mjs` now rejects overlapping claims at registration time, and
`.claude/hooks/validate-edit.mjs` denies any edit outside the claim.

This skill exists so that the ownership boundary is decided deliberately, up front, by someone
thinking about the change — rather than discovered by a denial in the middle of it.

## 3. Mission

Register an active task manifest whose `ownedPaths` cover every file the change will touch, overlap
no other live task, and exclude everything the change does not need — with acceptance criteria that
can be checked and verification commands that can be run.

## 4. Activation conditions

### Use this skill when

- Before the first `Edit` or `Write` of any change, including documentation-only changes.
- After `/repo-baseline`, when the scope is understood but no manifest exists.
- When resuming in a checkout whose manifest was completed or cleared.
- When a change turns out to need paths outside the current claim — re-scope with
  `task.mjs narrow` rather than editing around the boundary.
- When opening a second, independent line of work that must not share a working tree.

### Do NOT use this skill when

- A manifest for this change is already active in this checkout (`npm run agent:status`) — extend
  it with `narrow`, do not register a second task.
- You are only reading, auditing or reporting (`/repo-baseline`, `/design-system-audit`,
  `/ai-context-audit`, `/visual-acceptance` are read-only).
- You are integrating finished worktrees — that is `/integrate-worktrees`, owned by
  integration-manager.
- You are closing work — that is `/finish-change`.

## 5. System context

```text
scripts/agent/task.mjs        start | status | narrow | complete | clear
scripts/agent/worktree.mjs    list | create | sync | remove
scripts/agent/context.mjs     the read that must precede all of it
scripts/agent/fleet.mjs       who else is live, and on what

$(git rev-parse --git-common-dir)/claude-state/
  active/<checkout>.json   the manifest this checkout is governed by
  tasks/<task-id>.json     shared archive, one per task id, ever
  edits/<checkout>.json    per-file ledger the cross-checkout guard reads
  worktrees.json           registry
  locks/                   mkdir-based mutual exclusion across processes

.claude/hooks/validate-edit.mjs      denies edits outside ownedPaths, on main, or on a file
                                     already in flight in another checkout
.claude/hooks/validate-command.mjs   denies destructive git and any mutation without a manifest
.claude/templates/task-manifest.template.json
```

Manifest shape actually written by `task.mjs start`:

```json
{
  "taskId": "", "title": "", "type": "chore", "scope": "",
  "baseBranch": "main", "workingBranch": "", "worktreeKey": "", "worktreePath": "",
  "status": "active",
  "versionStrategy": { "mode": "single-delivery", "bump": "patch", "owner": "integration-manager" },
  "agents": [], "skills": [], "ownedPaths": [],
  "sharedPaths": ["VERSION","RELEASE_NOTES.md","package.json","frontend/package-lock.json","backend/pyproject.toml",".github/workflows/ci.yml"],
  "acceptanceCriteria": [], "verificationCommands": [], "risks": [], "decisions": []
}
```

`sharedPaths` is a fixed constant in `task.mjs` — you do not choose it.

## 6. Source of truth

1. `npm run agent:fleet` — who currently claims what. Beats any assumption.
2. `scripts/agent/task.mjs` and `common.mjs::claimsOverlap` — the actual overlap rule.
3. `.claude/rules/01-git-delivery.md`, `03-task-ownership.md`, `05-parallel-agents.md`.
4. `.claude/rules/02-versioning.md` and `docs/VERSIONING.md` for the bump classification.
5. `.claude/templates/task-manifest.template.json` for field meaning.

## 7. Ownership

**Owns:** the active manifest for this checkout, the branch or worktree creation, the initial
`ownedPaths` claim, `agents`/`skills`/`acceptanceCriteria`/`verificationCommands`/`risks`.

**Does not own:** any source file (claiming a path is not editing it); `VERSION` and
`RELEASE_NOTES.md` content — they are shared paths whose writes are gated on
`versionStrategy.owner === "integration-manager"`; other checkouts' manifests.

## 8. Boundaries

- One checkout, one active task. Registering a second manifest in the same directory archives the
  first — never do it to "get around" an ownership denial.
- One task id repo-wide. `task.mjs start` rejects a duplicate id that is live elsewhere, because
  `tasks/<id>.json` can only describe one of them.
- Claims are narrow by construction: `changes/<task-id>.md`, not `changes/**`; the component, not
  `frontend/src/**`.
- Never edit `.git/claude-state` by hand or with shell redirection. It is written atomically under
  a lock; a hand edit corrupts other checkouts' view.
- Never start on `main`. `task.mjs start` throws, and the edit hook denies anyway.

## 9. Invariants

```text
INVARIANT-01  No edit happens before a manifest is active and claims the path.
INVARIANT-02  ownedPaths overlaps no other live task, unless --allow-overlap was passed
              deliberately and the reason is recorded in decisions[].
INVARIANT-03  The working branch is never main and follows
              feat|fix|refactor|chore|docs|test/<scope>-<description>.
INVARIANT-04  A task has at least one acceptance criterion and one verification command;
              validate-task-completion.mjs denies finishing without both.
INVARIANT-05  VERSION and RELEASE_NOTES.md are writable only when
              versionStrategy.owner === "integration-manager".
INVARIANT-06  Parallel worktree tasks use mode "parallel" and never bump the version themselves.
INVARIANT-07  Nothing under claude-state is deleted; complete and clear archive.
```

## 10. Dependencies

`scripts/agent/task.mjs`, `worktree.mjs`, `parallel.mjs`, `common.mjs`; the four hooks in
`.claude/hooks/`; git worktrees. A change to `common.mjs::claimsOverlap` or `matchesGlob` changes
which claims are accepted and which edits are allowed — treat that file as governance-critical.

## 11. Required knowledge

Glob semantics as implemented (`**` → `.*`, `*` → `[^/]*`, anchored); why
`frontend/src/**` and `frontend/src/pages/HomePage.tsx` overlap; git worktree lifecycle; SemVer
classification for this project; the difference between `single-delivery` and `parallel` version
modes.

## 12. Inputs

A feature request, bug report, audit finding, review comment, ADR follow-up, or an instruction to
open a parallel line of work. Optionally a baseline from `/repo-baseline`.

## 13. Preconditions

1. `npm run agent:context` has been run in this session.
2. `npm run agent:fleet` shows no error-severity problem touching the intended scope.
3. The intended scope is known well enough to enumerate paths — if it is not, run
   `/repo-baseline` first.
4. The current checkout has no active manifest for a *different* change, or that change is
   genuinely complete.

## 14. Discovery procedure

```text
1. npm run agent:context        → branch, HEAD, VERSION, active task, worktrees
2. npm run agent:status         → is a manifest already active here?
3. npm run agent:fleet          → every live claim and every in-flight file
4. Enumerate the files the change will touch. Read enough of the code to be sure; a claim that
   misses a file costs a denial mid-flight, a claim that is too wide blocks another agent.
5. Check each intended path against the live claims from step 3.
6. Classify the change type and the SemVer impact (§15).
7. Decide branch vs worktree (§15).
8. Choose the verification commands that actually cover the change (§23).
```

## 15. Decision framework

**Branch or worktree.**
One coherent change, this checkout is free → branch here.
An independent stream that must run alongside existing work, or this checkout already holds
in-flight work you must not disturb → `npm run agent:worktree create <task-id> <branch>`, then
`cd` into it and run this skill again there (the new checkout registers its own manifest).

**Type and bump.**
`fix`/`refactor`/`docs`/`chore` with no behavior change → `patch`.
New capability or flow, backward compatible → `minor`.
Incompatible contract or data-model change → `major` plus an ADR (`/architecture-decision`).

**Version mode.**
Single delivery on one branch → `mode: single-delivery`, the branch owner bumps at the end.
Several worktrees converging → `mode: parallel`; worktrees produce `changes/<task-id>.md` only,
and integration-manager performs the single bump.

**Claim width.** Claim the narrowest set that covers the change. If you need a file you did not
claim, run `npm run agent:start -- narrow --own <new list>` — do not widen to `**` to avoid
thinking about it.

**Overlap found.** Prefer narrowing your own claim. Only pass `--allow-overlap` when the two tasks
genuinely must share a path *and* you have coordinated it; the reason lands in `decisions[]`.

**Scope grows past one coherent change.** Stop. Finish the current change or open a second worktree
— do not let one manifest accumulate unrelated work, because the change fragment and the version
bump then describe two things at once.

## 16. Execution workflow

```text
CONTEXT     npm run agent:context
FLEET       npm run agent:fleet  → conflicts must be clear before claiming
CLASSIFY    type, scope, SemVer, version mode
LOCATE      branch here, or create and enter a worktree
BRANCH      git switch -c <type>/<scope>-<description>
REGISTER    npm run agent:start -- start --id … --title … --type … --scope … --own … \
              --accept "…|…" --verify "…|…" --bump … --owner integration-manager
CONFIRM     npm run agent:status  → status "active", claims as intended
FRAGMENT    npm run agent:changeset   (creates changes/<task-id>.md; may also be done at finish)
PROCEED     only now may an edit happen
```

Argument notes that matter in practice: `--accept` and `--verify` are `|`-separated lists;
`--own` is comma-separated; every one of `--id --title --scope --own --accept --verify` is
required or the command throws. In PowerShell, avoid `>` anywhere in the command line —
`validate-command.mjs` treats it as a mutation and denies it while no manifest is active yet.

## 17. Proactive behavior

- **Local:** while enumerating paths, notice the test files and locale files the change will force
  you to touch, and claim them now rather than after the first denial.
- **Horizontal:** if the change touches a shared component, check who else uses it
  (`Grep` the import) — the claim may need to be wider, or the change may need to be narrower.
- **Vertical:** a backend contract change pulls in `contracts/api-contracts.json`,
  `frontend/src/api/apiContracts.generated.ts`, the router, the service, the client and the tests.
  Claim the whole vertical or accept that you will be denied halfway.
- **Pattern:** repeated denials on the same path across tasks mean the ownership model does not
  match how the code is organized; report it rather than routing around it every time.
- **Regression risk:** a sibling checkout holding uncommitted work in your scope is a reason to
  choose a different scope, not a reason to proceed carefully.

## 18. Expected agent behavior

Read before claiming. Enumerate paths explicitly instead of reaching for `**`. Record real
acceptance criteria — statements a reviewer can check — not restatements of the title. Choose
verification commands that would actually fail if the change were wrong. Name the agents and skills
the change will need, so the manifest is a plan and not a formality.

## 19. Forbidden behaviors

```text
DO NOT:
- edit anything before the manifest is active;
- claim frontend/src/**, backend/**, docs/** or changes/** when a narrower claim would do;
- register a second manifest in a checkout to escape an ownership denial;
- reuse a task id that is live in another checkout;
- pass --allow-overlap to silence a conflict you have not coordinated;
- hand-edit .git/claude-state or its JSON files;
- start work on main, or create a branch whose name does not match the governed pattern;
- set versionStrategy.owner to anything else in order to write VERSION yourself;
- leave acceptanceCriteria or verificationCommands empty — completion will be denied later.
```

## 20. Error handling strategy

| Error | Meaning | Response |
|---|---|---|
| `Create/switch to a governed branch before starting a task.` | You are on `main`. | Create the branch first. |
| `Task <id> is already active in <checkout>` | Duplicate task id. | Pick a distinct id; ids are repo-wide. |
| `Ownership overlaps a task that is already active…` | Another live claim covers your path. | Narrow yours, coordinate, or (deliberately) `--allow-overlap`. |
| `Missing --<key>` | A required argument is absent. | Supply it; none of the six are optional. |
| `<path> is outside task <id> ownership.` (edit hook) | Claim too narrow. | `task.mjs narrow --own …`, do not edit around it. |
| `<path> is already being changed in another checkout` | Hard collision. | Coordinate in that checkout; never fork the file. |
| `Timed out waiting for the "tasks" state lock` | A crashed agent left a lock. | Confirm no agent is running, then remove the named lock directory. |

Never suppress a hook denial by changing the manifest to be permissive. The denial is the design.

## 21. Edge cases

- **New file in a new directory.** `worktreeRootFor` walks up to the nearest existing directory, so
  a claim on `backend/app/services/newthing/**` works before the directory exists.
- **Work inside a linked worktree.** Paths resolve against *that* checkout, and it registers its own
  manifest under its own key — this is the supported setup, not a workaround.
- **Legacy `active-task.json`.** A shared fallback any checkout can read; if `agent:fleet` reports
  it, register per-worktree manifests and let it be archived.
- **Documentation-only change.** Still needs a manifest, a claim, a change fragment and a patch
  bump. `docs/**` is a legitimate `ownedPaths` entry, but claim the subtree you actually write.
- **A change that must touch `.github/workflows/ci.yml` or `backend/pyproject.toml`.** These are in
  `sharedPaths`; you may edit them, but coordinate — they affect every checkout.
- **Change turns out to be two changes.** Complete or clear this one and start again; do not widen.

## 22. Cross-system impact checklist

```text
[ ] Branch name matches the governed pattern
[ ] Not on main
[ ] Task id unique across live checkouts
[ ] ownedPaths enumerated, narrow, and overlap-free
[ ] Test files and locale files included in the claim
[ ] changes/<task-id>.md path claimed
[ ] versionStrategy mode/bump/owner correct for branch vs parallel delivery
[ ] acceptanceCriteria are checkable statements
[ ] verificationCommands would fail if the change were wrong
[ ] agents[] and skills[] name who and what this change needs
[ ] agent:status confirms the manifest is active
```

## 23. Validation strategy

- `npm run agent:status` — the manifest exists, is `active`, and claims what you intended.
- `npm run agent:ownership -- --path <a file you will edit>` — confirms the claim resolves.
- `npm run agent:fleet` — re-run after registering; your claim must not have introduced a conflict.
- `npm run agent:validate` — governance gate (`fleet --strict`, architecture check, Flowbite check)
  should pass before you start editing, so a later failure is attributable to your change.

Choose `verificationCommands` from what the change touches:
backend → `cd backend && uv run pytest` (or `python -m pytest backend/tests`), `uv run ruff check .`,
`uv run mypy app`; frontend → `npm --prefix frontend run test -- --run`, `lint`, `build`;
contracts → `npm --prefix frontend run contracts:generate` plus
`uv run pytest tests/test_api_contracts.py`; copy → `npm --prefix frontend run i18n:check`;
journeys → `npm --prefix frontend run test:e2e`.

## 24. Definition of Done

```text
[ ] agent:context and agent:fleet were run and were clean for this scope
[ ] a governed branch or a registered worktree exists
[ ] task.mjs start succeeded with no overlap warning you did not intend
[ ] agent:status shows the expected ownedPaths, criteria and commands
[ ] the change fragment path is claimed (and ideally created)
[ ] the version strategy matches branch vs parallel delivery
[ ] no file has been edited yet
```

## 25. Expected output

```markdown
## Change opened

### Classification
type / scope / SemVer bump / version mode

### Location
branch or worktree, base, why

### Ownership
owned: …
shared (fixed): …
overlap check: clean | coordinated with <task> because <reason>

### Acceptance criteria
### Verification commands
### Agents and skills planned
### Risks recorded
```

## 26. Escalation rules

Escalate to the user when: the scope cannot be claimed without overlapping a live task and neither
claim can reasonably be narrowed; the change requires editing `VERSION`/`RELEASE_NOTES.md` outside
integration-manager ownership; a governed branch cannot be created because the checkout is dirty
with work that is not yours; or the request is really two changes and the user must choose which
one to open. Do not escalate ordinary claim-narrowing decisions — make them.

## 27. Collaboration with other skills

```text
start-change
 ├── follows   → repo-baseline (scope comes from the baseline)
 ├── precedes  → plan-change (planning happens under an active manifest)
 ├── enables   → every implementation skill (flowbite-design-system, backend-service-change,
 │               api-contract-change, ai-context-change, i18n-change, create-feature-flow)
 ├── pairs     → targeted-verify (the commands registered here are the ones run there)
 ├── closes at → finish-change
 └── defers to → integrate-worktrees for the parallel-delivery version rules
```

## 28. Examples

**Correct.** A modal fix in one component:

```bash
git switch -c fix/chat-modal-centered
npm run agent:start -- start --id chat-modal-centered \
  --title "Center the chat modal on mobile" --type fix \
  --scope "ChatPanel modal layout" \
  --own "frontend/src/components/organisms/ChatPanel.tsx,frontend/src/components/organisms/ChatPanel.test.tsx,frontend/src/components/overlays/AppModal.tsx,changes/chat-modal-centered.md" \
  --accept "Modal is fully visible at 320px|No horizontal overflow at any breakpoint" \
  --verify "npm --prefix frontend run test -- --run|npm run agent:flowbite" \
  --bump patch
```

Four paths, all of them actually needed, none of them a wildcard.

**Incorrect.** `--own "frontend/src/**"` for the same fix. It passes registration only if no one
else is live, and it blocks every other frontend task for the duration — the exact failure
`claimsOverlap` was written to prevent.

**Complex.** Adding a new API operation: the claim must span `contracts/api-contracts.json`,
`frontend/src/api/apiContracts.generated.ts`, the new router and service, their tests, the frontend
client, the page, both locale files and the change fragment. That is a wide but *enumerated* claim,
and the right moment to check whether it should instead be split across worktrees with an
`integration/<initiative>` owner.

## 29. Failure scenarios

```text
Scenario: The edit hook denies a file halfway through the change.
Wrong:    Register a new task with a wider claim.
Correct:  npm run agent:start -- narrow --own "<full enumerated list>". The task keeps its identity,
          its fragment and its history.

Scenario: agent:fleet shows another checkout holds an uncommitted change in your target file.
Wrong:    Proceed and "resolve it at merge".
Correct:  The file is forked the moment you edit it and integration keeps one version. Coordinate in
          that checkout, or pick a scope that does not include the file.

Scenario: A docs-only change feels too small to register.
Wrong:    Edit directly.
Correct:  validate-edit.mjs denies it. Every change is governed; registration takes one command.
```

## 30. Self-review

1. Have I run `agent:context` and `agent:fleet` in this session?
2. Is every claimed path one this change will really touch — and is every path it will touch
   claimed?
3. Could another agent start a reasonable task right now without colliding with my claim?
4. Are the acceptance criteria checkable by someone who did not write the change?
5. Would the verification commands fail if I broke the thing I am about to change?
6. Is the bump and version mode right for branch versus parallel delivery?
7. Is this one coherent change, or two wearing one manifest?
