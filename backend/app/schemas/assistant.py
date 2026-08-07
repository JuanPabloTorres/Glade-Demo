from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.bankruptcy import CaseStatus, UserRole
from app.schemas.common import ApiModel


class TimelineEventDto(ApiModel):
    """One case-timeline entry, reduced for AI context. Closes the
    "no timeline in context" gap this schema previously documented — see
    docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4. Sourced from
    `app.repositories.case_repository.SqlAlchemyCaseRepository
    .get_recent_timeline`, capped to a small recent window by the caller
    (`CaseContextBuilder.build`), not a full audit dump."""

    event_type: str
    message: str
    created_at: str


class ConversationTurnDto(ApiModel):
    """One prior guidance-chat turn, read back from the `ai_conversations`
    table so a new reply can be aware of what was already discussed for this
    case. Closes the "no persisted conversation history" gap this schema
    previously documented. Case-scoped, not role-scoped — see
    `app.repositories.protocols.AIConversationRepositoryProtocol`'s
    docstring for the known limitation."""

    role: str
    message: str


class CaseContextDto(ApiModel):
    """
    Reduced, audited context handed to AI providers — never the raw case
    object (master instruction §6.2/§6.3 "Crea un CaseContextBuilder que
    produzca un contexto reducido, tipado y auditable"). Household detail is
    summarized to a short string rather than exposing raw address/
    municipality fields; attorney_notes is populated only when the current
    role is "attorney" (per-role redaction, §6.2 "notas permitidas según
    rol" and §8.2 "aplicar redacción cuando se use contexto AI").

    `timeline`, `recent_conversation`, and `retrieved_documents` close the
    gaps this docstring used to describe as open (see
    docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4):
      - `timeline`: the case's last ~10 timeline events, from the real
        `case_timeline` table (`CaseRepository.get_recent_timeline`).
      - `recent_conversation`: the last few guidance-chat turns for this
        case, from the real `ai_conversations` table
        (`AIConversationRepository.list_recent`) — populated server-side,
        keyed by `case_id`, even though `GuidanceRequestDto` only ever
        carries the current `message` (no frontend change required).
      - `retrieved_documents`: the top RAG matches for the current message
        from `CaseDocumentIndex.search()` (`services/documents/index.py`),
        previously indexed-but-never-queried dead code.
    All three are populated by `BankruptcyGuidanceService.guide()` before
    the context reaches the provider; a provider may only let them influence
    `draft.message` phrasing, never `intent`/`suggested_actions`/
    `focus_section`/`requires_attorney_review` (those stay rule-based).
    """

    case_id: str
    role: UserRole
    locale: str
    language: Literal["es", "en"]
    status: CaseStatus
    client_name: str
    objective: str | None
    household_summary: str
    monthly_gross_income: float
    monthly_net_income: float
    monthly_expenses: float
    monthly_cash_flow: float
    total_debt: float
    total_asset_value: float
    completion_score: int
    evidence_score: int
    missing_items: list[str]
    warnings: list[str]
    discussion_points: list[str]
    chapter_7_questions: list[str]
    chapter_13_questions: list[str]
    next_steps: list[str]
    pending_documents: list[str]
    attorney_notes: str | None
    timeline: list[TimelineEventDto] = Field(default_factory=list)
    recent_conversation: list[ConversationTurnDto] = Field(default_factory=list)
    retrieved_documents: list[str] = Field(default_factory=list)
