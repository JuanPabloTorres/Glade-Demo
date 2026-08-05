"""Vercel ASGI entrypoint for the MatterReady FastAPI application."""

from __future__ import annotations

import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Vercel Functions may write only to /tmp. This is suitable for an evaluation
# preview; production deployment should set DATABASE_URL to managed PostgreSQL.
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/matter_ready.db")
os.environ.setdefault("DOCUMENT_INTELLIGENCE_PROVIDER", "rules")

from app.main import app  # noqa: E402, F401
