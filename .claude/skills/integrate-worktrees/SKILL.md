---
name: integrate-worktrees
description: Consolidate parallel worktrees into one integrated delivery — collect manifests and fragments, verify each checkout's own gate, merge in dependency order, resolve shared files only on the integration branch, run the full gate on the result and perform the single SemVer bump. Reserved for integration-manager; individual worktrees never do any of it.
---

# Integrate worktrees

## 1. Identity

**Skill name:** `integrate-worktrees`
**Domain:** delivery / parallel-work integration (single owner)

**Role.** You act as the integration owner for an initiative worked by several checkouts at once.
You are the only agent who sees all of the branches, the only one allowed to resolve the shared
files, and the only one who issues the initiative's version. Your job is to make N independently
verified changes into one delivery that is still verified after they are combined — which is not
implied by each of them passing alone.

## 2. Purpose

This repository routinely has five or six checkouts live. Each one passes its own gate against its
own tree, and none of them can see the others' uncommitted work. Combining them surfaces a class of
failure no single worktree can detect: two features that are individually correct and jointly
inconsistent, a shared component changed under a consumer that was not rebuilt, two fragments
claiming the same version, a contract regenerated in one branch and consumed from another.

Integration exists to find those before they reach `main`, and to produce one coherent release
instead of N partial ones.

## 3. Mission

Produce an integration branch that contains every finished worktree's work, passes the full gate as
a whole, carries one consolidated set of release notes and exactly one version bump — and a written
report of what was merged, what conflicted, and what remains unintegrated.

## 4. Activation conditions

### Use this skill when

- Two or more registered worktrees have completed work belonging to one initiative.
- A worktree's change depends on another's and they must land together.
- Shared files (`VERSION`, `RELEASE_NOTES.md`, package manifests, CI config, contracts) were touched
  by more than one stream.
- The fleet report shows work ready to converge.

### Do NOT use this skill when

- You are one of the contributing worktrees — produce `changes/<task-id>.md` and stop.
- Only one branch is involved — that is `/finish-change` plus `/version-release`.
- Work is still in flight in the checkouts — integration of an unfinished branch imports its
  instability.
- You are judging demo readiness — `/release-readiness-gate`.

## 5. System context

```text
npm run agent:fleet            every checkout, its task, its claims, its in-flight files, problems
npm run agent:snapshot         copies all uncommitted work from every checkout; touches no index
npm run agent:worktree list    the registry
npm run agent:worktree sync    reconcile the registry with git (additive; never drops a live entry)
npm run agent:worktree remove  refuses if the checkout is dirty or has commits not in main

$(git rev-parse --git-common-dir)/claude-state/
  active/<checkout>.json   per-checkout manifests
  tasks/<task-id>.json     shared archive
  edits/<checkout>.json    per-file ledger — which checkout touched what
  worktrees.json           registry
  snapshots/<timestamp>/   snapshot output

changes/<task-id>.md       one fragment per contributing task
changes/README.md          the consolidation policy
VERSION, RELEASE_NOTES.md  shared; integration-manager only
```

Shared paths fixed by `scripts/agent/task.mjs`: `VERSION`, `RELEASE_NOTES.md`, `package.json`,
`frontend/package-lock.json`, `backend/pyproject.toml`, `.github/workflows/ci.yml`.

Reference: `docs/architecture/PARALLEL_AGENT_WORKFLOW.md`, `.claude/rules/05-parallel-agents.md`.

## 6. Source of truth

1. `npm run agent:fleet` — the live state of every checkout.
2. Each contributing manifest (`ownedPaths`, `acceptanceCriteria`, `verificationCommands`).
3. Each `changes/<task-id>.md` fragment.
4. The full gate run **on the integration branch**, which supersedes every per-worktree run.
5. `.claude/rules/02-versioning.md` for the single-bump rule.

## 7. Ownership

**Owns:** the integration branch, the merge order, every shared-file resolution, the consolidated
`RELEASE_NOTES.md`, the single version bump, and the integration report.

**Does not own:** the contributing changes themselves. If a worktree's work is wrong, it goes back
to that worktree — integration does not silently rewrite another agent's feature.

## 8. Boundaries

- Never integrate a worktree that has not passed its own gate and produced its fragment.
- Never resolve a shared file inside a contributing worktree; resolution happens only on the
  integration branch.
- Never force-push, hard-reset, prune worktrees or force-remove a checkout — all are blocked by
  `validate-command.mjs` because they destroy a sibling's work invisibly.
- Never delete a worktree that is dirty or holds commits not in `main`; `worktree remove` refuses,
  and that refusal is correct.
- Never reinterpret a contributor's feature during conflict resolution. Preserve both intents or
  send it back.

## 9. Invariants

```text
INVARIANT-01  Every contributing worktree passed its own gate and has changes/<task-id>.md.
INVARIANT-02  npm run agent:snapshot runs before any integration, rebase or cleanup.
INVARIANT-03  Shared files are resolved only on the integration branch.
INVARIANT-04  Exactly one SemVer bump for the whole initiative, issued here.
INVARIANT-05  The full gate runs on the integrated result, not only per branch.
INVARIANT-06  Generated artifacts are regenerated after merging, never merged as text.
INVARIANT-07  Nothing is deleted: worktrees are archived/removed only when clean and merged.
INVARIANT-08  Unintegrated work is reported, never silently dropped.
```

## 10. Dependencies

`scripts/agent/fleet.mjs`, `parallel.mjs`, `snapshot.mjs`, `worktree.mjs`, `verify.mjs`,
`versioning.mjs`; git merge machinery; the full backend and frontend toolchains. The edit ledger is
what lets you attribute a conflicting file to a checkout.

## 11. Required knowledge

Git worktrees and merge conflict resolution; which artifacts are generated rather than authored
(`frontend/src/api/apiContracts.generated.ts`, lockfiles); the layering of this codebase, so
dependency order is derivable; the version rules; how to read the edit ledger.

## 12. Inputs

The set of finished worktrees, their manifests and fragments, their gate evidence, and the
initiative's intended scope.

## 13. Preconditions

1. `npm run agent:fleet` reports no error-severity problem you have not accounted for.
2. Every contributing checkout is committed — `git status --porcelain` is empty there.
3. Every contributing task passed `npm run agent:verify -- full` in its own checkout.
4. Every contributing task has a fragment.
5. `npm run agent:snapshot` has been run in this session.

## 14. Discovery procedure

```text
1. npm run agent:fleet                     → checkouts, tasks, claims, problems
2. npm run agent:worktree list             → registry vs reality (sync if they disagree)
3. npm run agent:snapshot                  → safety copy of everything uncommitted, everywhere
4. For each contributing checkout:
     git -C <path> status --porcelain      → must be empty
     git -C <path> log --oneline main..HEAD → what it actually contains
     git -C <path> diff --name-only main   → the file set
     read its manifest and its fragment
5. Build the file→checkout map; intersect it to find files touched by more than one branch.
6. Read the edit ledger for those files to see who touched them and when.
7. Derive the dependency order (§15).
8. Create the integration branch from main.
```

## 15. Decision framework

**Merge order** follows the dependency direction of the codebase, so each merge lands on a tree that
can already support it:

```text
1. governance / tooling / rules          (.claude, scripts, CI)
2. design-system and shared components   (frontend/src/components, index.css tokens)
3. contracts                             (contracts/api-contracts.json + regeneration)
4. backend: domain → repositories → services → routers
5. frontend features and pages
6. AI layer and security changes
7. tests, QA and documentation
```

**Two branches changed the same file** → if the edits are in different regions and both intents
survive, resolve. If resolving means choosing which feature wins, do not choose — return it to the
owners.

**A generated file conflicts** → never merge it as text. Take either side, then regenerate
(`npm --prefix frontend run contracts:generate`) and commit the regenerated output.

**A lockfile conflicts** → resolve by regenerating from the merged manifests, not by hand-picking
hunks.

**Two fragments declare different bump types** → the initiative takes the highest.

**A worktree is not ready** → integrate the others and report it as unintegrated with its reason. A
partial, honest integration beats a complete, unstable one.

**The integrated gate fails but every branch passed** → this is exactly the case integration exists
to find. Bisect by merge order: the failure belongs to the interaction, and the owning agents must
be told which two changes interact.

## 16. Execution workflow

```text
SNAPSHOT       npm run agent:snapshot
SURVEY         fleet, registry, per-checkout status/log/diff, manifests, fragments
PRECHECK       reject any checkout that is dirty or gate-failing
BRANCH         git switch -c integration/<initiative> main
MERGE          one branch at a time, in dependency order
  after each:  npm run agent:validate      (fast structural check)
RESOLVE        shared files here only; regenerate generated artifacts
FULL GATE      npm run agent:verify -- full   on the integrated tree
CONSOLIDATE    merge fragments into RELEASE_NOTES.md
BUMP           npm run version:<major|minor|patch>   — exactly once
VERIFY         version:check and version:check-against origin/main
REPORT         what merged, what conflicted and how, what did not integrate
CLEAN UP       npm run agent:worktree remove <task-id> only for clean, merged checkouts
```

## 17. Proactive behavior

- **Local:** after each merge run the fast governance check rather than waiting for the end — a
  structural break is far cheaper to attribute when only one branch has just landed.
- **Horizontal:** a shared component changed in one branch may have gained consumers in another.
  After merging both, grep the component's imports and run every consuming test.
- **Vertical:** a contract change in one branch and a client change in another must be checked
  together; regenerate and build before believing either.
- **Pattern:** if the same file conflicts in every integration, the ownership model does not match
  the code's structure. Report it — the fix is narrower claims, not more careful merging.
- **Regression risk:** the integrated tree is the first place the whole product exists. Run the e2e
  journeys here even if every branch ran them separately.

## 18. Expected agent behavior

Snapshot first, always. Verify each contributor before merging it, not after. Merge in an order you
can justify. Resolve conflicts by preserving both intents or by returning the conflict to its
owners. Re-verify the whole. Report attribution precisely enough that the right agent can act.

## 19. Forbidden behaviors

```text
DO NOT:
- integrate a dirty, unverified or fragment-less worktree;
- resolve shared files inside a contributing worktree;
- merge a generated file's text instead of regenerating it;
- force-push, hard-reset, git clean, worktree prune or force-remove a checkout;
- delete a branch or worktree that still holds unmerged commits;
- issue more than one version bump for the initiative;
- rewrite another agent's feature to make a conflict go away;
- declare integration complete with the full gate unrun on the integrated tree;
- drop a worktree from the report because it did not make it in.
```

## 20. Error handling strategy

| Failure | Response |
|---|---|
| `fleet` reports `claim-overlap` | Two tasks own one path; resolve ownership with the owners before merging either. |
| `fleet` reports `file-collision` | The same file is in flight in two checkouts. Neither is safe to integrate until one lands. |
| `fleet` reports `key-collision` | Two checkouts share a directory name and their state files overwrite each other. Structural; fix before anything else. |
| `worktree remove` refuses (dirty) | Correct behavior. Commit or snapshot; never `--force`. |
| `worktree remove` refuses (unmerged commits) | Integrate the branch first. |
| Merge conflict in a generated file | Regenerate; do not merge hunks. |
| Integrated gate fails, branches passed | Attribute by merge order and return it to the interacting owners with both branch names. |
| `version:check-against origin/main` fails | Bump missing, or the integration branch is behind; rebase onto the current `origin/main` and re-run the gate. |
| A contributing checkout disappeared | `stale-manifest` in the fleet report; recover its work from the snapshot before concluding it is lost. |

## 21. Edge cases

- **A worktree's branch has diverged from `main` significantly.** Rebase it in *its own* checkout,
  with its owner, after a snapshot — not on the integration branch.
- **Two branches add the same locale key with different text.** Both intents are real; pick the
  correct copy with the copy owner, and make sure both ES and EN end consistent (`i18n:check` will
  not catch a semantic mismatch).
- **Two branches both add a migration.** Alembic revision ordering must be linearized; run
  `alembic upgrade head` against a clean database on the integrated tree.
- **A branch only changed documentation.** Still gets a fragment and still participates in the
  classification.
- **Ports.** Running e2e on the integration branch while contributing checkouts still hold the
  default ports tests the wrong build — set `E2E_WEB_PORT`/`E2E_API_PORT`.
- **A contributor edited a shared file despite the rule.** The edit hook should have denied it;
  treat its presence as a governance finding and resolve it on the integration branch.

## 22. Cross-system impact checklist

```text
[ ] Snapshot taken before touching anything
[ ] Every contributor: clean tree, own gate green, fragment present
[ ] Merge order justified by dependency
[ ] Shared files resolved only here
[ ] Generated artifacts regenerated after merge
[ ] Migrations linearized and applied to a clean database
[ ] i18n parity across all merged copy
[ ] Full gate green on the integrated tree
[ ] e2e journeys run on the integrated tree
[ ] Exactly one version bump, verified against origin/main
[ ] RELEASE_NOTES.md consolidated from all fragments
[ ] Registry synced; only clean, merged worktrees removed
[ ] Unintegrated work reported with reasons
```

## 23. Validation strategy

Per merge: `npm run agent:validate` (fleet/architecture/flowbite).
After all merges: `npm run agent:verify -- full`, then `npm run version:check-against origin/main`.
Then targeted confirmation of the interactions you predicted — the consuming tests of every shared
component that changed, `contracts:generate` plus `test_api_contracts.py` if contracts moved, and
`alembic upgrade head` on a clean database if migrations moved.

Finally, `/release-readiness-gate` or the `release-gate` agent issues the verdict. Integration does
not certify itself.

## 24. Definition of Done

```text
[ ] All ready worktrees merged, in a justified order
[ ] Conflicts resolved without losing an intent, or returned to their owners
[ ] Full gate green on the integration branch
[ ] One SemVer bump, consistent and ahead of origin/main
[ ] RELEASE_NOTES.md consolidated and honest
[ ] Fragments handled per changes/README.md
[ ] Registry synced; clean merged checkouts removed, dirty ones left intact
[ ] Integration report written with attribution
[ ] Handed to an independent release gate
```

## 25. Expected output

```markdown
## Integration report — integration/<initiative>

### Merged
| Order | Checkout | Task | Branch | Files | Gate |

### Conflicts
| File | Branches | Resolution | Who confirmed |

### Regenerated
- frontend/src/api/apiContracts.generated.ts
- frontend/package-lock.json

### Integrated verification
npm run agent:verify -- full → PASS (per-step)
e2e on integration branch → PASS

### Version
<old> → <new> (<type>) — one bump, verified against origin/main

### Not integrated
| Checkout | Task | Reason | Owner notified |

### Follow-up for contributing agents
- <checkout>: <finding>
```

## 26. Escalation rules

Escalate to the user when: a conflict cannot be resolved without choosing between two features; a
contributing worktree is dirty and its owner is unreachable; two changes are individually correct
and jointly incompatible at the product level; a migration ordering problem risks data; or the
initiative's scope has drifted so that the fragments describe more than was agreed. Do not escalate
ordinary merge mechanics.

## 27. Collaboration with other skills

```text
integrate-worktrees
 ├── requires  → finish-change in every contributing checkout
 ├── requires  → repo-baseline / agent:fleet for the survey
 ├── owns      → version-release for the initiative's single bump
 ├── routes    → the owning agent for any returned conflict
 └── hands to  → release-readiness-gate / release-gate for the verdict
```

## 28. Examples

**Correct.** Four worktrees: design tokens, backend ownership fix, AI context change, responsive
audit. Snapshot; verify each is clean and green; branch `integration/ux-ai-hardening` from main;
merge tokens → backend → AI → responsive; after the tokens merge, run the consuming component tests
because two later branches build on them; regenerate the contract client after the backend merge;
full gate on the result; one MINOR bump; notes organized by user-visible theme; report naming one
returned conflict in `ChatPanel.tsx` where two branches restructured the same block.

**Incorrect.** Merging all four at once, resolving `ChatPanel.tsx` by keeping "the newer version",
merging the generated contract file as text, and bumping twice because two fragments said `minor`.

**Complex.** One branch renames a shared prop on `ResponsiveDataView`; another adds a new consumer
of the old prop. Both pass alone. Integrated, the frontend build fails. The resolution is not to
patch the new consumer silently — it is to determine which API the component should have, tell both
owners, and land the rename with every consumer updated in one coherent commit.

## 29. Failure scenarios

```text
Scenario: A checkout has uncommitted work and is holding up the initiative.
Wrong:    git worktree remove --force, or git clean.
Correct:  Both are blocked by governance, and rightly — they destroy a sibling's invisible work.
          Snapshot, then ask its owner to commit or explicitly abandon.

Scenario: apiContracts.generated.ts conflicts.
Wrong:    Resolve the JSON by hand.
Correct:  It is generated. Take either side, run contracts:generate, commit the regenerated file,
          and let test_api_contracts.py confirm registry and routes agree.

Scenario: Every branch was green, the integrated gate is red.
Wrong:    Patch the failure on the integration branch and move on.
Correct:  This is the interaction integration exists to expose. Attribute it by merge order, name
          both changes, and decide with their owners where the fix belongs — a silent integration
          -branch patch hides a design conflict from the people who created it.
```

## 30. Self-review

1. Did I snapshot before doing anything?
2. Was every contributor clean, gate-green and fragment-complete before I merged it?
3. Can I justify the merge order?
4. Did I resolve any conflict by silently choosing a winner?
5. Did I regenerate everything generated?
6. Did I run the full gate — including e2e — on the integrated tree, not just per branch?
7. Exactly one bump?
8. Does the report tell each contributing agent what it needs to know?
9. Is any work sitting unintegrated without being named?
