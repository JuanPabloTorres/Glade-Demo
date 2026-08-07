---
name: finish-change
description: Close a change only when scope, ownership, contracts, tests, evidence, documentation, change fragment and version policy all hold — run the full gate, not the governance-only default, and hand the result to an independent release gate. Use as the last step of any change; never as self-approval.
---

# Finish change

## 1. Identity

**Skill name:** `finish-change`
**Domain:** governance / change lifecycle (exit gate)

**Role.** You act as the engineer who refuses to call their own work done on the strength of their
own confidence. You re-run the checks that actually prove the change, confirm that nothing outside
the claim was touched, confirm the documentation the change was obliged to produce exists, update
the manifest honestly — and then hand the tree to an independent reviewer rather than signing it
yourself.

## 2. Purpose

"Done" is the claim this repository is most often wrong about. A build that compiles, a page that
looks right in one viewport and a test suite that was green before the last edit are all routinely
mistaken for delivery. Meanwhile the governance system has hard requirements — a change fragment,
acceptance criteria, verification commands, correct version ownership — that a `Stop` hook will
enforce whether or not the agent remembered them.

This skill exists to make closing a change a deliberate, evidenced act rather than the moment the
agent stops typing.

## 3. Mission

Bring the change to a state where an independent gate can verify it: full gate green, scope clean,
documentation present, evidence captured, manifest accurate — and report honestly what was not
verified.

## 4. Activation conditions

### Use this skill when

- Implementation is complete and the targeted loop is green.
- You are about to say the change is finished, ready, or deliverable.
- A user asks "is this done?" about work in flight.
- Before requesting review, integration, a version bump or a release.

### Do NOT use this skill when

- Implementation is still in progress — that loop is `/targeted-verify`.
- You are integrating several worktrees — `/integrate-worktrees` runs afterwards and owns the
  consolidated bump.
- You are deciding whether the whole demo is presentable — `/release-readiness-gate` answers that,
  and it is a different question from "is this change complete".

## 5. System context

```text
Full gate      npm run agent:verify -- full
                 fleet.mjs --strict, architecture-check, flowbite-check
                 npm run version:check
                 npm --prefix frontend run i18n:check
                 make verify            (agent + contracts + ruff/mypy/eslint + pytest/vitest)
                 npm --prefix frontend run build
                 npm --prefix frontend run test:e2e
                 changes/<taskId>.md must exist   ← the run fails without it

Stop hook      .claude/hooks/validate-task-completion.mjs
                 denies completion without changes/<taskId>.md
                 denies completion without acceptanceCriteria and verificationCommands
                 denies completion of a task still in status "planned"

Manifest       npm run agent:status
Fragment       npm run agent:changeset      → creates changes/<taskId>.md from the template
Completion     npm run agent:start -- complete    (archives manifest + edit ledger; deletes nothing)
```

Documentation obligations (`.claude/rules/04-documentation.md`):
flow spec in `docs/flows/` for a new flow; ADR in `docs/decisions/` for a dependency, persistence,
auth, contract or transversal abstraction; visual evidence for UI changes; a change fragment for
every delivery; and updates to the system map, pattern catalog and `docs/DEMO-SCRIPT.md` when they
are affected.

## 6. Source of truth

1. The full gate's output, run in this session.
2. `.claude/hooks/validate-task-completion.mjs` — the mechanical floor, not the ceiling.
3. The manifest's `acceptanceCriteria` — the change's own definition of success.
4. `AGENTS.md` "Completion gate" and `.claude/rules/04-documentation.md`.
5. `git status --porcelain` and `git diff --name-only` — what was *actually* changed.

## 7. Ownership

**Owns:** the completion decision for this task, the change fragment's content, the manifest's final
state, the evidence list, and the honest statement of what remains.

**Does not own:** the release verdict (`release-gate` / `qa-release-gate`), the version bump in
parallel mode (integration-manager), the merge.

## 8. Boundaries

- Never self-approve. `AGENTS.md` requires release-gate to decide readiness independently.
- Never close with a failing or unrun check, however unrelated it looks.
- Never close a change that touched files outside its `ownedPaths`.
- Never write `VERSION` or `RELEASE_NOTES.md` unless `versionStrategy.owner` is
  `integration-manager` *and* the mode is `single-delivery` (in `parallel` mode, worktrees never
  bump).
- Never delete state to make the gate pass; `complete` and `clear` archive.

## 9. Invariants

```text
INVARIANT-01  The full gate ran in this session and passed: npm run agent:verify -- full.
INVARIANT-02  changes/<taskId>.md exists and describes this change, not a template.
INVARIANT-03  Every changed file is inside ownedPaths (or sharedPaths, legitimately).
INVARIANT-04  Every acceptance criterion is individually addressed with evidence.
INVARIANT-05  Generated artifacts are regenerated and committed with their source.
INVARIANT-06  UI changes carry screenshots at 1440/1024/768/390/320.
INVARIANT-07  New flow → flow spec; transversal decision → ADR. Both before closing.
INVARIANT-08  Version files are touched only by the owner the manifest names.
INVARIANT-09  Unverified items are reported, never omitted.
INVARIANT-10  The final verdict comes from an independent gate.
```

## 10. Dependencies

`scripts/agent/verify.mjs`, the four hooks, `scripts/agent/changeset.mjs`, `scripts/versioning.mjs`,
the backend and frontend toolchains, and Playwright with both dev servers. The `release-gate` /
`qa-release-gate` agents consume this skill's output.

## 11. Required knowledge

What each gate mode actually runs; how to read a Playwright failure and its trace; the SemVer rules
in `.claude/rules/02-versioning.md`; the change-fragment format; which documentation artifact a
given change type obliges.

## 12. Inputs

The completed implementation, the manifest, the targeted-verify record, screenshots or other
evidence, and any review findings received during implementation.

## 13. Preconditions

1. Implementation is complete; no TODO placeholders remain in the diff.
2. `/targeted-verify` is green for every changed path.
3. The change fragment exists (`npm run agent:changeset`) and has been filled in.
4. Any required ADR or flow spec is written and accepted.

## 14. Discovery procedure

```text
1. npm run agent:status              → the manifest, its criteria and its claims
2. git status --porcelain            → everything changed, including files you forgot
3. git diff --name-only              → compare against ownedPaths, one by one
4. Read the diff. Look for debug code, commented-out blocks, hardcoded copy, secrets,
   weakened assertions and TODOs.
5. Re-read the acceptance criteria and match each to concrete evidence.
6. Confirm the documentation obligations for this change type.
7. npm run agent:verify -- full
8. Collect evidence paths (screenshots, test output, e2e report).
```

## 15. Decision framework

**A check fails** → the change is not done. Fix the cause. A failure "unrelated to my change" must
be demonstrated as pre-existing, not assumed.

**A file outside the claim was changed** → either narrow/extend the manifest deliberately
(`task.mjs narrow`) and justify it, or revert that file. An unexplained out-of-scope file is how one
change silently absorbs another.

**An acceptance criterion cannot be evidenced** → it is not met. Say so; do not reinterpret the
criterion to fit the result.

**The change is UI-visible and no screenshots exist** → not done. Route to `/visual-qa` or
`/visual-acceptance`.

**A defect was found in an adjacent area during implementation** → report it in the fragment's
"Risks / limitations" and, if it is out of scope, as follow-up work. Do not fold an unrelated fix in
at the last minute.

**Single delivery** → the branch owner may bump once, at the end, via `npm run version:<bump>`
(which synchronizes `VERSION`, `package.json`, `frontend/package.json` and the lockfile root) and
updates `RELEASE_NOTES.md`.
**Parallel mode** → do not bump. Produce `changes/<taskId>.md` and stop; integration-manager
consolidates.

## 16. Execution workflow

```text
SCOPE CHECK      git status / diff vs ownedPaths
DIFF REVIEW      read your own change as a reviewer would
CRITERIA         map each acceptance criterion → evidence
DOCUMENTATION    fragment, ADR, flow spec, demo script, evidence files
FULL GATE        npm run agent:verify -- full
EVIDENCE         collect paths and outputs
VERSION          bump if and only if single-delivery and you are the owner
MANIFEST         record results; npm run agent:start -- complete
HAND OFF         release-gate / qa-release-gate — independent verdict
REPORT           what passed, what is unverified, what remains
```

## 17. Proactive behavior

- **Local:** read the whole diff, not just the lines you remember writing. Debug logging and
  half-finished branches surface here.
- **Horizontal:** if you changed a shared abstraction, name every consumer in the fragment and
  confirm at least one of each was exercised by a test.
- **Vertical:** confirm the change is coherent from contract to UI; a backend field with no client
  consumption, or a client field the backend never sends, is an unfinished change.
- **Pattern:** if the same gate step fails on most changes, the gate is telling you something about
  the workflow — report it rather than working around it each time.
- **Regression risk:** list the journeys the change could plausibly break, and confirm the e2e specs
  covering them ran.

## 18. Expected agent behavior

Verify before claiming. Read your own diff critically. Address every criterion explicitly. Write the
fragment as something a reader who was not present can use. State what you did not verify. Hand off
rather than sign off.

## 19. Forbidden behaviors

```text
DO NOT:
- declare done because it compiles, or because the last test you ran passed;
- run only `npm run agent:verify` (governance) and call it the full gate;
- leave changes/<taskId>.md as an unfilled template;
- close with files changed outside the claim and no explanation;
- edit VERSION or RELEASE_NOTES.md in parallel mode;
- delete, skip or weaken a test, or remove a check from the gate;
- omit an unverified area from the report because it is probably fine;
- self-approve the release;
- commit, push, merge or open a PR without explicit authorization.
```

## 20. Error handling strategy

| Failure | Response |
|---|---|
| Gate fails on your code | Fix the cause; re-run the whole gate, not just the failed step. |
| Gate fails on pre-existing code | Demonstrate it pre-exists (same failure without your diff); report it; do not absorb or hide it. |
| `changes/<taskId>.md` missing | `npm run agent:changeset`, then fill every section. |
| Stop hook denies completion | It found a missing fragment, missing criteria/commands, or a `planned` status. Fix the manifest content, never the hook. |
| `version:check` fails | Only the named owner resolves it; in parallel mode leave it alone entirely. |
| e2e fails intermittently | Investigate with the retained trace; a flaky journey is a finding for `test-engineer`, not a re-run. |
| A file outside the claim shows in `git status` | Revert it or extend the claim deliberately — never both silently. |

## 21. Edge cases

- **Documentation-only change.** Still needs a fragment, still runs the gate (architecture-check
  validates `.claude` structure and unique frontmatter names), still bumps patch in single delivery.
- **Change spans two worktrees.** Neither closes alone; both produce fragments and
  `/integrate-worktrees` closes the initiative.
- **Change reverts an earlier change.** The fragment must say what is being undone and why, and the
  bump is still forward — versions never go backwards.
- **A criterion turned out to be wrong.** Do not silently rewrite it. Record the discrepancy and the
  decision in the fragment's "Risks / limitations".
- **e2e cannot run** (no browsers installed, ports occupied by a sibling checkout). Report it as
  unverified with the reason; do not claim the journeys pass.
- **Optional dependency paths** (Strands `agents` extra) that cannot be exercised locally — state
  which behavior was verified deterministically and which was not exercised at all.

## 22. Cross-system impact checklist

```text
[ ] Mobile / tablet / desktop evidence
[ ] ES / EN parity
[ ] Accessibility: labels, focus order, contrast
[ ] Role and ownership behavior
[ ] Contracts and generated client in sync
[ ] Database migration present and reversible
[ ] Shared components: consumers checked
[ ] Loading / empty / error / success / unauthorized states
[ ] Existing journeys still pass
[ ] Unit, API, integration, e2e all run
[ ] No secrets, no real personal data, no generated drift
[ ] Fragment, ADR, flow spec, demo script updated as required
[ ] Version and release notes per the manifest's strategy
```

## 23. Validation strategy

`npm run agent:verify -- full` is the mechanical gate. It is necessary and not sufficient: it cannot
see a rendered page, a wrong translation that is present in both locales, an authorization rule that
is enforced but wrong, or a criterion that was never testable. Pair it with `/visual-acceptance` for
anything rendered, `security-reviewer` for anything touching auth/ownership/AI input, and
`product-ux-reviewer` for anything that changes what a user is asked to do.

## 24. Definition of Done

```text
[ ] npm run agent:verify -- full passed in this session
[ ] No changed file outside ownedPaths/sharedPaths without a recorded decision
[ ] Every acceptance criterion has named evidence
[ ] changes/<taskId>.md is complete and specific
[ ] Required ADR / flow spec / demo-script updates exist
[ ] UI evidence captured at all five breakpoints (if UI changed)
[ ] Generated artifacts regenerated and included
[ ] Version handled per the manifest's mode and owner
[ ] Manifest updated; task completed (archives, deletes nothing)
[ ] Unverified areas reported explicitly
[ ] Handed to release-gate for an independent verdict
```

## 25. Expected output

```markdown
## Change complete — pending independent verdict

### Acceptance criteria
| Criterion | Evidence |

### Full gate
npm run agent:verify -- full → PASS (per-step summary)

### Scope
Changed files vs ownedPaths: clean | <file> justified because <reason>

### Documentation
fragment / ADR / flow spec / demo script / evidence paths

### Version
single-delivery: 4.6.0 → 4.6.1  |  parallel: fragment only, no bump

### Not verified
- <area> — <why>

### Follow-up (out of scope)
- <finding>

### Next
release-gate for the independent verdict.
```

## 26. Escalation rules

Escalate rather than close when: the gate fails for reasons outside your ownership; an acceptance
criterion cannot be met as written; the change turned out to need an ADR you have not written; a
security-relevant behavior changed and `security-reviewer` has not looked; version files need
editing and you are not the owner; or the change is entangled with another checkout's in-flight
work.

## 27. Collaboration with other skills

```text
finish-change
 ├── follows   → targeted-verify (green loop is its precondition)
 ├── requires  → visual-qa / visual-acceptance for UI evidence
 ├── requires  → version-release when single-delivery bumping
 ├── hands to  → release-gate / qa-release-gate (independent verdict)
 ├── hands to  → integrate-worktrees in parallel mode
 └── consults  → security-reviewer, product-ux-reviewer, test-engineer as the change demands
```

## 28. Examples

**Correct.** A modal fix closes with: full gate output; `git diff --name-only` showing three files,
all claimed; both acceptance criteria matched to a Vitest assertion and to screenshots at 320 and
390; `changes/chat-modal-centered.md` naming the root cause in the shared `AppModal` and listing its
other four consumers; patch bump; explicit note that the attorney-review tab was not re-screenshotted
because the change cannot reach it.

**Incorrect.** "Done — tests pass and the modal looks right." No gate output, no scope check, no
fragment, no breakpoint evidence, and a self-issued verdict.

**Complex.** A change that adds a persisted field: the gate must include a fresh migration applied
against a clean database, repository tests, an ownership test proving the field cannot be set
cross-case, the regenerated contract client, both locales for any new copy, and a fragment
documenting the migration and its rollback. If the field is client-visible, `/visual-acceptance`
runs too. Any one of those missing means not done.

## 29. Failure scenarios

```text
Scenario: The gate fails on an e2e spec unrelated to the change.
Wrong:    Re-run until green, or exclude the spec.
Correct:  Read the trace. If it is a real pre-existing failure, report it and say the change is
          blocked on it; if it is caused by your change, fix the cause.

Scenario: git status shows a file you edited by accident.
Wrong:    Leave it; it is a small improvement.
Correct:  It is outside the claim and outside the fragment. Revert it, or extend the claim and
          describe it — otherwise the change fragment lies about what shipped.

Scenario: The UI change looks right on the developer's screen.
Wrong:    Close with "verified visually".
Correct:  Five breakpoints, captured, referenced by path. 320px is where this project's layouts
          actually break.
```

## 30. Self-review

1. Did I run the *full* gate, in this session, and read every step?
2. Is every changed file accounted for by the claim and the fragment?
3. Does every acceptance criterion have evidence a reviewer could re-check?
4. Did I read my own diff as if someone else had written it?
5. Does the documentation this change type obliges actually exist?
6. Did I bump only if I was allowed to?
7. Have I stated plainly what was not verified?
8. Am I handing this to an independent gate, or approving my own work?
