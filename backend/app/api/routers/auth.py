from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import (
    CurrentUserDep,
    authenticate_credentials,
    create_access_token,
    is_login_rate_limited,
    register_failed_login_attempt,
    reset_login_rate_limit,
)
from app.schemas.auth import AuthTokenDto, AuthUserDto, LoginDto

router = APIRouter(tags=["Authentication"])
registry = get_contract_registry()
login_contract = registry.get("auth.login")
me_contract = registry.get("auth.me")
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _client_ip(request: Request) -> str:
    # Vercel/most reverse-proxy deployments terminate TLS in front of the
    # app, so the direct ASGI-scope client is the proxy, not the caller —
    # prefer X-Forwarded-For (first hop) when present, same as CORS/session
    # logging would need to. Falls back to the raw ASGI client for local/dev
    # runs where there is no proxy in front.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@router.post(
    login_contract.path,
    response_model=AuthTokenDto,
    operation_id=login_contract.operation_id,
)
def login(dto: LoginDto, settings: SettingsDep, request: Request) -> AuthTokenDto:
    client_ip = _client_ip(request)
    if is_login_rate_limited(client_ip, dto.email, settings):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait before trying again.",
            headers={"Retry-After": str(settings.login_rate_limit_window_seconds)},
        )
    user = authenticate_credentials(dto.email, dto.password, settings)
    if user is None:
        register_failed_login_attempt(client_ip, dto.email, settings)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    reset_login_rate_limit(client_ip, dto.email)
    token = create_access_token(user, settings)
    return AuthTokenDto(
        access_token=token,
        expires_in=settings.jwt_expiration_minutes * 60,
        user=user,
    )


@router.get(
    me_contract.path,
    response_model=AuthUserDto,
    operation_id=me_contract.operation_id,
)
def get_current_session(current_user: CurrentUserDep) -> AuthUserDto:
    return current_user
