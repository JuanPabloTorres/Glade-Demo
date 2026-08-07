---
taskId: parallel-agent-governance
type: minor
scope: agent-system
---
# Summary
Make concurrent agents safe to run: cross-checkout path claims, atomic locked shared state, a per-checkout edit ledger, a fleet view, and governance commands that archive instead of deleting.

# User-visible behavior
No product behavior changes. For agents: `npm run agent:fleet` reports every live checkout and its conflicts, `npm run agent:snapshot` copies all uncommitted work, and an edit is denied when another checkout already has the same file in flight.

# Migration / compatibility
`claude-state/active-task.json` is still read as a fallback for checkouts without their own manifest, and is never written again. `worktrees.json` gains a `key` field; `npm run agent:worktree sync` backfills existing entries without dropping any. `worktree create` no longer requires a clean primary checkout — that requirement prevented isolating parallel work at the exact moment it was needed. The `PreToolUse` command hook now also matches `PowerShell`, which previously bypassed every command guard on Windows.

# Tests and evidence
Exercised against the five live checkouts of this repository: `agent:fleet` reported 10 real conflicts (4 claim overlaps, 4 files in flight in two or more checkouts, plus registry drift); `validate-edit.mjs` allowed an owned untouched path, warned on an overlapping claim, and denied both an unowned path and a path already dirty in a sibling checkout; `task.mjs start` rejected a duplicate task id and an overlapping claim without writing the manifest; `agent:worktree sync` recovered three missing registrations; `agent:snapshot` copied 119 uncommitted files across all checkouts with every skip accounted for.

# Risks / limitations
The working-tree conflict check is cached for 15 seconds, so a collision created inside that window is caught by the ledger only. State files are keyed by checkout directory name; a duplicate name is reported as an error rather than handled. Stale locks are broken after 60 seconds, trading an unlikely double-write for not freezing the fleet on a crashed agent.
