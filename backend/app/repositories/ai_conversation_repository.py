"""
SQLAlchemy implementation of `AIConversationRepositoryProtocol`. Backs the
`ai_conversations` stub table (see `app.repositories.orm_models
.AIConversationModel` docstring) — the first code path that actually reads
or writes it. Closes the "no persisted conversation history in AI context"
gap from docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4, wired
through `app.services.bankruptcy_service.BankruptcyGuidanceService.guide`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import AIConversationMessageEntity
from app.domain.value_objects import ConversationRole
from app.repositories.database import SessionDep
from app.repositories.orm_models import AIConversationModel


class SqlAlchemyAIConversationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add_turn(self, case_id: str, role: ConversationRole, message: str) -> None:
        self._session.add(
            AIConversationModel(case_id=case_id, role=role.value, message=message)
        )

    def list_recent(self, case_id: str, limit: int = 6) -> list[AIConversationMessageEntity]:
        # Isolation by construction, same WHERE-clause pattern as
        # DocumentRepository.list_for_case / CaseRepository.get_recent_timeline
        # — no code path here can return another case's conversation turns.
        # (Role-scoping within the same case is a separate, documented,
        # not-yet-closed gap — see AIConversationRepositoryProtocol's
        # docstring.)
        stmt = (
            select(AIConversationModel)
            .where(AIConversationModel.case_id == case_id)
            .order_by(AIConversationModel.created_at.desc())
            .limit(limit)
        )
        rows = self._session.execute(stmt).scalars().all()
        return [
            AIConversationMessageEntity(
                id=row.id,
                case_id=row.case_id,
                role=ConversationRole(row.role),
                message=row.message,
                created_at=row.created_at,
            )
            for row in reversed(rows)
        ]


def get_ai_conversation_repository(session: SessionDep) -> SqlAlchemyAIConversationRepository:
    return SqlAlchemyAIConversationRepository(session)


AIConversationRepositoryDep = Annotated[
    SqlAlchemyAIConversationRepository, Depends(get_ai_conversation_repository)
]
