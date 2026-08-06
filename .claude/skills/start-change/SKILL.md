---
name: start-change
description: Start any code or documentation change with a scoped task manifest, branch/worktree decision, ownership and version strategy.
---
# Start change

1. Run `npm run agent:context`.
2. Classify type, scope and SemVer impact.
3. Use one branch for one coherent change; use registered worktrees for independent parallel streams.
4. Run `node scripts/agent/task.mjs start --id <id> --title <title> --scope <scope>`.
5. Populate owned/shared paths, agents, skills, acceptance criteria, risks and verification commands.
6. Do not edit until the active task validates.
