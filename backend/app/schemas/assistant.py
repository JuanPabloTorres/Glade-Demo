from pydantic import BaseModel, Field

from app.domain.enums import PreferredLanguage


class AssistantMessage(BaseModel):
    case_id: str
    message: str = Field(min_length=1, max_length=4000)
    language: PreferredLanguage | None = None


class AssistantReply(BaseModel):
    message: str
    language: PreferredLanguage
    disclaimer: str
    missing_sections: list[str]
