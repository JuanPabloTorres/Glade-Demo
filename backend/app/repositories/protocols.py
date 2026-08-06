"""
Repository protocols — the abstractions services depend on (AGENTS.md rule
3: "Services depend on repositories, units of work, and provider
protocols—not concrete database or AI implementations."). Concrete
SQLAlchemy implementations live in `app.repositories.case_repository`,
`app.repositories.document_repository`, and `app.repositories.user_repository`.
"""

from __future__ import annotations

from typing import Protocol

from app.domain.entities import CaseDocumentEntity, CaseEntity, UserEntity
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

    def add_note(self, case_id: str, author_user_id: str, body: str) -> None: ...


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
