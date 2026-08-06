# Change fragments

Every governed delivery creates `changes/<task-id>.md`. Individual branches may perform one final version bump. Parallel worktrees never edit version files; integration-manager consolidates their fragments, updates `RELEASE_NOTES.md` and performs one SemVer bump. Released fragments may be archived or removed in the release commit.
