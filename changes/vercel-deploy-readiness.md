---
taskId: vercel-deploy-readiness
type: minor
scope: deployment entrypoint, startup seeding, deployment documentation
---

# Summary

Makes the Vercel deployment actually work and honestly documented. Three
things stood between the repository and a usable deploy, and none of them was
visible from the code you would naturally read first.

# What was wrong

**The API could not boot at all.** `api/index.py` forces
`ENVIRONMENT=production`, and `Settings` refuses to construct in production
while `JWT_SECRET` is still the public demo key. That refusal happens at import
time, so without the variable set in Vercel every `/api/*` route returns a
function error — not a degraded experience, a completely dead backend. The
guard is correct and stays; what was missing was anywhere that said so.

**Every cold start served an empty workspace.** The lifespan called `init_db()`,
which creates tables and nothing else. `reset_demo_data()` was reachable only
from a CLI script and an admin endpoint, so a Vercel visitor logged in and found
nothing until somebody remembered to POST the reset — and lost it again at the
next cold start, because the SQLite file lives in a per-instance `/tmp`.

**`docs/DEPLOYMENT.md` actively misled.** It stated the backend is stateless,
that no code path reads Postgres, and that `DATABASE_URL` is "dead config…
don't rely on it doing anything yet". All three were true before 4.0.0 and
false since. Anyone provisioning this deployment from that document would
conclude no database was needed.

# What changed

`seed_demo_data_if_absent` is the non-destructive counterpart to
`reset_demo_data`: it writes only into a database with no cases and no users,
so it can safely sit on a boot path. The lifespan calls it behind
`SEED_DEMO_DATA_ON_STARTUP`, off by default and set to `true` in
`api/index.py`.

The flag is deliberately not inferred from `environment`. The one deployment
that needs it also runs with `ENVIRONMENT=production`, so any
environment-derived rule would either miss it or arm itself against a real
production database. An explicit opt-in is the only honest signal — and because
the helper refuses to overwrite, the worst case of leaving it on is a no-op.

`docs/DEPLOYMENT.md` is rewritten: the real persistence story, a table of
Vercel variables marking `JWT_SECRET` as boot-blocking, what the deployment can
and cannot demonstrate, and the concrete Alembic steps for Postgres.
`.env.example` documents the new variable, and `api/index.py` records why
`JWT_SECRET` is the one thing it must not default.

# User-visible behavior

A correctly configured Vercel deployment now answers a login with the populated
demo workspace instead of an empty one. Nothing changes locally or on Render,
where the flag is off.

# Migration / compatibility

Additive. One new setting, defaulting to the previous behaviour.

# Tests and evidence

`test_vercel_entrypoint.py` boots `api/index.py` the way Vercel boots it — in a
subprocess, from a scratch directory, because `Settings` is read and cached at
import and this repository has an untracked `.env` that would otherwise supply
the very secret the first test is trying to prove is missing:

- without `JWT_SECRET` the process exits non-zero with the guard's message;
- with it, a cold start against a database that did not exist a moment earlier
  answers `/health`, logs the demo client in, and reports a populated case
  table;
- with the flag off, the same cold start reports zero cases — the behaviour the
  flag exists to fix, pinned so its value is visible rather than folklore.

`test_startup_seed.py` pins the property that makes boot-path seeding
defensible: given a pre-existing row it does nothing and leaves that row
untouched. `reset_demo_data`, which it delegates to for an empty database,
wipes every table first — so the emptiness check is asserted against a real row
rather than trusted.

Backend 172 tests (7 new), `ruff` and `mypy` clean. `agent:verify` passes.

# Risks / limitations

**Storage is still ephemeral on Vercel.** Seeding makes the demo present, not
durable: two concurrent instances do not share rows, and a case owned in one
invocation reads back ownerless after a cold start. Server-side ownership is
enforced, but it cannot be *demonstrated* on this target. Real persistence
needs `DATABASE_URL` pointing at Postgres, documented step by step.

**The Strands agent layer is not exercised on Vercel.** The SDK is excluded
from `requirements.txt` on purpose and a test keeps it out, so every answer
comes from the deterministic fallback with `degraded: true`. That path answers
the question actually asked as of 4.3.0, so the demo reads well — but it is not
the agent.
