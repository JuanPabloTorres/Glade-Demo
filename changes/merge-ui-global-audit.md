# merge-ui-global-audit — integrate the UI global refactor into main

**Type:** chore (integration) · **SemVer:** 4.7.2 → **4.8.0** (MINOR)
**Integrated:** `refactor/ui-global-audit` (worktree `Glade-Demo-ui-global-refactor`)
**Merge commit:** `963fa38` · **Release commit:** `2fcf16e`

## What was integrated

The `ui-global-refactor` delivery — overlay layer system, portaled tooltip and
menu primitives, the `ActionGroup` action control, the consolidated
`LanguageSwitcher`, the global assistant surface, and the i18n integrity fixes.
Its own change fragment (`changes/ui-global-refactor.md`) is the record of what
changed and why; this file records only the integration.

No contract, route, persistence or business-rule change. `backend/` is
untouched by the integrated branch — verified with
`git diff --name-only main...refactor/ui-global-audit -- backend/`, which is
empty.

## Merge shape

`main` moved twice during the work, so it was merged into the branch before the
branch was merged into `main`, rather than resolving on `main`:

1. `de996f4` — main at 4.6.1 into the branch.
2. `f003c90` — main at 4.7.2 into the branch, after the concurrent
   `prod-env-whitespace` task released.
3. `963fa38` — branch into `main`.

All three were conflict-free. `git diff f003c90 963fa38` is empty: the merge
introduced no edits of its own, so what landed on `main` is exactly the tree
that was verified. `git diff --stat 963fa38 2fcf16e` is confined to `VERSION`,
`RELEASE_NOTES.md` and the package manifests — the release commit changed no
source.

## Verification

Run against `f003c90`, the tree that landed unchanged at `963fa38`.

| Gate | Result |
| --- | --- |
| `npm --prefix frontend run i18n:check` | pass (keys, placeholders, values, array contents) |
| `npx tsc -b` | clean |
| `npm --prefix frontend run lint` | 0 errors, 10 pre-existing warnings |
| `npx vitest run` | 88/88 |
| `npm --prefix frontend run build` | pass |
| `npx playwright test --workers=1` | 80/80 |
| `pytest` (backend) | 194 pass |
| `node scripts/versioning.mjs check` | 4.8.0 synchronized |

Two backend modules — `test_agent_security.py`, `test_agent_wiring_integration.py`
— could not be **collected** in the integration worktree: `ModuleNotFoundError:
strands`, an optional extra absent from that checkout's freshly created venv.
Environmental, not a regression: the integrated branch changes no backend file.
They should be re-run in a checkout with the extra installed before the next
release that does touch `backend/app/ai`.

## Carried-forward debt

From `changes/ui-global-refactor.md`, unresolved by this integration:

- Backend-seeded case content (client goal, timeline entries, stage
  descriptions) stays Spanish in an English session. Authored demo data behind
  the API, not UI copy; the end-to-end language assertions are scoped to the
  application's own chrome and say so rather than passing silently.
- The assistant displays the route context it is scoped to but does not send it
  to the model. Widening `bankruptcy.guide` is a contract change.
- The end-to-end suite is flaky under parallel workers — every spec shares one
  backend SQLite database. 80/80 serially; three narrow-width specs fail
  intermittently in parallel.
- `frontend/src/components/atoms/AsyncState.tsx` has no consumers.

## Governance findings raised during this integration

Two hook defects, both reproducible and both affecting any agent in a linked
worktree:

1. **`validate-task-completion.mjs` resolves the active task from the session's
   working directory, not per-worktree** — unlike `validate-edit.mjs`, which
   uses `worktreeRootFor(path)`. It therefore demanded the change fragment of an
   unrelated concurrent task (`prod-env-whitespace`) from this session, and
   would misfire the same way for any parallel checkout.
2. **A stale entry in the cross-worktree edit ledger** blocked
   `RELEASE_NOTES.md`, naming `Glade-Demo-skills-standard`. That checkout's tree
   was clean and its work had already shipped in 4.7.1, so the block was a false
   positive. Worth clearing before it stops a future integration.

Neither was worked around. The version bump was deferred to this integration
task rather than taken in the feature worktree, per rule 02.

## Ownership note

Registered with `--allow-overlap` against `ui-global-refactor` (`frontend/**`,
`VERSION`, `RELEASE_NOTES.md`, `package.json`), which is correct for an
integration task: it must touch the same paths the branch it consolidates owns.
The overlap is deliberate and recorded in the manifest's `decisions`.
