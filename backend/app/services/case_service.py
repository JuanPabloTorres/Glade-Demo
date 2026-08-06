from fastapi import HTTPException, status

from app.domain.enums import INTAKE_SECTION_ORDER, CaseStatus, IntakeSectionKey, UserRole
from app.domain.models import BankruptcyCase, IntakeSection, User
from app.repositories.case_repository import CaseRepository
from app.repositories.user_repository import UserRepository
from app.schemas.cases import CaseCreate, CaseUpdate, SectionUpsert


class CaseService:
    def __init__(self, cases: CaseRepository, users: UserRepository) -> None:
        self.cases = cases
        self.users = users

    def list_cases(self, current_user: User) -> list[BankruptcyCase]:
        if current_user.role == UserRole.APPLICANT:
            return self.cases.list_for_applicant(current_user.id)
        return self.cases.list_all_with_sections()

    def create_case(self, payload: CaseCreate, current_user: User) -> BankruptcyCase:
        applicant_id = current_user.id
        if current_user.role != UserRole.APPLICANT:
            if not payload.applicant_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="applicant_id is required for staff-created cases",
                )
            applicant = self.users.get(payload.applicant_id)
            if not applicant or applicant.role != UserRole.APPLICANT:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Applicant not found",
                )
            applicant_id = applicant.id
        case = BankruptcyCase(
            applicant_id=applicant_id,
            title=payload.title,
            preferred_language=payload.preferred_language,
        )
        self.cases.db.add(case)
        self.cases.db.flush()
        for key in INTAKE_SECTION_ORDER:
            self.cases.db.add(IntakeSection(case_id=case.id, section_key=key, data={}))
        self.cases.db.commit()
        return self.get_case(case.id, current_user)

    def get_case(self, case_id: str, current_user: User) -> BankruptcyCase:
        case = self.cases.get_with_sections(case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        self._ensure_access(case, current_user)
        return case

    def update_case(
        self, case_id: str, payload: CaseUpdate, current_user: User
    ) -> BankruptcyCase:
        case = self.get_case(case_id, current_user)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(case, field, value)
        return self.cases.save(case)

    def upsert_section(
        self,
        case_id: str,
        section_key: IntakeSectionKey,
        payload: SectionUpsert,
        current_user: User,
    ) -> BankruptcyCase:
        case = self.get_case(case_id, current_user)
        section = self.cases.get_section(case_id, section_key)
        if not section:
            section = IntakeSection(case_id=case_id, section_key=section_key)
        section.data = payload.data
        section.completed = payload.completed
        self.cases.db.add(section)
        self.cases.db.flush()
        self._recalculate(case)
        self.cases.db.commit()
        return self.get_case(case_id, current_user)

    def delete_case(self, case_id: str, current_user: User) -> None:
        case = self.get_case(case_id, current_user)
        if current_user.role == UserRole.APPLICANT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        self.cases.delete(case)

    def _recalculate(self, case: BankruptcyCase) -> None:
        sections = list(case.sections)
        completed = sum(1 for section in sections if section.completed)
        total = max(len(INTAKE_SECTION_ORDER), 1)
        case.progress = round((completed / total) * 100)
        case.readiness_score = max(0, min(100, case.progress - self._data_quality_penalty(sections)))
        incomplete_indexes = [
            index for index, key in enumerate(INTAKE_SECTION_ORDER)
            if not any(section.section_key == key and section.completed for section in sections)
        ]
        case.current_step = incomplete_indexes[0] if incomplete_indexes else total - 1
        if case.progress == 100:
            case.status = CaseStatus.READY_FOR_REVIEW
        elif case.progress > 0:
            case.status = CaseStatus.IN_PROGRESS

    @staticmethod
    def _data_quality_penalty(sections: list[IntakeSection]) -> int:
        penalty = 0
        for section in sections:
            if section.completed and not section.data:
                penalty += 5
        return penalty

    @staticmethod
    def _ensure_access(case: BankruptcyCase, current_user: User) -> None:
        if current_user.role == UserRole.APPLICANT and case.applicant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
