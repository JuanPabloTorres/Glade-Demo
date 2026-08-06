# Git, worktree and versioning policy

One coherent delivery uses one governed branch. Independent parallel streams use registered worktrees and an integration branch. Ownership is stored under the git common directory. Worktrees produce change fragments and do not edit shared release files. Integration-manager consolidates, resolves shared paths and performs exactly one SemVer bump before the independent release gate.
