from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.bankruptcy import CaseStatus, UserRole
from app.schemas.common import ApiModel

AssistantActionType = Literal[
    "navigate",
    "open_modal",
    "upload_document",
    "update_case",
    "request_document",
    "create_note",
    # Deliberate extension beyond master instruction §6.5's example list: the
    # existing chat already offers follow-up prompts the user can send
    # verbatim as their next message (chapter-comparison questions, discussion
    # points, next steps). None of the six spec'd action types describe "send
    # this suggested message" — forcing it into "navigate" would be
    # misleading, so it gets its own type instead of silently dropping the
    # (real, working) quick-reply UX. Still renders as a Flowbite Button+icon
    # per §6.5's rendering rule; only the semantics of `target` differ (unused).
    "ask",
]


class AssistantAction(ApiModel):
    """A single actionable suggestion the frontend renders as a Flowbite Button + icon (§6.5)."""

    id: str
    label: str
    icon: str
    action_type: AssistantActionType
    target: str | None = None


class AssistantResponse(ApiModel):
    """
    Structured assistant turn per master instruction §6.5. Replaces the
    narrower GuidanceResponseDto (reply/suggested_actions: list[str]/
    focus_section/disclaimer) — this is the 3.0.0 contract-breaking change
    the refactor plan flagged: `message` replaces `reply`, and
    `suggested_actions` is now a list of structured AssistantAction objects
    instead of bare strings.
    """

    message: str
    intent: str
    suggested_actions: list[AssistantAction] = Field(default_factory=list)
    focus_section: str | None = None
    requested_fields: list[str] = Field(default_factory=list)
    requested_documents: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    summary_updates: list[str] = Field(default_factory=list)
    requires_attorney_review: bool = False
    confidence: float | None = None
    disclaimer: str


class CaseContextDto(ApiModel):
    """
    Reduced, audited context handed to AI providers — never the raw case
    object (master instruction §6.2/§6.3 "Crea un CaseContextBuilder que
    produzca un contexto reducido, tipado y auditable"). Household detail is
    summarized to a short string rather than exposing raw address/
    municipality fields; attorney_notes is populated only when the current
    role is "attorney" (per-role redaction, §6.2 "notas permitidas según
    rol" and §8.2 "aplicar redacción cuando se use contexto AI").

    Documented gap: §6.2 also lists "timeline" and "solicitudes abiertas"
    as context fields. `BankruptcyCaseDto` (the request payload this is
    built from) has no `timeline`/`messages` fields at all today — the
    backend is stateless and the frontend never sends them (see
    docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md, "no persistence layer").
    `pending_documents` (evidence with status "requested") is the one
    "open request" concept this endpoint can actually see; a real timeline
    in context requires the case payload to carry it, which is a separate,
    larger contract change tied to persistence — not done here.
    """

    case_id: str
    role: UserRole
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
