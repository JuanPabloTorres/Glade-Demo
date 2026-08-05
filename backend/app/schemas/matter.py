from datetime import datetime

from pydantic import Field

from app.domain.enums import CaseType, MatterStatus
from app.schemas.common import ApiModel


class MatterCreateDto(ApiModel):
    display_name: str = Field(min_length=2, max_length=200)
    case_type: CaseType
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    assigned_to: str | None = Field(default=None, max_length=200)


class MatterIntakeUpdateDto(ApiModel):
    display_name: str = Field(min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    date_of_birth: str | None = Field(default=None, max_length=30)
    summary: str | None = Field(default=None, max_length=3000)


class MatterSummaryDto(ApiModel):
    id: str
    display_name: str
    case_type: CaseType
    status: MatterStatus
    email: str | None
    phone: str | None
    assigned_to: str | None
    created_at: datetime
    open_conflicts: int
    readiness_score: int


class MatterDetailDto(ApiModel):
    id: str
    display_name: str
    case_type: CaseType
    status: MatterStatus
    email: str | None
    phone: str | None
    address: str | None
    date_of_birth: str | None
    assigned_to: str | None
    summary: str | None
    created_at: datetime
    updated_at: datetime
