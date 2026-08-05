from __future__ import annotations

from pydantic import Field

from app.ai.guardrails import DataProvenance
from app.schemas.common import ApiModel


class DocumentAnalysisRequestDto(ApiModel):
    case_id: str
    filename: str
    content_base64: str


class ExtractedAmountDto(ApiModel):
    label: str
    amount: float
    provenance: DataProvenance


class DocumentAnalysisResponseDto(ApiModel):
    evidence_type: str
    extracted_text_preview: str
    extracted_amounts: list[ExtractedAmountDto] = Field(default_factory=list)
    chunk_count: int
