---
taskId: GLADE-2026-08-06-agent-governance
type: minor
scope: agent-system
---
# Summary
Add native Claude Code governance with scoped instructions, rules, skills, agents, hooks, ownership, Flowbite checks and branch/worktree/release policy.

# User-visible behavior
No product behavior changes; development and delivery become organized and enforceable.

# Migration / compatibility
Legacy `.agents` skills and hooks remain as compatibility pointers to `.claude`.

# Tests and evidence
Architecture, Flowbite, i18n, existing backend/frontend and E2E gates are required by CI.

# Risks / limitations
Local task state lives in the git common directory and must be initialized per clone.
