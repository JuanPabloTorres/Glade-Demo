"""
Domain entities — persistence-agnostic representations of the case
aggregate. These are what `app.repositories` return on reads; they are
deliberately **not** the ORM models in `app.repositories.orm_models` (so the
domain layer never leaks SQLAlchemy `Mapped`/`Session` details upward) and
**not** the pydantic DTOs in `app.schemas` (so the API boundary never leaks
ORM-adjacent concerns downward, per AGENTS.md rule 4: "Use DTOs at API
boundaries. Never expose ORM entities directly.").

Repositories are the only code allowed to translate between these three
shapes: ORM model <-> domain entity <-> API DTO.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.domain.value_objects import (
    CaseStatus,
    ConversationRole,
    DebtType,
    EvidenceStatus,
    Frequency,
    TaskStatus,
    TimelineEventType,
    UserRole,
)


@dataclass(frozen=True, slots=True)
class UserEntity:
    id: str
    email: str
    name: str
    role: UserRole
    preferred_language: str = "es"


@dataclass(frozen=True, slots=True)
class HouseholdEntity:
    case_id: str
    marital_status: str | None = None
    household_size: int = 1
    dependents: int = 0
    filing_jointly: bool = False
    housing_status: str | None = None
    municipality: str | None = None
    urgent_collection_action: bool = False
    recent_property_transfer: bool = False


@dataclass(frozen=True, slots=True)
class IncomeEntryEntity:
    id: str
    case_id: str
    category: str
    source: str
    gross_amount: float
    net_amount: float | None
    frequency: Frequency
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ExpenseEntryEntity:
    id: str
    case_id: str
    category: str
    description: str
    monthly_amount: float
    essential: bool
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class DebtEntryEntity:
    id: str
    case_id: str
    creditor: str
    debt_type: DebtType
    description: str
    balance: float
    monthly_payment: float
    delinquent_amount: float
    collateral: str | None
    collection_lawsuit: bool
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class AssetEntryEntity:
    id: str
    case_id: str
    category: str
    description: str
    estimated_value: float
    loan_balance: float
    jointly_owned: bool
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class CaseDocumentEntity:
    """
    Backs `case_documents`. Distinct from the in-memory RAG chunk index
    (`app.services.documents.index.CaseDocumentIndex`) — this row is the
    durable record that a document was submitted for a case (filename,
    classified evidence type, extraction stats); the RAG index remains the
    in-process vector store for chunk retrieval, unchanged by this task.
    """

    id: str
    case_id: str
    filename: str
    evidence_type: str
    status: EvidenceStatus
    chunk_count: int
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CaseTaskEntity:
    id: str
    case_id: str
    title: str
    status: TaskStatus
    created_at: datetime


@dataclass(frozen=True, slots=True)
class TimelineEventEntity:
    id: str
    case_id: str
    event_type: TimelineEventType
    message: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CaseNoteEntity:
    id: str
    case_id: str
    author_user_id: str
    body: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class AIConversationMessageEntity:
    """
    Backs the `ai_conversations` stub table (case_id/role/message/created_at
    only, per this task's scope). Not yet read back into
    `CaseContextBuilder` — that wiring is a separate, parallel/future step;
    see `app.repositories.orm_models.AIConversationModel` docstring.
    """

    id: str
    case_id: str
    role: ConversationRole
    message: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CaseEntity:
    """The case aggregate root. `owner_user_id` is the field the whole
    ownership-authorization gap (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md
    §3/§5) was about: it now traces to a real, persisted row instead of a
    client-submitted, never-checked DTO field."""

    id: str
    owner_user_id: str
    client_name: str
    client_email: str
    client_phone: str | None
    preferred_language: str
    status: CaseStatus
    client_goal: str | None
    attorney_notes: str | None
    created_at: datetime
    updated_at: datetime
    household: HouseholdEntity
    incomes: tuple[IncomeEntryEntity, ...] = ()
    expenses: tuple[ExpenseEntryEntity, ...] = ()
    debts: tuple[DebtEntryEntity, ...] = ()
    assets: tuple[AssetEntryEntity, ...] = ()
    documents: tuple[CaseDocumentEntity, ...] = ()
    tasks: tuple[CaseTaskEntity, ...] = ()
    timeline: tuple[TimelineEventEntity, ...] = ()
    notes: tuple[CaseNoteEntity, ...] = ()
