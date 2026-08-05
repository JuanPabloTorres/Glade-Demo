from datetime import date, datetime
from typing import Any

from pydantic import Field, field_validator

from app.domain.enums import CaseType, MatterStatus
from app.schemas.common import ApiModel


class MatterCreateDto(ApiModel):
    display_name: str = Field(min_length=2, max_length=200)
    case_type: CaseType
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    assigned_to: str | None = Field(default=None, max_length=200)

    @field_validator("email", "phone", "assigned_to", mode="before")
    @classmethod
    def blank_to_none(cls, value: Any) -> Any:
        return None if isinstance(value, str) and not value.strip() else value


class MatterIntakeUpdateDto(ApiModel):
    display_name: str = Field(min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    date_of_birth: str | None = Field(default=None, max_length=30)
    summary: str | None = Field(default=None, max_length=3000)

    @field_validator("email", "phone", "address", "date_of_birth", "summary", mode="before")
    @classmethod
    def blank_to_none(cls, value: Any) -> Any:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("date_of_birth must use YYYY-MM-DD format") from exc
        if parsed > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return parsed.isoformat()


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
