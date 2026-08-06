"""JWT production-secret guard — docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md
finding #3 ("JWT secret defaults to a hardcoded literal... nothing rejects
the default when environment == 'production'"). Enforced by a pydantic
`model_validator` on Settings itself (app.core.config), so it fires the
moment Settings() is constructed — which is at import time for the real app
via `settings = get_settings()` in app.main, not just in some narrower,
skippable "startup script" path.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_boot_with_default_jwt_secret_is_rejected() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(environment="production", jwt_secret=Settings.DEFAULT_JWT_SECRET)


def test_production_boot_with_a_custom_jwt_secret_succeeds() -> None:
    settings = Settings(
        environment="production",
        jwt_secret="a-sufficiently-long-random-production-only-secret-value",
    )
    assert settings.environment == "production"
    assert settings.jwt_secret != Settings.DEFAULT_JWT_SECRET


def test_development_boot_with_default_jwt_secret_is_still_allowed() -> None:
    # The default exists so the demo boots with zero configuration; only
    # environment=="production" should ever reject it.
    settings = Settings(environment="development", jwt_secret=Settings.DEFAULT_JWT_SECRET)
    assert settings.jwt_secret == Settings.DEFAULT_JWT_SECRET
