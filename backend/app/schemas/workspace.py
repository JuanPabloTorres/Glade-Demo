from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    AlertSeverity,
    DocumentCategory,
    DocumentStatus,
    TaskPriority,
    TaskStatus,
)


class DocumentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    category: DocumentCategory = DocumentCategory.OTHER
    status: DocumentStatus = DocumentStatus.REQUESTED
    file_url: str | None = Field(default=None, max_length=500)
    notes: str = Field(default="", max_length=3000)


class DocumentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    category: DocumentCategory | None = None
    status: DocumentStatus | None = None
    file_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=3000)


class DocumentRead(DocumentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    uploaded_by_id: str | None
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    description: str = Field(default="", max_length=4000)
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: datetime | None = None
    assigned_to_id: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    description: str | None = Field(default=None, max_length=4000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assigned_to_id: str | None = None


class TaskRead(TaskCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    content: str = Field(min_length=2, max_length=5000)
    is_internal: bool = True


class NoteUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=2, max_length=5000)
    is_internal: bool | None = None


class NoteRead(NoteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    author_id: str
    created_at: datetime
    updated_at: datetime


class AlertCreate(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    message: str = Field(default="", max_length=4000)
    severity: AlertSeverity = AlertSeverity.WARNING
    resolved: bool = False


class AlertUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    message: str | None = Field(default=None, max_length=4000)
    severity: AlertSeverity | None = None
    resolved: bool | None = None


class AlertRead(AlertCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    created_at: datetime
    updated_at: datetime


class WorkspaceRead(BaseModel):
    documents: list[DocumentRead] = Field(default_factory=list)
    tasks: list[TaskRead] = Field(default_factory=list)
    notes: list[NoteRead] = Field(default_factory=list)
    alerts: list[AlertRead] = Field(default_factory=list)
