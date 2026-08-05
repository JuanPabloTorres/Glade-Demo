from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.normalization import normalize_value
from app.domain.enums import ConflictStatus
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

    def list_for_field(self, matter_id: str, field_name: str) -> list[ExtractedFact]:
        statement = (
            select(ExtractedFact)
            .where(
                ExtractedFact.matter_id == matter_id,
                ExtractedFact.field_name == field_name,
            )
            .order_by(ExtractedFact.created_at.desc())
        )
        return list(self._session.scalars(statement).all())

    def find_matching(
        self,
        matter_id: str,
        field_name: str,
        value: str,
        *,
        document_id: str | None = None,
        source_type: str | None = None,
    ) -> ExtractedFact | None:
        candidates = self.list_for_field(matter_id, field_name)
        normalized = normalize_value(value)
        for fact in candidates:
            if document_id is not None and fact.document_id != document_id:
                continue
            if source_type is not None and fact.source_type != source_type:
                continue
            if normalize_value(fact.value) == normalized:
                return fact
        return None


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

    def list_open_for_field(self, matter_id: str, field_name: str) -> list[Conflict]:
        statement = select(Conflict).where(
            Conflict.matter_id == matter_id,
            Conflict.field_name == field_name,
            Conflict.status == ConflictStatus.OPEN.value,
        )
        return list(self._session.scalars(statement).all())

    def count_open_for_document(self, document_id: str) -> int:
        statement = select(func.count()).select_from(Conflict).where(
            Conflict.document_id == document_id,
            Conflict.status == ConflictStatus.OPEN.value,
        )
        return int(self._session.scalar(statement) or 0)

    def find_open(
        self,
        matter_id: str,
        field_name: str,
        conflicting_value: str,
        document_id: str | None,
    ) -> Conflict | None:
        statement = select(Conflict).where(
            Conflict.matter_id == matter_id,
            Conflict.field_name == field_name,
            Conflict.conflicting_value == conflicting_value,
            Conflict.document_id == document_id,
            Conflict.status == ConflictStatus.OPEN.value,
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
