from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import get_current_user, get_workspace_service
from app.domain.models import User
from app.schemas.workspace import (
    AlertCreate,
    AlertRead,
    AlertUpdate,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    NoteCreate,
    NoteRead,
    NoteUpdate,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    WorkspaceRead,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/cases/{case_id}", tags=["case workspace"])


@router.get("/workspace", response_model=WorkspaceRead)
def get_workspace(
    case_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> WorkspaceRead:
    return service.get_workspace(case_id, current_user)


@router.post("/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    case_id: str,
    payload: DocumentCreate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    return service.create_document(case_id, payload, current_user)


@router.patch("/documents/{document_id}", response_model=DocumentRead)
def update_document(
    case_id: str,
    document_id: str,
    payload: DocumentUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    return service.update_document(case_id, document_id, payload, current_user)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    case_id: str,
    document_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_document(case_id, document_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    case_id: str,
    payload: TaskCreate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    return service.create_task(case_id, payload, current_user)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    case_id: str,
    task_id: str,
    payload: TaskUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    return service.update_task(case_id, task_id, payload, current_user)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    case_id: str,
    task_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_task(case_id, task_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    case_id: str,
    payload: NoteCreate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> NoteRead:
    return service.create_note(case_id, payload, current_user)


@router.patch("/notes/{note_id}", response_model=NoteRead)
def update_note(
    case_id: str,
    note_id: str,
    payload: NoteUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> NoteRead:
    return service.update_note(case_id, note_id, payload, current_user)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    case_id: str,
    note_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_note(case_id, note_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/alerts", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
def create_alert(
    case_id: str,
    payload: AlertCreate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> AlertRead:
    return service.create_alert(case_id, payload, current_user)


@router.patch("/alerts/{alert_id}", response_model=AlertRead)
def update_alert(
    case_id: str,
    alert_id: str,
    payload: AlertUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> AlertRead:
    return service.update_alert(case_id, alert_id, payload, current_user)


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    case_id: str,
    alert_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_alert(case_id, alert_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
