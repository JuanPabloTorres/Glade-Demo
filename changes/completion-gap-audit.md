---
taskId: completion-gap-audit
type: docs
scope: readiness gap analysis
---
# Summary

Measures what is actually left to complete the demo, against
`integration/demo-close` at 4.9.0. Every line was produced by running a command
or reading the file named.

The remaining list is shorter than the acceptance addenda assume: three
capabilities are genuinely missing, one is blocked on a credential I cannot
supply, and everything else is verification of things that already work.

# Two items assumed missing that already exist

**Sidebar collapse is implemented.** `Sidebar.tsx` carries
`COLLAPSED_STORAGE_KEY`, a `collapsed` state and an effect persisting it. It
needs verification, not construction.

**Hardcoded user-facing Spanish is at zero.** A scan for accented text inside JSX
across `components/` and `pages/` returns 0 matches. The static i18n surface is
clean; the rendered-DOM audit of dynamic content is what remains.

Recording these matters as much as recording the gaps: an audit that lists built
work as missing sends the next session to rebuild it.

# Genuinely missing

- **Attorney cross-case intelligence** — `CaseRepositoryProtocol` exposes no
  list-by-assignment, and no attorney-scoped tool exists. The fix is a new tool,
  not a `case_id` parameter on the existing ones, which would put a
  model-authored string on the authorization path.
- **Structured observability** — no `request_id` or `correlation_id` anywhere in
  `backend/app`.
- **Agentic multi-turn matrix** — partially covered at the rule-based provider
  (`test_a_real_follow_up_still_inherits`); the ES/EN × client/attorney matrix
  through the agentic path does not exist.

# Blocked

`LIVE_AGENT_PROVIDER_VERIFICATION` only. No provider credential exists in the
process environment, the user or machine registry, `.env`, `backend/.env`,
`frontend/.env`, or anywhere in the repository — searched before saying so. It
blocks the live gate and nothing else.

# User-visible behavior

None. Audit only.

# Tests and evidence

Measurements taken this pass: backend 292 passed, frontend 121 passed, build,
lint, i18n and governance clean; 16 commits ahead of `main`; 34 change fragments
pending; sidebar collapse state located in `Sidebar.tsx`; zero accented JSX text;
no assignment method on `CaseRepositoryProtocol`; no correlation id in
`backend/app`; 38 E2E tests across 5 specs.

# Risks / limitations

**The E2E suite was still running when this was written.** It is item 1 of the
critical path precisely because it is the cheapest unknown left, and its result
is not in this document.

**Effort estimates are judgement, not measurement.** The gap list is measured;
the hours attached to each item are not.

**Two sibling checkouts hold work outside this branch** — `skills-standard`
(19 edits) and `ui-mobile-responsive` (5 uncommitted paths including
`AppShell.tsx`). Neither can be integrated from here without forking files.
