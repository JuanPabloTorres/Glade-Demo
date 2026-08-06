from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class HealthDto(ApiModel):
    status: str
    service: str
    version: str


class AIHealthDto(ApiModel):
    status: str
    provider: str
    model: str
    available: bool


class ActivityDto(ApiModel):
    id: str
    event_type: str
    message: str
    created_at: datetime
