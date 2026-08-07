---
taskId: legacy-task-fallback-scope
type: patch
scope: agent-governance
---
# Summary
Scope the legacy `active-task.json` fallback to the checkout that actually registered it. Fixes a defect introduced by the per-worktree manifest migration in 4.0.0.

# User-visible behavior
No product change. Governance gates stop reporting an unrelated task from another branch.

# Migration / compatibility
The pre-migration shared manifest is still honoured for the worktree whose `workingBranch` it names, so a task registered before 4.0.0 keeps working. Every other checkout now ignores it.

# Tests and evidence
Verified against the five live worktrees: the checkout owning the legacy manifest still resolves it; checkouts with their own manifest resolve theirs; a checkout with neither resolves `null` instead of the stale task.

# Risks / limitations
`validate-task-completion.mjs` still calls `loadActiveTask()` with no argument, so on a *Stop* event it evaluates the primary worktree's task regardless of which checkout the session worked in. A Stop event carries no file path, so there is no reliable key to resolve the right worktree without a signal from the harness. Out of scope here; this change only stops a stale manifest from being the answer.
