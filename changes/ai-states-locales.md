---
taskId: ai-states-locales
type: test
scope: ChatPanel agentic/degraded/failure states in ES and EN
---
# Summary

The three AI answer states already existed in `ChatPanel` and were already tested:
a model answer, the deterministic-fallback notice (`guidance.degraded`), and a hard
failure with retry (`lastFailedMessage`). Every one of those tests read Spanish copy.

So all of them would still pass if a Spanish string were baked into the component,
and an English user would read Spanish at the exact moment their turn failed. Mixed
language is a listed release blocker, and the failure path is the least-exercised
place for it to hide.

# What changed

Tests only — no component change was needed, which is the finding. A new
`describe("the answer states in English")` renders the same three states with the
i18next singleton switched to `en`.

The degraded test asserts both directions: the English sentence is present *and* the
Spanish one is absent. Present-only would pass against a component rendering both.

`afterEach` restores `es`. Under `isolate: false` the i18next instance is a module
singleton shared across the whole run, so a leaked language would surface as failures
in an unrelated file — confirmed absent by running the full suite, not the one file.

# Tests and evidence

`ChatPanel.test.tsx`: 20 → 23 tests. Full frontend suite 124 → 127 across 18 files,
all passing, no leakage into the files that run after this one.

`i18n:check` already guarantees the two bundles carry the same keys. What it cannot
see is whether the component reads a key at all rather than holding a literal — that
is what these three renders establish.

# Risks / limitations

**Three states, not the whole panel, in English.** The offline notice, the action
chips and the card view are still asserted only in Spanish. They were not part of the
release contract's AI-failure item and no evidence suggests they are hardcoded; this
is a scope statement, not a claim that they were checked.
