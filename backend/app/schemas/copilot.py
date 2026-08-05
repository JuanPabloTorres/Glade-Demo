from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel

ChatRole = Literal["assistant", "user"]
CaseType = Literal["immigration", "bankruptcy", "general", "unknown"]
EvidenceStatus = Literal["confirmed", "missing", "conflict"]
IssueKind = Literal["missing", "conflict"]
IssueStatus = Literal["open", "resolved"]


class ChatMessageDto(ApiModel):
    id: str
    role: ChatRole
    content: str
    created_at: datetime


class CaseProfileDto(ApiModel):
    goal: str | None = None
    case_type: CaseType | None = None
    client_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    deadline: str | None = None
    notes: str | None = None


class EvidenceDocumentDto(ApiModel):
    id: str
    label: str
    text: str
    facts: dict[str, str] = Field(default_factory=dict)
    created_at: datetime


class ConversationStateDto(ApiModel):
    session_id: str
    messages: list[ChatMessageDto] = Field(default_factory=list)
    profile: CaseProfileDto = Field(default_factory=CaseProfileDto)
    documents: list[EvidenceDocumentDto] = Field(default_factory=list)
    resolutions: dict[str, str] = Field(default_factory=dict)


class EvidenceValueDto(ApiModel):
    value: str
    source: str
    confidence: float


class EvidenceRowDto(ApiModel):
    field: str
    label: str
    status: EvidenceStatus
    values: list[EvidenceValueDto] = Field(default_factory=list)


class ReviewIssueDto(ApiModel):
    id: str
    kind: IssueKind
    field: str
    label: str
    message: str
    values: list[str] = Field(default_factory=list)
    status: IssueStatus
    selected_value: str | None = None


class CasePacketDto(ApiModel):
    profile: CaseProfileDto
    evidence: list[EvidenceRowDto]
    issues: list[ReviewIssueDto]
    readiness: int
    next_action: str
    summary: str


class ChatRequestDto(ApiModel):
    state: ConversationStateDto
    message: str
    locale: str = "en"


class DocumentAnalyzeRequestDto(ApiModel):
    state: ConversationStateDto
    label: str
    text: str
    locale: str = "en"


class ResolveIssueRequestDto(ApiModel):
    state: ConversationStateDto
    selected_value: str
    locale: str = "en"


class CopilotResponseDto(ApiModel):
    state: ConversationStateDto
    packet: CasePacketDto
    assistant_message: ChatMessageDto
    quick_replies: list[str] = Field(default_factory=list)
