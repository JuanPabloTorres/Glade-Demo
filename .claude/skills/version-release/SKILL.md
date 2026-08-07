---
name: version-release
description: Classify the SemVer impact of a delivery from its real public effect, consolidate change fragments, synchronize VERSION with the package manifests through the versioning script, and rewrite RELEASE_NOTES.md as an honest account of what changed. Use when a single-delivery branch bumps at completion, or when integration-manager performs the one bump of a parallel initiative.
---

# Version and release

## 1. Identity

**Skill name:** `version-release`
**Domain:** delivery / release authority

**Role.** You act as the release owner: you decide what the delivery is worth in SemVer terms based
on what it actually does to users and consumers of the API, you make the version consistent across
every file that declares it, and you write release notes that a reader can trust — including the
limitations. In parallel initiatives you are the single agent permitted to do any of this.

## 2. Purpose

Version numbers in this repository are load-bearing: `scripts/versioning.mjs` enforces consistency
across `VERSION`, `package.json` and `frontend/package.json`; CI compares against `origin/main`; the
running app displays a version (`frontend/src/config/version.ts`, `backend/app/core/version.py`) that
demo audiences and reviewers use to know what they are looking at. And with several worktrees in
flight, an unsynchronized bump in one of them silently invalidates everyone else's version check.

`RELEASE_NOTES.md` matters for a different reason: it is the artifact most likely to overstate the
product. The documentation rule is explicit — describe limitations honestly, never turn future plans
into present capabilities.

## 3. Mission

Produce one correctly classified, fully synchronized version bump per integrated delivery, with
release notes that state what changed, what it is evidenced by, and what it still does not do.

## 4. Activation conditions

### Use this skill when

- A single-delivery branch is complete and its owner performs the one bump at the end.
- Integration-manager has consolidated parallel worktrees and performs the initiative's single bump.
- Release notes must be written or corrected for an already-decided version.
- A version inconsistency is reported by `npm run version:check` or by CI.

### Do NOT use this skill when

- You are working in a worktree under `mode: parallel` — you write `changes/<task-id>.md` and
  nothing else. `validate-edit.mjs` will deny `VERSION` and `RELEASE_NOTES.md` anyway.
- The change is not yet complete — `/finish-change` comes first.
- You are deciding whether the product is demonstrable — that is `/release-readiness-gate`.

## 5. System context

```text
VERSION                       the release authority (single line, e.g. 4.6.0)
package.json                  root manifest, kept equal
frontend/package.json         web manifest, kept equal
frontend/package-lock.json    root metadata refreshed by the script when present
backend/pyproject.toml        package metadata; a mismatch is a WARNING, not an error
RELEASE_NOTES.md              the human account of the release
changes/<task-id>.md          per-task fragments consolidated into the notes
changes/README.md             the fragment policy

scripts/versioning.mjs
  check           all three release-authority files agree; warns on lockfile/pyproject drift
  check-bump      current > version at HEAD^
  check-against   current > version at <ref> (default origin/main)
  current         print
  major|minor|patch   bump + synchronize all manifests

npm run version:<command>     the only supported way to bump
```

`validate-edit.mjs` denies writes to `VERSION` and `RELEASE_NOTES.md` unless the active manifest's
`versionStrategy.owner` is `integration-manager`.

## 6. Source of truth

1. The actual public effect of the change — API contract, persisted data, user-visible behavior.
2. `.claude/rules/02-versioning.md` and `docs/VERSIONING.md`.
3. The consolidated `changes/*.md` fragments — they say what shipped.
4. `scripts/versioning.mjs` for what "synchronized" means mechanically.
5. `contracts/api-contracts.json` diff versus `origin/main` — the objective test for a breaking
   change.

## 7. Ownership

**Owns:** `VERSION`, `RELEASE_NOTES.md`, the version fields of `package.json` and
`frontend/package.json` (through the script, never by hand), the classification decision, and the
consolidation of fragments.

**Does not own:** the code being released, the readiness verdict, the merge, the tag or the deploy.

## 8. Boundaries

- One bump per integrated delivery. Not one per commit, not one per worktree.
- Never edit a version field by hand — `npm run version:<bump>` writes all of them atomically and
  keeps the lockfile root in step.
- Never bump backwards or re-use a version.
- Never write release notes that describe intended behavior as shipped behavior.
- Never bump in a worktree operating in parallel mode.

## 9. Invariants

```text
INVARIANT-01  VERSION, package.json and frontend/package.json always hold the same value.
INVARIANT-02  The new version is strictly greater than origin/main's.
INVARIANT-03  Exactly one bump per integrated delivery.
INVARIANT-04  Bumps happen through npm run version:<major|minor|patch>.
INVARIANT-05  An incompatible contract or data-model change is MAJOR and has an accepted ADR.
INVARIANT-06  RELEASE_NOTES.md states limitations; nothing unshipped is described as shipped.
INVARIANT-07  Every claim in the notes is traceable to a fragment, a test or a file.
INVARIANT-08  Parallel worktrees never touch version files.
```

## 10. Dependencies

`scripts/versioning.mjs`; the change fragments; `frontend/src/config/version.ts` and
`backend/app/core/version.py`, which surface the version at runtime; CI's
`npm run version:check-against origin/main`. A change to the version files without the script
breaks all of these at once.

## 11. Required knowledge

SemVer as practiced here (public effect, not diff size); how to read a contract diff; the difference
between a change that is additive to the API and one that changes the meaning of an existing field;
the fragment format; the honest-limitations rule in `docs/CLAUDE.md`.

## 12. Inputs

The completed change or the integrated branch, its `changes/*.md` fragments, the contract diff
against `origin/main`, and the test evidence gathered by `/finish-change`.

## 13. Preconditions

1. `/finish-change` passed and the full gate is green.
2. Every task in the delivery has a fragment in `changes/`.
3. The active manifest names you as the version owner and the mode is `single-delivery`, or you are
   integration-manager on an integration branch.
4. `git fetch` has run, so `origin/main` is a real comparison point.

## 14. Discovery procedure

```text
1. npm run version:current
2. git diff origin/main --name-only        → the delivery's real surface
3. git diff origin/main -- contracts/api-contracts.json   → the objective breaking-change test
4. Read every changes/*.md fragment in the delivery; note each fragment's declared `type`
5. Look for persisted-schema changes (backend/alembic/versions/, orm_models.py)
6. Look for removed or renamed public fields in backend/app/schemas/ and frontend/src/types/
7. Classify (§15)
8. Draft the notes from the fragments, then verify each claim against code or tests
```

## 15. Decision framework

**MAJOR** — an existing operation's method, path, request shape or response meaning changed; a
persisted field was removed or its semantics changed; an auth or ownership rule changed in a way
that revokes previously allowed access; any change requiring consumers to adapt. Requires an
accepted ADR.

**MINOR** — a new operation, a new optional field, a new flow or capability, a new provider — all
backward compatible.

**PATCH** — a fix, a refactor with no behavior change, documentation, governance, tooling, tests,
or copy corrections.

**Several fragments with different types** → the delivery takes the highest.

**Uncertain between minor and major** → check whether an existing consumer would break. If a
frontend built against `origin/main` would still work against the new backend, it is minor.

**A fragment claims a capability the code does not have** → do not release the claim. Correct the
fragment, or scope the note to what is evidenced.

**The lockfile or `backend/pyproject.toml` disagrees** → these are warnings by design; the release
authority is `VERSION` plus the two application manifests. Do not "fix" them by hand-editing
versions.

## 16. Execution workflow

```text
CONFIRM READY   finish-change green; fragments present
CLASSIFY        highest impact across the delivery, justified in one sentence
BUMP            npm run version:<major|minor|patch>
VERIFY          npm run version:check
                npm run version:check-against origin/main
CONSOLIDATE     merge fragments into RELEASE_NOTES.md
VERIFY CLAIMS   each statement → a file, a test, or a fragment
RUNTIME         confirm the displayed version (frontend config, backend /api/v1/health)
LIMITATIONS     state what is not done, degraded, or unverified
RECORD          note the version in the manifest; archive fragments per changes/README.md
```

## 17. Proactive behavior

- **Local:** while writing the notes, re-read the fragments critically — they were written by
  someone who wanted the change to sound finished.
- **Horizontal:** check whether any other worktree is mid-delivery; their `version:check` will fail
  the moment you bump, and they need to know.
- **Vertical:** a version is visible in the UI and in the API; confirm both report the new value
  rather than assuming the script covered it.
- **Pattern:** repeated patch bumps that each add a capability mean the classification is drifting
  low; say so.
- **Regression risk:** a MAJOR bump implies consumers must adapt — the notes must say exactly how.

## 18. Expected agent behavior

Classify from effect, not from effort. Bump through the script. Verify against `origin/main`, not
only locally. Write notes that a skeptical reader can check. Name the limitations before someone
else finds them.

## 19. Forbidden behaviors

```text
DO NOT:
- hand-edit VERSION, package.json or frontend/package.json version fields;
- bump more than once for one delivery, or bump in a parallel worktree;
- classify a breaking contract change as minor to avoid a major;
- write release notes from the plan instead of from the shipped code;
- describe an optional, unconfigured or degraded capability as available;
- omit known limitations, unverified areas or accepted risks;
- release with fragments missing for part of the delivery;
- tag, push or deploy as part of this skill — those need explicit authorization.
```

## 20. Error handling strategy

| Failure | Meaning | Response |
|---|---|---|
| `Version mismatch. Expected X; found …` | Manifests drifted, usually a hand edit | Re-run `npm run version:<bump>` to synchronize; never patch one file |
| `Version must increase relative to origin/main` | Bump missing or backwards | Bump; if the branch is behind, rebase first |
| `Invalid semantic version` | Malformed VERSION | Restore a valid `X.Y.Z`; the file holds one line |
| Lockfile root metadata warning | Expected | Informational; a local version command refreshes it |
| `backend/pyproject.toml` warning | Expected | Runtime version comes from `VERSION`; `uv.lock` stays dependency-reproducible |
| Edit denied on `VERSION` | You are not the version owner | Correct: in parallel mode only integration-manager bumps |

## 21. Edge cases

- **A delivery that only reverts.** Still forward: the next patch/minor, never a decrement.
- **A hotfix on top of a release.** Patch, with notes that say what was wrong and what is fixed.
- **A capability behind an optional extra** (Strands `agents`) or an unset environment variable.
  Describe it as available *when configured*, and name the variable — as 4.6.0 does with
  `OPENAI_BASE_URL` and `DATABASE_URL`.
- **A change that is major for the API but invisible in the UI.** Still major; consumers are not
  only the bundled frontend.
- **Two worktrees complete simultaneously.** They do not both bump. Integration-manager takes both
  fragments and issues one version.
- **A fragment exists for work that was cut.** Remove or correct it before consolidating; a fragment
  is a claim.

## 22. Cross-system impact checklist

```text
[ ] Contract diff reviewed against origin/main
[ ] Persisted-schema changes reviewed for compatibility
[ ] Highest fragment type used for the classification
[ ] npm run version:check passes
[ ] npm run version:check-against origin/main passes
[ ] Displayed version correct in the UI and in the API health response
[ ] RELEASE_NOTES.md rewritten, not appended to mechanically
[ ] Every note claim traceable to code, a test or a fragment
[ ] Limitations and unverified areas stated
[ ] Fragments consolidated and handled per changes/README.md
[ ] No other worktree left with a broken version check without being told
```

## 23. Validation strategy

```bash
npm run version:current
npm run version:check
npm run version:check-against origin/main
npm run agent:verify -- full          # the delivery itself must still be green after the bump
```

Then confirm the runtime value: the version rendered by `frontend/src/config/version.ts` (surfaced
in `ReleaseBadge.tsx`) and the value returned by the health endpoint via
`backend/app/core/version.py`. A bump that the running app does not report is not a release.

## 24. Definition of Done

```text
[ ] Classification justified in one sentence tied to public effect
[ ] Bump performed through npm run version:<bump>
[ ] version:check and version:check-against origin/main both pass
[ ] RELEASE_NOTES.md tells the truth, including limitations
[ ] Every fragment in the delivery is represented
[ ] UI and API report the new version
[ ] Full gate still green after the bump
[ ] Manifest records the released version
[ ] No unauthorized tag, push or deploy was performed
```

## 25. Expected output

```markdown
## Release <X.Y.Z>

### Classification
<major|minor|patch> — because <public effect>

### Consolidated fragments
- changes/<id>.md — <one line>

### Synchronization
version:check PASS · version:check-against origin/main PASS (<old> → <new>)

### Runtime confirmation
UI badge: <X.Y.Z> · GET /api/v1/health: <X.Y.Z>

### Release notes
<summary of what the notes now say>

### Limitations stated
- …

### Not done in this release
- …
```

## 26. Escalation rules

Escalate to the user when: the delivery is breaking and no ADR exists; two deliveries want the same
version; the classification is contested; the release notes would have to claim something you cannot
evidence; or a tag, push or deploy is expected — those always require explicit authorization.

## 27. Collaboration with other skills

```text
version-release
 ├── follows   → finish-change (single delivery) or integrate-worktrees (parallel)
 ├── consumes  → changes/*.md fragments
 ├── requires  → architecture-decision for any major
 ├── informs   → release-readiness-gate (which version is under judgement)
 └── owned by  → integration-manager in parallel initiatives
```

## 28. Examples

**Correct.** 4.6.0 added OpenAI-compatible providers and a Postgres driver: new capability, no
existing consumer broken → MINOR. The notes name the exact variables (`OPENAI_BASE_URL`,
`OPENAI_API_KEY`, the `postgresql+psycopg://` DSN edit), explain the protocol difference that made
the naive version fail silently, and point at `test_postgres_readiness.py` as the evidence. Claims,
mechanism, evidence.

**Incorrect.** "4.6.0 — now supports free-tier AI and Postgres." No variable names, no protocol
caveat, no evidence, and it implies a database migration was performed when only the driver and the
compile-time check shipped.

**Complex.** An initiative spanning four worktrees — a design-system extraction, a backend
ownership fix, an AI-context change and a responsive audit. Each fragment declares its own type
(patch, minor, patch, patch). Integration-manager merges in dependency order, resolves the shared
files on the integration branch only, and issues one MINOR. The notes are organized by user-visible
theme, not by worktree, and each theme names the tests that hold it up.

## 29. Failure scenarios

```text
Scenario: A worktree bumps the version so its own CI check passes.
Wrong:    Edit VERSION locally.
Correct:  In parallel mode the edit is denied by design. Produce changes/<task-id>.md; integration
          -manager issues the single bump for the initiative.

Scenario: A field is renamed in a response DTO.
Wrong:    Patch, because "it is a small change".
Correct:  Any consumer reading the old name breaks. MAJOR, with an ADR and a migration note telling
          consumers exactly what to change.

Scenario: The release notes are drafted from the plan while the last task slips.
Wrong:    Ship the notes as written.
Correct:  Notes describe shipped code. Re-verify each claim against the merged tree and move
          anything unshipped into "not done in this release".
```

## 30. Self-review

1. Did I classify from public effect, or from how much work it felt like?
2. Would a frontend built against `origin/main` still work? (If not, is it major, with an ADR?)
3. Did I bump exactly once, through the script?
4. Do `version:check` and `check-against origin/main` both pass?
5. Does the running app report the new version?
6. Can I point at a file or a test for every claim in the notes?
7. Did I state the limitations, including anything unverified?
8. Did I leave any other checkout with a broken version check without telling them?
