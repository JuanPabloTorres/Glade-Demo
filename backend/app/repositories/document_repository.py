"""
SQLAlchemy implementation of `DocumentRepositoryProtocol`. Backs the
`case_documents` audit trail (see `CaseDocumentModel` docstring for how this
differs from the in-process RAG chunk index).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import CaseDocumentEntity
from app.domain.value_objects import EvidenceStatus
from app.repositories.database import SessionDep
from app.repositories.orm_models import CaseDocumentModel


class SqlAlchemyDocumentRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add_document(
        self,
        case_id: str,
        filename: str,
        evidence_type: str,
        chunk_count: int,
    ) -> CaseDocumentEntity:
        row = CaseDocumentModel(
            case_id=case_id,
            filename=filename,
            evidence_type=evidence_type,
            status=EvidenceStatus.RECEIVED.value,
            chunk_count=chunk_count,
        )
        self._session.add(row)
        self._session.flush()
        self._session.refresh(row)
        return CaseDocumentEntity(
            id=row.id,
            case_id=row.case_id,
            filename=row.filename,
            evidence_type=row.evidence_type,
            status=EvidenceStatus(row.status),
            chunk_count=row.chunk_count,
            created_at=row.created_at,
        )

    def list_for_case(self, case_id: str) -> list[CaseDocumentEntity]:
        # Isolation by construction (docs/audits/GLADE-DEMO-GROUNDED-STATE-
        # 2026-08-06.md's RAG-index isolation note applies here too): the
        # WHERE clause is the only source of case scoping, mirroring
        # CaseDocumentIndex's per-case dict bucket — no code path returns
        # another case's document rows.
        stmt = select(CaseDocumentModel).where(CaseDocumentModel.case_id == case_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            CaseDocumentEntity(
                id=row.id,
                case_id=row.case_id,
                filename=row.filename,
                evidence_type=row.evidence_type,
                status=EvidenceStatus(row.status),
                chunk_count=row.chunk_count,
                created_at=row.created_at,
            )
            for row in rows
        ]


def get_document_repository(session: SessionDep) -> SqlAlchemyDocumentRepository:
    return SqlAlchemyDocumentRepository(session)


DocumentRepositoryDep = Annotated[SqlAlchemyDocumentRepository, Depends(get_document_repository)]
