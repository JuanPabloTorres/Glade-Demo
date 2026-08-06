from fastapi import HTTPException, status

from app.domain.enums import DocumentStatus, UserRole
from app.domain.models import CaseAlert, CaseDocument, CaseNote, CaseTask, User
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import (
    AlertCreate,
    AlertUpdate,
    DocumentCreate,
    DocumentUpdate,
    NoteCreate,
    NoteUpdate,
    TaskCreate,
    TaskUpdate,
)
from app.services.case_service import CaseService

STAFF_ROLES = {UserRole.CASE_MANAGER, UserRole.ADMIN}


class WorkspaceService:
    def __init__(self, workspace: WorkspaceRepository, cases: CaseService) -> None:
        self.workspace = workspace
        self.cases = cases

    def get_workspace(self, case_id: str, current_user: User) -> dict[str, list[object]]:
        self.cases.get_case(case_id, current_user)
        notes = self.workspace.list_notes(case_id)
        if current_user.role == UserRole.APPLICANT:
            notes = [note for note in notes if not note.is_internal]
        return {
            "documents": self.workspace.list_documents(case_id),
            "tasks": self.workspace.list_tasks(case_id),
            "notes": notes,
            "alerts": self.workspace.list_alerts(case_id),
        }

    def create_document(
        self, case_id: str, payload: DocumentCreate, current_user: User
    ) -> CaseDocument:
        self.cases.get_case(case_id, current_user)
        status_value = payload.status
        if current_user.role == UserRole.APPLICANT and status_value in {
            DocumentStatus.VERIFIED,
            DocumentStatus.NEEDS_ATTENTION,
        }:
            status_value = DocumentStatus.UPLOADED
        entity = CaseDocument(
            case_id=case_id,
            name=payload.name,
            category=payload.category,
            status=status_value,
            file_url=payload.file_url,
            notes=payload.notes,
            uploaded_by_id=current_user.id,
        )
        return self.workspace.save(entity)

    def update_document(
        self,
        case_id: str,
        document_id: str,
        payload: DocumentUpdate,
        current_user: User,
    ) -> CaseDocument:
        self.cases.get_case(case_id, current_user)
        entity = self._document_or_404(case_id, document_id)
        changes = payload.model_dump(exclude_unset=True)
        if current_user.role == UserRole.APPLICANT and changes.get("status") in {
            DocumentStatus.VERIFIED,
            DocumentStatus.NEEDS_ATTENTION,
        }:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Applicants cannot verify documents",
            )
        self._apply(entity, changes)
        return self.workspace.save(entity)

    def delete_document(self, case_id: str, document_id: str, current_user: User) -> None:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        self.workspace.delete(self._document_or_404(case_id, document_id))

    def create_task(self, case_id: str, payload: TaskCreate, current_user: User) -> CaseTask:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        return self.workspace.save(CaseTask(case_id=case_id, **payload.model_dump()))

    def update_task(
        self, case_id: str, task_id: str, payload: TaskUpdate, current_user: User
    ) -> CaseTask:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        entity = self._task_or_404(case_id, task_id)
        self._apply(entity, payload.model_dump(exclude_unset=True))
        return self.workspace.save(entity)

    def delete_task(self, case_id: str, task_id: str, current_user: User) -> None:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        self.workspace.delete(self._task_or_404(case_id, task_id))

    def create_note(self, case_id: str, payload: NoteCreate, current_user: User) -> CaseNote:
        self.cases.get_case(case_id, current_user)
        internal = payload.is_internal if current_user.role in STAFF_ROLES else False
        entity = CaseNote(
            case_id=case_id,
            content=payload.content,
            is_internal=internal,
            author_id=current_user.id,
        )
        return self.workspace.save(entity)

    def update_note(
        self, case_id: str, note_id: str, payload: NoteUpdate, current_user: User
    ) -> CaseNote:
        self.cases.get_case(case_id, current_user)
        entity = self._note_or_404(case_id, note_id)
        if current_user.role == UserRole.APPLICANT and entity.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        changes = payload.model_dump(exclude_unset=True)
        if current_user.role == UserRole.APPLICANT:
            changes.pop("is_internal", None)
        self._apply(entity, changes)
        return self.workspace.save(entity)

    def delete_note(self, case_id: str, note_id: str, current_user: User) -> None:
        self.cases.get_case(case_id, current_user)
        entity = self._note_or_404(case_id, note_id)
        if current_user.role not in STAFF_ROLES and entity.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        self.workspace.delete(entity)

    def create_alert(self, case_id: str, payload: AlertCreate, current_user: User) -> CaseAlert:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        return self.workspace.save(CaseAlert(case_id=case_id, **payload.model_dump()))

    def update_alert(
        self, case_id: str, alert_id: str, payload: AlertUpdate, current_user: User
    ) -> CaseAlert:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        entity = self._alert_or_404(case_id, alert_id)
        self._apply(entity, payload.model_dump(exclude_unset=True))
        return self.workspace.save(entity)

    def delete_alert(self, case_id: str, alert_id: str, current_user: User) -> None:
        self.cases.get_case(case_id, current_user)
        self._ensure_staff(current_user)
        self.workspace.delete(self._alert_or_404(case_id, alert_id))

    @staticmethod
    def _apply(entity: object, changes: dict[str, object]) -> None:
        for field, value in changes.items():
            setattr(entity, field, value)

    @staticmethod
    def _ensure_staff(current_user: User) -> None:
        if current_user.role not in STAFF_ROLES:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    def _document_or_404(self, case_id: str, resource_id: str) -> CaseDocument:
        entity = self.workspace.get_document(case_id, resource_id)
        if not entity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return entity

    def _task_or_404(self, case_id: str, resource_id: str) -> CaseTask:
        entity = self.workspace.get_task(case_id, resource_id)
        if not entity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return entity

    def _note_or_404(self, case_id: str, resource_id: str) -> CaseNote:
        entity = self.workspace.get_note(case_id, resource_id)
        if not entity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        return entity

    def _alert_or_404(self, case_id: str, resource_id: str) -> CaseAlert:
        entity = self.workspace.get_alert(case_id, resource_id)
        if not entity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        return entity
