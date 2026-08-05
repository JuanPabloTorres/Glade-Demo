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


def get_demo_user(settings: Settings) -> AuthUserDto:
    return AuthUserDto(
        email=settings.demo_user_email.strip().lower(),
        name=settings.demo_user_name,
        role=settings.demo_user_role,
    )


def authenticate_credentials(email: str, password: str, settings: Settings) -> AuthUserDto | None:
    expected_email = settings.demo_user_email.strip().lower()
    if not secrets.compare_digest(email.strip().lower(), expected_email):
        return None
    hashed_password = get_demo_password_hash(settings.demo_user_password)
    if not password_hash.verify(password, hashed_password):
        return None
    return get_demo_user(settings)


def create_access_token(user: AuthUserDto, settings: Settings) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.jwt_expiration_minutes)
    payload: dict[str, Any] = {
        "sub": user.email,
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
    name = payload.get("name")
    role = payload.get("role")
    if not all(isinstance(value, str) and value for value in (subject, name, role)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session token is missing required claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUserDto(email=subject, name=name, role=role)


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
