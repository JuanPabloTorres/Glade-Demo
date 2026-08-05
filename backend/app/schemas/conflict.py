from datetime import datetime

from pydantic import Field

from app.domain.enums import ConflictStatus
from app.schemas.common import ApiModel


class ConflictDto(ApiModel):
    id: str
    document_id: str | None
    field_name: str
    canonical_value: str
    conflicting_value: str
    canonical_source: str
    conflicting_source: str
    status: ConflictStatus
    resolved_value: str | None
    created_at: datetime


class ConflictResolveDto(ApiModel):
    selected_value: str = Field(min_length=1, max_length=1000)
