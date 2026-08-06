from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.enums import IntakeSectionKey
from app.domain.models import BankruptcyCase, IntakeSection
from app.repositories.base import BaseRepository


class CaseRepository(BaseRepository[BankruptcyCase]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, BankruptcyCase)

    def get_with_sections(self, case_id: str) -> BankruptcyCase | None:
        statement = (
            select(BankruptcyCase)
            .options(selectinload(BankruptcyCase.sections))
            .where(BankruptcyCase.id == case_id)
        )
        return self.db.scalar(statement)

    def list_for_applicant(self, applicant_id: str) -> list[BankruptcyCase]:
        statement = (
            select(BankruptcyCase)
            .options(selectinload(BankruptcyCase.sections))
            .where(BankruptcyCase.applicant_id == applicant_id)
            .order_by(BankruptcyCase.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def list_all_with_sections(self) -> list[BankruptcyCase]:
        statement = (
            select(BankruptcyCase)
            .options(selectinload(BankruptcyCase.sections))
            .order_by(BankruptcyCase.updated_at.desc())
        )
        return list(self.db.scalars(statement))

    def get_section(self, case_id: str, section_key: IntakeSectionKey) -> IntakeSection | None:
        statement = select(IntakeSection).where(
            IntakeSection.case_id == case_id, IntakeSection.section_key == section_key
        )
        return self.db.scalar(statement)

    def save(self, case: BankruptcyCase) -> BankruptcyCase:
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case
