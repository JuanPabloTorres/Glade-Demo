"""
Domain value objects — the single source of truth for every fixed-vocabulary
string used by the persistence layer (AGENTS.md rule 6: "Do not introduce
magic endpoint strings, status strings, case-type strings, or document-type
strings.").

These mirror the `Literal[...]` unions already declared in
`app.schemas.bankruptcy` / `app.schemas.assistant` (the API-boundary DTOs),
but exist independently in the domain layer so that:
  - `app.repositories.orm_models` can validate/constrain column values
    without importing pydantic schemas into the persistence layer.
  - New persistence-only concepts that never existed in the DTOs (task
    status, timeline event type) still get a single named enum instead of
    ad-hoc strings scattered across repositories/seed scripts.

If a DTO Literal ever changes, update the matching enum here in the same
change — they are intentionally kept in lockstep, not derived from one
another, to avoid a schemas -> domain import (the domain layer must not
depend on the API boundary layer).
"""

from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    CLIENT = "client"
    ATTORNEY = "attorney"


class CaseStatus(StrEnum):
    DRAFT = "draft"
    COLLECTING_INFORMATION = "collecting_information"
    SUBMITTED = "submitted"
    ATTORNEY_REVIEW = "attorney_review"
    CONSULTATION_SCHEDULED = "consultation_scheduled"
    DECISION_PENDING = "decision_pending"
    FILING_PREPARATION = "filing_preparation"
    CLOSED = "closed"


class Frequency(StrEnum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    SEMIMONTHLY = "semimonthly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class DebtType(StrEnum):
    SECURED = "secured"
    PRIORITY = "priority"
    UNSECURED = "unsecured"


class EvidenceStatus(StrEnum):
    MISSING = "missing"
    REQUESTED = "requested"
    RECEIVED = "received"
    REVIEWED = "reviewed"


class TaskStatus(StrEnum):
    """Persistence-only concept — no DTO equivalent exists yet."""

    OPEN = "open"
    DONE = "done"
    DISMISSED = "dismissed"


class TimelineEventType(StrEnum):
    """Persistence-only concept — no DTO equivalent exists yet."""

    CASE_CREATED = "case_created"
    CASE_UPDATED = "case_updated"
    ANALYSIS_RUN = "analysis_run"
    GUIDANCE_REQUESTED = "guidance_requested"
    DOCUMENT_INGESTED = "document_ingested"


class ConversationRole(StrEnum):
    """ai_conversations.role — stub table, see app.repositories.orm_models."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
