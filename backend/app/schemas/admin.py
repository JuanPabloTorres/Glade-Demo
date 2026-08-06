from __future__ import annotations

from app.schemas.common import ApiModel


class DemoResetResultDto(ApiModel):
    status: str
    case_id: str
