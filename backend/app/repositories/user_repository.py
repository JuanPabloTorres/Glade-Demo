from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.enums import UserRole
from app.domain.models import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, User)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def list_by_role(self, role: UserRole) -> list[User]:
        statement = select(User).where(User.role == role, User.is_active.is_(True)).order_by(User.full_name)
        return list(self.db.scalars(statement))
