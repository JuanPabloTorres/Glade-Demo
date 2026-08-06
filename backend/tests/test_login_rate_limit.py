"""Login throttling tests — docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md
finding #2 ("no rate limiting on login... no lockout, no delay, no attempt
counter"). Fix lives in app.core.security's in-memory sliding-window
limiter, wired into POST /api/v1/auth/login by app.api.routers.auth.login.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.security import clear_login_rate_limits
from app.main import app

CLIENT_EMAIL = "client@freshstart.demo"
CLIENT_PASSWORD = "FreshStart!2026"
ATTORNEY_EMAIL = "attorney@freshstart.demo"


@pytest.fixture(autouse=True)
def _isolated_rate_limit_state():
    # `_failed_login_attempts` is process-global module state that outlives
    # any single test — without this, a test that intentionally trips the
    # limiter would leak a locked-out (ip, email) pair into unrelated tests
    # running later in the same pytest session (and vice versa).
    clear_login_rate_limits()
    yield
    clear_login_rate_limits()


def _login(test_client: TestClient, email: str, password: str) -> object:
    return test_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


def _attempt_wrong_password(test_client: TestClient, email: str = CLIENT_EMAIL) -> object:
    return _login(test_client, email, "definitely-wrong-password")


def test_exceeding_the_login_attempt_limit_returns_429(client: TestClient) -> None:
    for _ in range(5):
        response = _attempt_wrong_password(client)
        assert response.status_code == 401

    blocked = _attempt_wrong_password(client)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["code"] == "RATE_LIMITED"
    assert body["messageKey"] == "errors.codes.RATE_LIMITED"
    assert "Retry-After" in blocked.headers


def test_locked_out_pair_is_blocked_even_with_the_correct_password(client: TestClient) -> None:
    for _ in range(5):
        _attempt_wrong_password(client)

    response = _login(client, CLIENT_EMAIL, CLIENT_PASSWORD)
    assert response.status_code == 429


def test_resetting_the_window_allows_login_again(client: TestClient) -> None:
    for _ in range(5):
        _attempt_wrong_password(client)
    assert _attempt_wrong_password(client).status_code == 429

    # Simulates the sliding window aging out rather than sleeping the test
    # suite for real minutes.
    clear_login_rate_limits()

    response = _login(client, CLIENT_EMAIL, CLIENT_PASSWORD)
    assert response.status_code == 200


def test_a_successful_login_resets_the_counter(client: TestClient) -> None:
    for _ in range(4):
        assert _attempt_wrong_password(client).status_code == 401

    # One below the ceiling, then a correct password — should reset the
    # counter rather than leaving 4 stale failures sitting in the window.
    assert _login(client, CLIENT_EMAIL, CLIENT_PASSWORD).status_code == 200

    for _ in range(4):
        assert _attempt_wrong_password(client).status_code == 401
    # Still below the ceiling because the earlier successes cleared it.
    assert _attempt_wrong_password(client).status_code == 401


def test_different_emails_do_not_share_a_counter(client: TestClient) -> None:
    for _ in range(5):
        assert _attempt_wrong_password(client, email=CLIENT_EMAIL).status_code == 401

    # A different email from the same client/IP is a different counter.
    other_email_response = _attempt_wrong_password(client, email=ATTORNEY_EMAIL)
    assert other_email_response.status_code == 401


def test_different_ips_do_not_share_a_counter() -> None:
    with (
        TestClient(app, headers={"X-Forwarded-For": "203.0.113.10"}) as client_a,
        TestClient(app, headers={"X-Forwarded-For": "203.0.113.20"}) as client_b,
    ):
        for _ in range(5):
            assert _attempt_wrong_password(client_a).status_code == 401

        # client_a is now locked out even with the correct password...
        assert _login(client_a, CLIENT_EMAIL, CLIENT_PASSWORD).status_code == 429

        # ...but client_b, a different IP, is entirely unaffected.
        assert _login(client_b, CLIENT_EMAIL, CLIENT_PASSWORD).status_code == 200
