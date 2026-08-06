#!/usr/bin/env python
"""
CLI demo-data reset. Wipes and recreates the two demo accounts (client +
attorney, both defined in app.core.security.get_demo_accounts — synthetic
personas, never real PII) plus one synthetic demo case for the client.

Usage (from backend/):
    uv run python scripts/seed_demo_data.py

Also reachable at runtime via `POST /api/v1/admin/demo/reset` (dev-only,
gated by ENVIRONMENT != "production" — see app.api.routers.admin). Both call
app.repositories.seed.reset_demo_data so there is exactly one definition of
"demo data".
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.repositories.seed import DEMO_CASE_ID, reset_demo_data  # noqa: E402


def main() -> None:
    settings = get_settings()
    if settings.environment == "production":
        raise SystemExit(
            "Refusing to seed synthetic demo data into a production environment "
            "(ENVIRONMENT=production). This script is for local/dev use only."
        )
    reset_demo_data(settings)
    print(f"Demo data reset. Database: {settings.database_url}")
    print(f"Demo case id: {DEMO_CASE_ID}")
    print(f"Demo client: {settings.demo_client_email}")
    print(f"Demo attorney: {settings.demo_attorney_email}")


if __name__ == "__main__":
    main()
