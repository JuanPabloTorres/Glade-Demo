"""Vercel ASGI entrypoint for the MatterReady FastAPI application."""

from __future__ import annotations

import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

os.environ.setdefault("ENVIRONMENT", "production")
# KNOWN DEMO LIMITATION: Vercel serverless functions do not guarantee a
# persistent or shared /tmp across invocations/cold starts. Every cold start
# re-runs init_db() against an empty SQLite file, so case ownership recorded
# in a prior invocation can appear "gone" after a cold start — a case_id that
# was already owned will read back as ownerless and be re-claimable. This is
# fine for a synthetic-data demo but must NOT be treated as a real ownership
# guarantee in this deployment target. Before storing anything real, point
# DATABASE_URL at a managed Postgres instance (see backend/app/core/config.py
# for the documented upgrade path) rather than relying on the default below.
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/matter_ready.db")
# Follows directly from the line above: if every cold start gets an empty
# database, every cold start also answers a login with an empty workspace
# unless the synthetic case is put back. `seed_demo_data_if_absent` only writes
# into a database that has none, so this becomes a no-op the moment
# DATABASE_URL points somewhere durable that already holds rows. `setdefault`,
# so a deployment can turn it off without editing this file.
os.environ.setdefault("SEED_DEMO_DATA_ON_STARTUP", "true")

# The agent, not the deterministic fallback. OpenAI rather than Ollama because
# Ollama needs a model server on localhost and a serverless function has none.
#
# Safe to set unconditionally: with no OPENAI_API_KEY the factory raises
# MissingModelCredentialsError, AgentRuntime catches it and answers from the
# deterministic draft with `degraded: true` — exactly the behaviour this
# deployment had before the SDK was added. So a deployment without the key
# loses nothing; one with it gains the agent.
os.environ.setdefault("AI_PROVIDER", "openai")
os.environ.setdefault("DOCUMENT_INTELLIGENCE_PROVIDER", "rules")

# NOT defaulted here, deliberately: JWT_SECRET. `Settings` refuses to construct
# in production while it is still the public demo key, and that refusal is the
# point — a default here would silently sign real sessions with a key published
# in this repository. It has to come from the deployment's environment, and
# until it does every /api route fails loudly instead of quietly. See
# docs/DEPLOYMENT.md.

from app.main import app  # noqa: E402, F401
