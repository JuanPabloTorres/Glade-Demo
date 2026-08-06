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
os.environ.setdefault("DOCUMENT_INTELLIGENCE_PROVIDER", "rules")

from app.main import app  # noqa: E402, F401
