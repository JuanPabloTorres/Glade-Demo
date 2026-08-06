from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import CaseStatus, IntakeSectionKey, PreferredLanguage


class IntakeSectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section_key: IntakeSectionKey
    data: dict[str, Any]
    completed: bool
    updated_at: datetime


class CaseCreate(BaseModel):
    applicant_id: str | None = None
    title: str = Field(default="Chapter 7 Intake", min_length=3, max_length=180)
    preferred_language: PreferredLanguage = PreferredLanguage.ES


class CaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    status: CaseStatus | None = None
    preferred_language: PreferredLanguage | None = None
    summary: str | None = Field(default=None, max_length=5000)


class SectionUpsert(BaseModel):
    data: dict[str, Any]
    completed: bool = False


class CaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    applicant_id: str
    title: str
    status: CaseStatus
    preferred_language: PreferredLanguage
    current_step: int
    progress: int
    readiness_score: int
    summary: str
    created_at: datetime
    updated_at: datetime
    sections: list[IntakeSectionRead] = Field(default_factory=list)
