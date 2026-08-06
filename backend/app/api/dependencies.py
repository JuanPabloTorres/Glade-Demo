from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.ai.demo_provider import DemoAssistantProvider
from app.ai.openai_provider import OpenAIAssistantProvider
from app.core.config import Settings, get_settings
from app.core.security import decode_access_token
from app.database.session import get_db
from app.domain.enums import UserRole
from app.domain.models import User
from app.repositories.case_repository import CaseRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.assistant_service import AssistantService
from app.services.auth_service import AuthService
from app.services.case_service import CaseService
from app.services.dashboard_service import DashboardService
from app.services.workspace_service import WorkspaceService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_case_repository(db: Session = Depends(get_db)) -> CaseRepository:
    return CaseRepository(db)


def get_workspace_repository(db: Session = Depends(get_db)) -> WorkspaceRepository:
    return WorkspaceRepository(db)


def get_auth_service(
    users: UserRepository = Depends(get_user_repository),
    settings: Settings = Depends(get_settings),
) -> AuthService:
    return AuthService(users, settings)


def get_case_service(
    cases: CaseRepository = Depends(get_case_repository),
    users: UserRepository = Depends(get_user_repository),
) -> CaseService:
    return CaseService(cases, users)


def get_workspace_service(
    workspace: WorkspaceRepository = Depends(get_workspace_repository),
    cases: CaseService = Depends(get_case_service),
) -> WorkspaceService:
    return WorkspaceService(workspace, cases)


def get_dashboard_service(
    cases: CaseService = Depends(get_case_service),
    workspace: WorkspaceRepository = Depends(get_workspace_repository),
) -> DashboardService:
    return DashboardService(cases, workspace)


def get_assistant_service(settings: Settings = Depends(get_settings)) -> AssistantService:
    if settings.ai_provider.lower() == "openai" and settings.openai_api_key:
        provider = OpenAIAssistantProvider(settings.openai_api_key, settings.openai_model)
    else:
        provider = DemoAssistantProvider()
    return AssistantService(provider)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    users: UserRepository = Depends(get_user_repository),
    settings: Settings = Depends(get_settings),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token, settings)
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise credentials_error
    except jwt.InvalidTokenError as exc:
        raise credentials_error from exc
    user = users.get(subject)
    if not user or not user.is_active:
        raise credentials_error
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return current_user

    return dependency
