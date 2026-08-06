"""
Persistence layer — real SQLAlchemy repositories, previously an empty
placeholder package (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3).
"""

from app.repositories.case_repository import CaseRepositoryDep, SqlAlchemyCaseRepository
from app.repositories.document_repository import (
    DocumentRepositoryDep,
    SqlAlchemyDocumentRepository,
)
from app.repositories.protocols import (
    CaseRepositoryProtocol,
    DocumentRepositoryProtocol,
    UserRepositoryProtocol,
)
from app.repositories.user_repository import SqlAlchemyUserRepository, UserRepositoryDep

__all__ = [
    "CaseRepositoryDep",
    "CaseRepositoryProtocol",
    "DocumentRepositoryDep",
    "DocumentRepositoryProtocol",
    "SqlAlchemyCaseRepository",
    "SqlAlchemyDocumentRepository",
    "SqlAlchemyUserRepository",
    "UserRepositoryDep",
    "UserRepositoryProtocol",
]
