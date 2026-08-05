from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.contracts import get_contract_registry
from app.core.security import (
    CurrentUserDep,
    authenticate_credentials,
    create_access_token,
)
from app.schemas.auth import AuthTokenDto, AuthUserDto, LoginDto

router = APIRouter(tags=["Authentication"])
registry = get_contract_registry()
login_contract = registry.get("auth.login")
me_contract = registry.get("auth.me")
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.post(
    login_contract.path,
    response_model=AuthTokenDto,
    operation_id=login_contract.operation_id,
)
def login(dto: LoginDto, settings: SettingsDep) -> AuthTokenDto:
    user = authenticate_credentials(dto.email, dto.password, settings)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
