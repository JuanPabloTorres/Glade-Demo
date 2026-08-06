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


# --- CORS production warning (QA release gate finding: "no production CORS
# origin explicitly configured") -------------------------------------------
#
# Unlike the JWT secret, a stale CORS default doesn't universally mean the
# deployment is broken (same-origin deployments never trigger CORS checks
# at all — see the validator's docstring in app.core.config), so this is a
# logged warning, not a boot refusal. These tests assert the warning fires
# (or doesn't) rather than asserting a raise.


def test_production_boot_with_default_cors_origin_logs_a_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level("WARNING", logger="app.core.config"):
        Settings(
            environment="production",
            jwt_secret="a-sufficiently-long-random-production-only-secret-value",
            cors_origins=Settings.DEFAULT_CORS_ORIGINS,
        )
    assert any("CORS_ORIGINS" in record.message for record in caplog.records)


def test_production_boot_with_a_custom_cors_origin_does_not_warn(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level("WARNING", logger="app.core.config"):
        Settings(
            environment="production",
            jwt_secret="a-sufficiently-long-random-production-only-secret-value",
            cors_origins="https://app.freshstart.example",
        )
    assert not any("CORS_ORIGINS" in record.message for record in caplog.records)
