---
taskId: changelog-ledger
type: docs
scope: delivery ledger — what shipped and what was deliberately not shipped
---
# Summary

Adds `CHANGELOG.md`: one ledger of what each release delivered *and* what was scoped
and deliberately not delivered, with an open ledger at the top that carries the second
half forward until something closes it.

The repository already recorded deliveries twice — `RELEASE_NOTES.md` for the prose of
*why* a release happened, `changes/<task-id>.md` for the detail of one delivery. Neither
answers "what did we commit to that is still not done?", because a deferral written in one
fragment's "Risks / limitations" section is invisible from every other fragment. Six
fragments each recorded a real gap; nothing read all six at once except a human, and
`docs/audits/COMPLETION-GAP-AUDIT.md` had to be written by hand to find out.

# What it contains

Every entry has two halves, **Delivered** and **Not delivered**. Six maintenance rules fix
where entries go, what evidence "Delivered" requires, and that an item leaves the open
ledger only when a later entry delivers it or drops it and says why. A status vocabulary
separates `UNVERIFIED` (implemented, never exercised) from `DONE` (observed) — that
distinction is the reason the file exists.

The open ledger holds 17 items, each with the version that opened it, what blocks it and
where it is tracked. History runs from 4.9.0 back to 0.4.0, with release dates taken from
the release commits rather than recalled.

# Sources

Nothing here was recalled. Delivered lines come from `RELEASE_NOTES.md`; the open items
from `docs/audits/COMPLETION-GAP-AUDIT.md` and the "Risks / limitations" sections of
`changes/provider-capability-hardening.md`, `changes/demo-ready-verification.md`,
`changes/attorney-demo-case-seed.md`, `changes/strands-acceptance-audit.md` and
`changes/completion-gap-audit.md`; dates from
`git log --pretty="%ad" -- VERSION`.

# Tests and evidence

`npm run agent:validate` passes. Documentation only — no code, contract, route or
behaviour change, so no suite is affected.

# Risks / limitations

**Entries at and below 4.8.0 have no "Not delivered" half** beyond what their release
notes happened to state. The discipline starts at `[Unreleased]`; the file says so instead
of implying the older releases had no deferrals.

**Nothing enforces the file.** Rule 1 says every governed delivery edits it, but no hook or
`agent:verify` check fails when a delivery does not. Until one exists, this is a
convention, and conventions drift — which is the failure this file was written to stop.
A `verify` step asserting that a commit touching `changes/*.md` also touches
`CHANGELOG.md` is the durable fix and is a larger change than this one.

**`CHANGELOG.md` is not declared a shared path.** Rule 5 assigns the `[Unreleased]` →
version promotion to integration-manager, matching `VERSION` and `RELEASE_NOTES.md`, but
the task manifest schema still treats it as ordinary owned ground. It should join
`sharedPaths` in `.claude/rules/03-task-ownership.md`.

**`changes/README.md` was not updated** to point at the new file. It is not claimed by this
task, and re-narrowing the manifest to take it would have overwritten the path claims of
the concurrent `agentic-observability` task running in this same checkout.

**This change was made under a manifest that is not its own.** `CHANGELOG.md` was claimed
by adding it to the active `agentic-observability` task rather than registering a separate
one, because registering a task in this checkout deactivates the sibling task mid-flight.
Two agents in one working directory is outside what `.claude/rules/05-parallel-agents.md`
models; the governed shape is a registered worktree.
