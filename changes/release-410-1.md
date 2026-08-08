---
taskId: release-410-1
type: chore
scope: version and release notes for 4.10.1
---
# Summary

4.10.0 → **4.10.1**. PATCH: a demo-data fix plus two tests, no contract or behaviour
change to the runtime.

`VERSION`, `package.json`, `frontend/package.json` and `RELEASE_NOTES.md` updated by
integration-manager, the only role permitted to touch them. The evidence record now
carries the final gate numbers rather than the ones from before the last commit.

# Why a second release rather than an amended one

`2f3bc8e` landed after the 4.10.0 bump. Rewriting that release to absorb it would be the
easier ledger and the wrong one — 4.10.0 was a real, verified state, and the fix that
followed is a real, separate delivery. History is not rewritten to make the version
count smaller.

# Final gate numbers

| Gate | Result |
|---|---|
| Backend lint / typecheck / tests | pass / pass / **355 passed** |
| Frontend lint / tests / build / i18n | 0 errors / **132 passed** / pass / pass |
| Contracts / governance | no drift / pass |
| Playwright | **95 passed**, 0 failed |

# Note recorded in the evidence

The defect this release fixes was found by looking at the running product, not by a
suite. Every suite asserts the completion score is *visible*; none asserts what it says,
so a case reporting 100% with nothing missing failed nothing. That is the argument for
the visual pass being a real step, and it is written into
`docs/evidence/release-regression.md` rather than left as a lesson nobody recorded.
