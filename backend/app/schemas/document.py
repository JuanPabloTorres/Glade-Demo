from datetime import datetime

from pydantic import Field

from app.domain.enums import DocumentStatus, DocumentType
from app.schemas.common import ApiModel


class DocumentCreateDto(ApiModel):
    original_name: str = Field(min_length=1, max_length=255)
    document_type: DocumentType
    content: str = Field(min_length=1, max_length=20000)


class ExtractedFactDto(ApiModel):
    id: str
    field_name: str
    value: str
    source_type: str
    source_label: str
    is_current: bool


class DocumentDto(ApiModel):
    id: str
    original_name: str
    document_type: DocumentType
    status: DocumentStatus
    created_at: datetime
    facts: list[ExtractedFactDto] = Field(default_factory=list)
