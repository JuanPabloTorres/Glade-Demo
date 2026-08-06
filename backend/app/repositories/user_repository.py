"""
SQLAlchemy implementation of `UserRepositoryProtocol`. Used by
`app.repositories.seed` to make `cases.owner_user_id` a real foreign key
against a real row instead of a bare string, and available for any future
endpoint that needs to look up a user by id.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.domain.entities import UserEntity
from app.domain.value_objects import UserRole
from app.repositories.database import SessionDep
from app.repositories.orm_models import UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, user_id: str) -> UserEntity | None:
        row = self._session.get(UserModel, user_id)
        return None if row is None else _to_entity(row)

    def upsert(self, user: UserEntity) -> UserEntity:
        row = self._session.get(UserModel, user.id)
        if row is None:
            row = UserModel(id=user.id)
            self._session.add(row)
        row.email = user.email
        row.name = user.name
        row.role = UserRole(user.role).value
        row.preferred_language = user.preferred_language
        self._session.flush()
        self._session.refresh(row)
        return _to_entity(row)


def _to_entity(row: UserModel) -> UserEntity:
    return UserEntity(
        id=row.id,
        email=row.email,
        name=row.name,
        role=UserRole(row.role),
        preferred_language=row.preferred_language,
    )


def get_user_repository(session: SessionDep) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(session)


UserRepositoryDep = Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)]
