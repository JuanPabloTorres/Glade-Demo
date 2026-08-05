from types import TracebackType

from sqlalchemy.orm import Session

from app.repositories.matter_repository import (
    ActivityRepository,
    ConflictRepository,
    DocumentRepository,
    FactRepository,
    MatterRepository,
)


class SqlAlchemyUnitOfWork:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.matters = MatterRepository(session)
        self.documents = DocumentRepository(session)
        self.facts = FactRepository(session)
        self.conflicts = ConflictRepository(session)
        self.activities = ActivityRepository(session)

    def __enter__(self) -> "SqlAlchemyUnitOfWork":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if exc is not None:
            self.rollback()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()

    def flush(self) -> None:
        self.session.flush()
