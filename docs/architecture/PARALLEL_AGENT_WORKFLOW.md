# Parallel agent workflow

How several agents work on FreshStart at the same time without overwriting each other, and why the mechanism looks the way it does.

## The failure this prevents

Governance already required a task manifest with `ownedPaths` before editing. That check only ever asked one question: *may this checkout touch this file?* With one agent that is sufficient. With five it is not — every checkout answered "yes" for `frontend/src/**` because every checkout was reading its own manifest and nothing compared them.

Observed in this repository, all within twelve minutes:

- Four worktrees live, two of them registered in `worktrees.json`. Concurrent read-modify-write on that file had erased the other two registrations.
- Two checkouts both claiming `frontend/src/**`, `docs/**`, `changes/**`, `scripts/agent/**` and `.claude/hooks/**`.
- Three checkouts holding byte-identical uncommitted edits to `scripts/agent/common.mjs`, `.claude/hooks/validate-edit.mjs` and `.claude/hooks/validate-command.mjs` — the same work done three times, of which integration could keep one.
- One worktree with 36 uncommitted files and no manifest at all, governed by whatever `active-task.json` happened to contain.
- `tasks/strands-agent-layer.json` rewritten by a second checkout that had chosen the same task id.

None of it was visible from inside any single checkout.

## Model

| Concern | Mechanism | Where |
| --- | --- | --- |
| Which checkout does a path belong to | `worktreeRootFor` resolves via `git rev-parse --show-toplevel` from the path itself | `scripts/agent/common.mjs` |
| One active task per checkout | `claude-state/active/<checkout>.json`, keyed by directory name | `common.mjs` |
| Concurrent writes to shared state | `withStateLock` (atomic `mkdir`, 60s stale break) + `writeJson` via temp-file rename | `common.mjs` |
| Are two claims the same territory | `claimsOverlap` — glob-aware, so `frontend/src/**` collides with `frontend/src/pages/Home.tsx` | `common.mjs` |
| Who else is editing this exact file | per-checkout edit ledger + cached `git status` of every sibling | `scripts/agent/parallel.mjs` |
| Whole-fleet picture | `fleetReport` | `parallel.mjs` |

State lives under `$(git rev-parse --git-common-dir)/claude-state`, shared by every worktree:

```
claude-state/
  active/<checkout>.json        active manifest, one per checkout
  active/archive/               superseded manifests, never deleted
  tasks/<task-id>.json          shared task archive
  edits/<checkout>.json         edit ledger: which files this checkout touched
  edits/archive/                ledgers of completed tasks
  worktrees.json                registry, written under lock
  snapshots/<timestamp>/        copies of uncommitted work
  cache/dirty.json              working-tree snapshot, 15s TTL
  locks/                        lock directories
```

## Enforcement

`validate-edit.mjs` runs on every `Edit`/`Write` and applies, in order:

1. Branch is not `main`.
2. This checkout has an active manifest.
3. The path is in `ownedPaths` or `sharedPaths`.
4. `VERSION`/`RELEASE_NOTES.md` belong to integration-manager; no `.env` writes.
5. **Deny** if another live checkout already has this exact file in flight — in its ledger or its working tree.
6. **Warn** if another live task's globs also cover the path but nobody has touched it yet.

Step 5 is a hard block because the outcome is certain: two branches diverge on one file and integration keeps one. Step 6 is a warning because the collision has not happened yet and narrowing the claim is still cheap.

Registration is guarded too: `task.mjs start` refuses a task id already active elsewhere, and refuses ownership that overlaps another live task unless `--allow-overlap` is passed, which records the decision in the manifest.

The ledger only sees edits made through an agent after this tooling landed, which is why the working-tree check exists alongside it — it catches human edits, pre-ledger changes and anything done outside Claude Code.

## Commands

```bash
npm run agent:fleet                  # every checkout, its task, its claims, its conflicts
npm run agent:fleet -- --strict      # exit 1 on a real conflict; use in verification
npm run agent:fleet -- --json        # machine-readable
npm run agent:snapshot               # copy all uncommitted work from all checkouts
npm run agent:worktree sync          # reconcile worktrees.json with git
npm run agent:worktree create <id> <branch>
npm run agent:start -- narrow --own "a,b"   # shrink claims without re-registering
```

## Starting a parallel stream

1. `npm run agent:fleet` — see what is already claimed.
2. `npm run agent:worktree create <task-id> <branch>` — a separate checkout, always. The old requirement that the primary checkout be clean was removed: it meant one agent's uncommitted work blocked everyone else from isolating theirs, which forced exactly the shared-checkout collisions this document is about.
3. `/start-change` inside the new checkout. Claim the narrowest paths that can possibly work.
4. `npm run agent:fleet -- --strict` before integration.

## Deliberate limits

- **The checkout directory name is the key.** Two checkouts with the same basename would share state files; `fleetReport` reports that as a `key-collision` error rather than silently merging them.
- **`active-task.json` is still read.** It is the pre-split fallback for a checkout with no manifest of its own. It is never written any more, and the fleet report flags it, but removing it would strand any session mid-task.
- **The dirty-path cache is 15 seconds stale.** A file another agent started within the last 15 seconds can slip past step 5; the ledger closes that gap for agent-driven edits, which is the common case.
- **A stale lock is broken after 60 seconds.** A crashed agent must not wedge the fleet, and the cost of an unlikely double-write is lower than the cost of a permanent freeze.
