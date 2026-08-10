---
taskId: demo-closeout-4-14-3
type: patch
scope: integrated demo closeout release 4.14.3
---
# Summary

Integrate the non-destructive demo-fixture reconciliation and publish the
closeout as FreshStart 4.14.3.

# User-visible behavior

Opening a governed synthetic case as the attorney retains the financial
analysis even when the serving database began in a partial state.

# Migration / compatibility

No migration or contract change. The release is backward-compatible and adds
only missing synthetic fixture IDs during the explicitly enabled startup seed.

# Tests and evidence

- 386 backend tests plus Ruff and mypy.
- 143 frontend tests plus lint and production build.
- Isolated attorney nine-step Playwright journey.

# Risks / limitations

Vercel's default SQLite database remains ephemeral and per instance. A shared
Postgres `DATABASE_URL` is still required before storing real data.
