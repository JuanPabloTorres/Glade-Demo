---
taskId: free-tier-providers
type: minor
scope: OpenAI-compatible model providers, Postgres driver, deployment documentation
---

# Summary

Lets the demo run its agent and keep its data without a paid account. Two
blockers, both of them one variable away once the code supports them.

# The agent

OpenAI has no meaningful free tier, and the agent is the part of this product
worth demonstrating — so the deployed demo could show everything except the
thing 4.0.0 was built for.

Several providers expose an OpenAI-compatible endpoint with a real free tier.
`OPENAI_BASE_URL` points the `openai` provider at one of them.

**It switches the protocol, not just the host.** The existing path uses OpenAI's
*Responses* API, which today only OpenAI implements. Sending that shape to
Groq, Cerebras, OpenRouter or Gemini's compatibility endpoint fails every call,
and `AgentRuntime` converts a failed call into a silent degrade — the symptom
would have been "the agent never answers", with nothing explaining why. So a
base URL selects `strands.models.openai.OpenAIModel` (Chat Completions)
instead.

The token cap changes spelling with the protocol: `max_tokens` rather than
`max_output_tokens`. Some compatibility endpoints reject the unknown parameter
and others ignore it silently, and in both cases the configured cap would not
have been applied.

`OPENAI_API_KEY` holds whichever provider's key — the variable is named for the
protocol, not the vendor.

# The database

Vercel's filesystem is per-instance and ephemeral, so nothing survives a cold
start. `docs/DEPLOYMENT.md` already promised that moving to Postgres was "a
connection string and nothing else" — a promise that could not be kept, because
no Postgres driver shipped anywhere.

`psycopg[binary]` now ships in both `requirements.txt` and
`backend/pyproject.toml`, so the deployed runtime and the test suite exercise
the same set. Neon and Supabase both have free tiers that suit this demo, and
the documentation records the one edit their DSN needs: `postgresql://` has to
become `postgresql+psycopg://`, or SQLAlchemy looks for `psycopg2` and fails at
the first request.

# Migration / compatibility

Additive. `OPENAI_BASE_URL` unset keeps the current OpenAI behaviour exactly.
A blank string counts as unset, because that is how an unset Vercel variable
arrives.

# Tests and evidence

- A base URL produces an `OpenAIModel` with the configured model id; no base
  URL still produces an `OpenAIResponsesModel`; a whitespace-only value counts
  as unset; the cap is emitted as `max_tokens` and `max_output_tokens` is
  absent. Asserted against the real installed SDK classes, not mocks.
- `test_postgres_readiness.py` holds the "connection string and nothing else"
  claim to account without needing a server: the driver imports, SQLAlchemy
  resolves the DSN to it, and **every column of every table compiles under the
  PostgreSQL dialect** — a SQLite-only type would fail here rather than at
  `alembic upgrade head` against a real database.
- Size re-measured after adding the driver: a clean install of
  `requirements.txt` is **176.8 MB** against Vercel's 250 MB limit.
- Backend 196 tests, `ruff` and `mypy` clean.

# Risks / limitations

**No live call has been made through any of these providers.** No key of any
kind exists in this environment. What is proven is that the right class is
built with the right parameters; the first real turn still has to be confirmed.

Because the runtime degrades silently rather than erroring, a rejected model
looks identical to a working deterministic answer. The documentation says what
to check on the first turn: `degraded: false`, and `handled_by` naming a
specialist rather than `deterministic`.

Free tiers carry rate limits that this code does not handle specially. A
throttled request fails, degrades, and answers deterministically — correct
behaviour, but under a demo's burst of questions it may degrade more often than
a paid tier would.
