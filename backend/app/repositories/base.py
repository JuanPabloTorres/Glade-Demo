from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.base import Base


class BaseRepository[TEntity: Base]:
    def __init__(self, session: Session, model_type: type[TEntity]) -> None:
        self._session = session
        self._model_type = model_type

    def get(self, entity_id: str) -> TEntity | None:
        return self._session.get(self._model_type, entity_id)

    def list(self) -> list[TEntity]:
        return list(self._session.scalars(select(self._model_type)).all())

    def add(self, entity: TEntity) -> TEntity:
        self._session.add(entity)
        return entity
