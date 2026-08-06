from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import CaseAlert, CaseDocument, CaseNote, CaseTask

ResourceT = TypeVar("ResourceT", CaseDocument, CaseTask, CaseNote, CaseAlert)


class WorkspaceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _list(self, model: type[ResourceT], case_id: str) -> list[ResourceT]:
        statement = (
            select(model)
            .where(model.case_id == case_id, model.is_active.is_(True))
            .order_by(model.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def _get(self, model: type[ResourceT], case_id: str, resource_id: str) -> ResourceT | None:
        statement = select(model).where(
            model.id == resource_id,
            model.case_id == case_id,
            model.is_active.is_(True),
        )
        return self.db.scalar(statement)

    def save(self, entity: ResourceT) -> ResourceT:
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity: ResourceT) -> None:
        self.db.delete(entity)
        self.db.commit()

    def list_documents(self, case_id: str) -> list[CaseDocument]:
        return self._list(CaseDocument, case_id)

    def get_document(self, case_id: str, document_id: str) -> CaseDocument | None:
        return self._get(CaseDocument, case_id, document_id)

    def list_tasks(self, case_id: str) -> list[CaseTask]:
        return self._list(CaseTask, case_id)

    def get_task(self, case_id: str, task_id: str) -> CaseTask | None:
        return self._get(CaseTask, case_id, task_id)

    def list_notes(self, case_id: str) -> list[CaseNote]:
        return self._list(CaseNote, case_id)

    def get_note(self, case_id: str, note_id: str) -> CaseNote | None:
        return self._get(CaseNote, case_id, note_id)

    def list_alerts(self, case_id: str) -> list[CaseAlert]:
        return self._list(CaseAlert, case_id)

    def get_alert(self, case_id: str, alert_id: str) -> CaseAlert | None:
        return self._get(CaseAlert, case_id, alert_id)
