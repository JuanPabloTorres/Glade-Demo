from fastapi import APIRouter, Depends

from app.api.dependencies import get_user_repository, require_roles
from app.domain.enums import UserRole
from app.domain.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/applicants", response_model=list[UserRead])
def list_applicants(
    users: UserRepository = Depends(get_user_repository),
    _: User = Depends(require_roles(UserRole.CASE_MANAGER, UserRole.ADMIN)),
) -> list[User]:
    return users.list_by_role(UserRole.APPLICANT)
