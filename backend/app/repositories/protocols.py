"""
Repository protocols — the abstractions services depend on (AGENTS.md rule
3: "Services depend on repositories, units of work, and provider
protocols—not concrete database or AI implementations."). Concrete
SQLAlchemy implementations live in `app.repositories.case_repository`,
`app.repositories.document_repository`, and `app.repositories.user_repository`.
"""

from __future__ import annotations

from typing import Protocol

from app.domain.entities import (
    AIConversationMessageEntity,
    CaseDocumentEntity,
    CaseEntity,
    CasePortfolioEntry,
    TimelineEventEntity,
    UserEntity,
)
from app.domain.value_objects import ConversationRole
from app.schemas.bankruptcy import BankruptcyCaseDto


class CaseRepositoryProtocol(Protocol):
    def get_owner_user_id(self, case_id: str) -> str | None:
        """Returns the persisted owner, or None if the case has never been
        submitted before. This is the ground truth ownership checks compare
        against — never a client-submitted DTO field."""
        ...

    def get(self, case_id: str) -> CaseEntity | None: ...

    def upsert_case_snapshot(self, case: BankruptcyCaseDto, owner_user_id: str) -> CaseEntity:
        """Persist the full case payload as submitted (household, incomes,
        expenses, debts, assets, evidence) under the given, already-
        authorized owner_user_id."""
        ...

    def record_timeline_event(self, case_id: str, event_type: str, message: str) -> None: ...

    def get_recent_timeline(self, case_id: str, limit: int = 10) -> list[TimelineEventEntity]:
        """Most recent timeline events for `case_id`, oldest-first, capped at
        `limit`. Backs `CaseContextDto.timeline` — see
        `app.services.case_context_builder.CaseContextBuilder.build`. Isolated
        by construction: the WHERE clause is the only source of case scoping,
        same pattern as `DocumentRepositoryProtocol.list_for_case`."""
        ...

    def add_note(self, case_id: str, author_user_id: str, body: str) -> None: ...

    def list_portfolio(self) -> list[CasePortfolioEntry]:
        """Triage-shaped summaries of every persisted case, cheapest form.

        Deliberately not `list[CaseEntity]`: a portfolio question needs to rank
        cases, not read them, and hydrating every income, expense, debt, asset
        and evidence row for a list view would put a client's full finances in
        memory — and, once an agent tool is layered on top, in a model's
        context — to answer "which of these needs attention".

        Authorization is NOT performed here. The caller resolves who may see
        what; this returns what exists. See `CaseAccessService.attorney_portfolio`.
        """
        ...


class DocumentRepositoryProtocol(Protocol):
    def add_document(
        self,
        case_id: str,
        filename: str,
        evidence_type: str,
        chunk_count: int,
    ) -> CaseDocumentEntity: ...

    def list_for_case(self, case_id: str) -> list[CaseDocumentEntity]: ...


class UserRepositoryProtocol(Protocol):
    def get(self, user_id: str) -> UserEntity | None: ...

    def upsert(self, user: UserEntity) -> UserEntity: ...


class AIConversationRepositoryProtocol(Protocol):
    """
    Backs the `ai_conversations` stub table (see
    `app.repositories.orm_models.AIConversationModel` docstring) — the first
    code path to actually read/write it, closing the "no persisted
    conversation history" gap from
    docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4.

    Known scope limit: the table only carries case_id/role/message/
    created_at, not which *human role* (client vs. attorney) authored a
    "user" turn. `list_recent` is therefore case-scoped, not
    role-scoped — if both a client and their attorney message the assistant
    about the same case, history is shared between them. This is a lower-
    severity gap than `attorney_notes` redaction (guidance-chat turns are
    operational Q&A about the shared case, not confidential attorney work
    product), but it is a real, not-yet-closed gap; a future
    `acting_role`/`author_user_id` column would close it properly.
    """

    def add_turn(self, case_id: str, role: ConversationRole, message: str) -> None: ...

    def list_recent(
        self, case_id: str, limit: int = 6
    ) -> list[AIConversationMessageEntity]: ...
