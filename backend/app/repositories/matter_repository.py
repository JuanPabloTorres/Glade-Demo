from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.models import Activity, Conflict, Document, ExtractedFact, Matter
from app.repositories.base import BaseRepository


class MatterRepository(BaseRepository[Matter]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Matter)

    def list_recent(self) -> list[Matter]:
        statement = select(Matter).order_by(Matter.created_at.desc())
        return list(self._session.scalars(statement).all())

    def get_with_relations(self, matter_id: str) -> Matter | None:
        statement = (
            select(Matter)
            .where(Matter.id == matter_id)
            .options(
                selectinload(Matter.documents).selectinload(Document.facts),
                selectinload(Matter.conflicts),
                selectinload(Matter.activities),
                selectinload(Matter.facts),
            )
        )
        return self._session.scalar(statement)


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Document)

    def list_for_matter(self, matter_id: str) -> list[Document]:
        statement = (
            select(Document)
            .where(Document.matter_id == matter_id)
            .options(selectinload(Document.facts))
            .order_by(Document.created_at.desc())
        )
        return list(self._session.scalars(statement).all())


class FactRepository(BaseRepository[ExtractedFact]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, ExtractedFact)


class ConflictRepository(BaseRepository[Conflict]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Conflict)

    def list_for_matter(self, matter_id: str) -> list[Conflict]:
        statement = (
            select(Conflict)
            .where(Conflict.matter_id == matter_id)
            .order_by(Conflict.created_at.desc())
        )
        return list(self._session.scalars(statement).all())

    def find_open(self, matter_id: str, field_name: str, conflicting_value: str) -> Conflict | None:
        statement = select(Conflict).where(
            Conflict.matter_id == matter_id,
            Conflict.field_name == field_name,
            Conflict.conflicting_value == conflicting_value,
            Conflict.status == "open",
        )
        return self._session.scalar(statement)


class ActivityRepository(BaseRepository[Activity]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Activity)

    def list_for_matter(self, matter_id: str) -> list[Activity]:
        statement = (
            select(Activity)
            .where(Activity.matter_id == matter_id)
            .order_by(Activity.created_at.desc())
        )
        return list(self._session.scalars(statement).all())
