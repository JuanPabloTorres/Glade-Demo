---
name: integrate-worktrees
description: Integrate parallel worktrees safely using manifests, ownership, change fragments, ordered merges and one release owner.
---
# Integrate worktrees

1. Collect manifests and changed-file lists.
2. Reject uncoordinated overlap and verify each worktree gate.
3. Integrate foundations → contracts/backend → frontend → AI/security → QA.
4. Resolve shared files only on integration branch.
5. Consolidate change fragments and perform one SemVer bump.
6. Run full verification and produce an integration report.
