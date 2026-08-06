# Agent system architecture

`CLAUDE.md` imports project rules. Nested instructions scope frontend/backend/docs. `.claude/rules` supplies permanent path-aware constraints. `.claude/skills` defines repeatable workflows. `.claude/agents` separates planning, implementation, security, testing and release authority. Hooks enforce hard boundaries before/after tools. `scripts/agent` provides cross-platform commands and shared git-common-dir state. Branches isolate coherent changes; worktrees isolate parallel streams; integration-manager owns shared files and the final version bump.
