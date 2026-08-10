---
taskId: financial-analysis-demo-seed
type: patch
scope: non-destructive synthetic demo fixture bootstrap for financial analysis
---
# Summary

Reconcile missing synthetic demo users and cases during the opted-in startup
bootstrap, even when the serverless database already contains unrelated rows.

# User-visible behavior

Opening a browser-visible demo case as the attorney no longer loses financial
analysis merely because the serving instance was only partially initialized.

# Migration / compatibility

No schema or API contract change. Existing cases and unrelated rows are left
untouched; only missing governed synthetic fixture IDs are inserted.

# Tests and evidence

- Startup regression for a partially populated database.
- Endpoint regression proving `404` before reconciliation and `200` after it.
- Unknown attorney case remains `404` through the existing authorization test.

# Risks / limitations

Vercel's default `/tmp` SQLite database remains per-instance and ephemeral.
This repair keeps the synthetic demo coherent; durable real data still requires
a shared Postgres `DATABASE_URL`.
