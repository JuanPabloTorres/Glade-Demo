from __future__ import annotations

import secrets
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
    if not all(isinstance(value, str) and value for value in (subject, user_id, name, role)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session token is missing required claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if role not in {"client", "attorney"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session role is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUserDto(id=user_id, email=subject, name=name, role=role)


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
