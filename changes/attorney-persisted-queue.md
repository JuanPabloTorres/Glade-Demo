---
taskId: attorney-persisted-queue
type: minor
scope: Attorney queue server-authorized portfolio
---
# Summary

Add a server-authorized attorney portfolio operation and use its persisted case
IDs as the source of truth for every Open action in the attorney queue. If a
case disappears between listing and analysis, the attorney returns to the queue
without the generic analysis error.

# User-visible behavior

Browser-only or stale draft rows no longer appear in the attorney queue, so
selecting an offered case cannot produce a not-found financial-analysis error.
Persisted cases remain reviewable even when all financial collections are empty.

# Migration / compatibility

Adds the backward-compatible `GET /api/v1/bankruptcy/portfolio` operation. No
database migration or existing API shape changes are required.

# Tests and evidence

- API contract, attorney happy path, anonymous 401, and client 403.
- Component regression with the exact reported orphan case ID.
- Browser regression that injects the orphan into localStorage and proves no
  Open link is rendered, then opens a valid case with analysis HTTP 200.

# Risks / limitations

The demo still stores its editable workspace snapshot in the browser. The
server portfolio is intentionally a minimal authorization/triage projection;
cases present only on the server but absent from that browser are not hydrated
into the local workspace by this change.
