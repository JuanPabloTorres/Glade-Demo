from __future__ import annotations

import secrets
import time
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import Settings, get_settings
from app.schemas.auth import AuthUserDto
from app.schemas.bankruptcy import UserRole

_AUTHORIZED_ROLES: dict[str, UserRole] = {"client": "client", "attorney": "attorney"}
"""The roles a session token may claim.

A mapping rather than a set so that reading a value out of it yields the
narrowed `UserRole`, which is what `AuthUserDto` requires — see
`_decode_session_token`.
"""

bearer_scheme = HTTPBearer(auto_error=False)
password_hash = PasswordHash.recommended()


@lru_cache
def get_demo_password_hash(password: str) -> str:
    return password_hash.hash(password)


def get_demo_accounts(settings: Settings) -> list[tuple[AuthUserDto, str]]:
    return [
        (
            AuthUserDto(
                id=settings.demo_client_id,
                email=settings.demo_client_email.strip().lower(),
                name=settings.demo_client_name,
                role="client",
                preferred_language="es",
            ),
            settings.demo_client_password,
        ),
        (
            AuthUserDto(
                id=settings.demo_attorney_id,
                email=settings.demo_attorney_email.strip().lower(),
                name=settings.demo_attorney_name,
                role="attorney",
                # Both demo personas default to Spanish, matching the rest of
                # this Puerto Rico-market demo — the LanguageSelector already
                # covers showcasing English, so this shouldn't silently flip
                # the UI language on attorney login (was "en", likely a
                # leftover test value).
                preferred_language="es",
            ),
            settings.demo_attorney_password,
        ),
    ]


def authenticate_credentials(email: str, password: str, settings: Settings) -> AuthUserDto | None:
    normalized_email = email.strip().lower()
    for user, expected_password in get_demo_accounts(settings):
        if not secrets.compare_digest(normalized_email, user.email):
            continue
        hashed_password = get_demo_password_hash(expected_password)
        if password_hash.verify(password, hashed_password):
            return user
    return None


# --- Login brute-force throttling ----------------------------------------
#
# Audit finding #2: "no rate limiting on login... no lockout, no delay, no
# attempt counter." This is a dependency-free in-memory sliding-window
# limiter rather than `slowapi` + Redis: FreshStart's demo deployment is a
# single process (one uvicorn worker locally, one Vercel function instance
# in prod) with no shared state between requests handled elsewhere, so a
# module-level dict is genuinely sufficient — it survives for the life of
# that one process and resets on redeploy, which is an acceptable trade-off
# for a demo. It intentionally does NOT survive a process restart or scale
# past one instance; if FreshStart ever runs multiple instances behind a
# load balancer, swap this for `slowapi` backed by Redis so counters are
# shared, since two instances with independent in-memory dicts would each
# allow the configured limit before either one notices.
#
# Keyed by (client IP, attempted email) per docs/audits/GLADE-DEMO-GROUNDED-
# STATE-2026-08-06.md's fix instructions, so unrelated users and unrelated
# IPs never share — or interfere with — each other's counters. Only failed
# attempts increment the counter; a successful login clears it, so a
# legitimate user who mistyped a password a couple of times isn't penalized
# once they get it right.
_failed_login_attempts: dict[tuple[str, str], list[float]] = defaultdict(list)


def _login_rate_limit_key(client_ip: str, email: str) -> tuple[str, str]:
    return (client_ip or "unknown", email.strip().lower())


def _prune_expired_attempts(key: tuple[str, str], window_seconds: float, now: float) -> list[float]:
    attempts = [
        timestamp for timestamp in _failed_login_attempts[key] if now - timestamp < window_seconds
    ]
    _failed_login_attempts[key] = attempts
    return attempts


def is_login_rate_limited(client_ip: str, email: str, settings: Settings) -> bool:
    """True once this (ip, email) pair has hit the failed-attempt ceiling
    within the sliding window. Checked *before* verifying the password, so a
    locked-out caller is rejected even if they finally supply the right
    password — the lockout only clears when the window ages out or a test
    explicitly resets it."""
    key = _login_rate_limit_key(client_ip, email)
    attempts = _prune_expired_attempts(
        key, settings.login_rate_limit_window_seconds, time.monotonic()
    )
    return len(attempts) >= settings.login_rate_limit_max_attempts


def register_failed_login_attempt(client_ip: str, email: str, settings: Settings) -> None:
    key = _login_rate_limit_key(client_ip, email)
    now = time.monotonic()
    attempts = _prune_expired_attempts(key, settings.login_rate_limit_window_seconds, now)
    attempts.append(now)
    _failed_login_attempts[key] = attempts


def reset_login_rate_limit(client_ip: str, email: str) -> None:
    """Called on a successful login so a legitimate user's earlier typos
    don't count against them going forward."""
    _failed_login_attempts.pop(_login_rate_limit_key(client_ip, email), None)


def clear_login_rate_limits() -> None:
    """Test-only escape hatch: wipes every counter. `_failed_login_attempts`
    is process-global module state, so without this, tests that intentionally
    trip the limiter would leak locked-out (ip, email) pairs into unrelated
    tests that run later in the same pytest session."""
    _failed_login_attempts.clear()


def create_access_token(user: AuthUserDto, settings: Settings) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.jwt_expiration_minutes)
    payload: dict[str, Any] = {
        "sub": user.email,
        "uid": user.id,
        "name": user.name,
        "role": user.role,
        "iat": now,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str, settings: Settings) -> AuthUserDto:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session is invalid or has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    subject = payload.get("sub")
    user_id = payload.get("uid")
    name = payload.get("name")
    role = payload.get("role")
    # Checked one claim at a time rather than through `all(...)`: a generator
    # hides the narrowing from the type checker, so all four stayed `Any | None`
    # at the constructor below. The runtime check was already correct; this
    # makes it verifiable statically, on the one path that turns an unverified
    # token payload into an authenticated identity.
    if (
        not isinstance(subject, str)
        or not subject
        or not isinstance(user_id, str)
        or not user_id
        or not isinstance(name, str)
        or not name
        or not isinstance(role, str)
        or not role
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session token is missing required claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Looked up in the allow-list rather than tested for membership in it: a
    # `str` that passed an `in` check is still a `str` to the type checker, so
    # the old form left the role unverified at the constructor. Reading the
    # value *out of* the mapping is what carries the narrowed type with it, and
    # it keeps the set of accepted roles in one place.
    authorized_role = _AUTHORIZED_ROLES.get(role)
    if authorized_role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session role is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUserDto(id=user_id, email=subject, name=name, role=authorized_role)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUserDto:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials, settings)


CurrentUserDep = Annotated[AuthUserDto, Depends(get_current_user)]
