"""
SQLAlchemy implementation of `CaseRepositoryProtocol`. Translates between
`app.schemas.bankruptcy.BankruptcyCaseDto` (API boundary), the ORM models in
`app.repositories.orm_models` (storage), and `app.domain.entities` (reads).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.entities import (
    AssetEntryEntity,
    CaseDocumentEntity,
    CaseEntity,
    CaseNoteEntity,
    CaseTaskEntity,
    DebtEntryEntity,
    ExpenseEntryEntity,
    HouseholdEntity,
    IncomeEntryEntity,
    TimelineEventEntity,
)
from app.domain.value_objects import (
    CaseStatus,
    DebtType,
    EvidenceStatus,
    Frequency,
    TaskStatus,
    TimelineEventType,
)
from app.repositories.database import SessionDep
from app.repositories.orm_models import (
    CaseAssetModel,
    CaseDebtModel,
    CaseDocumentModel,
    CaseExpenseModel,
    CaseHouseholdModel,
    CaseIncomeModel,
    CaseModel,
    CaseNoteModel,
    CaseTaskModel,
    CaseTimelineModel,
)
from app.schemas.bankruptcy import BankruptcyCaseDto


def _ids_to_text(evidence_ids: list[str]) -> str:
    return ",".join(evidence_ids)


def _text_to_ids(value: str) -> tuple[str, ...]:
    return tuple(item for item in value.split(",") if item)


class SqlAlchemyCaseRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_owner_user_id(self, case_id: str) -> str | None:
        row = self._session.get(CaseModel, case_id)
        return row.owner_user_id if row is not None else None

    def get(self, case_id: str) -> CaseEntity | None:
        stmt = (
            select(CaseModel)
            .where(CaseModel.id == case_id)
            .options(
                selectinload(CaseModel.household),
                selectinload(CaseModel.incomes),
                selectinload(CaseModel.expenses),
                selectinload(CaseModel.debts),
                selectinload(CaseModel.assets),
                selectinload(CaseModel.documents),
                selectinload(CaseModel.tasks),
                selectinload(CaseModel.timeline),
                selectinload(CaseModel.notes),
            )
        )
        row = self._session.execute(stmt).scalar_one_or_none()
        return None if row is None else _to_entity(row)

    def upsert_case_snapshot(self, case: BankruptcyCaseDto, owner_user_id: str) -> CaseEntity:
        row = self._session.get(CaseModel, case.id)
        if row is None:
            row = CaseModel(id=case.id, owner_user_id=owner_user_id)
            self._session.add(row)

        row.owner_user_id = owner_user_id
        row.client_name = case.client_name
        row.client_email = case.client_email
        row.client_phone = case.client_phone
        row.preferred_language = case.preferred_language
        row.status = CaseStatus(case.status).value
        row.client_goal = case.client_goal
        row.attorney_notes = case.attorney_notes

        household = case.household
        if row.household is None:
            row.household = CaseHouseholdModel(case_id=case.id)
        row.household.marital_status = household.marital_status
        row.household.household_size = household.household_size
        row.household.dependents = household.dependents
        row.household.filing_jointly = household.filing_jointly
        row.household.housing_status = household.housing_status
        row.household.municipality = household.municipality
        row.household.urgent_collection_action = household.urgent_collection_action
        row.household.recent_property_transfer = household.recent_property_transfer

        row.incomes = [
            CaseIncomeModel(
                id=item.id,
                case_id=case.id,
                category=item.category,
                source=item.source,
                gross_amount=item.gross_amount,
                net_amount=item.net_amount,
                frequency=Frequency(item.frequency).value,
                evidence_ids=_ids_to_text(item.evidence_ids),
            )
            for item in case.incomes
        ]
        row.expenses = [
            CaseExpenseModel(
                id=item.id,
                case_id=case.id,
                category=item.category,
                description=item.description,
                monthly_amount=item.monthly_amount,
                essential=item.essential,
                evidence_ids=_ids_to_text(item.evidence_ids),
            )
            for item in case.expenses
        ]
        row.debts = [
            CaseDebtModel(
                id=item.id,
                case_id=case.id,
                creditor=item.creditor,
                debt_type=DebtType(item.debt_type).value,
                description=item.description,
                balance=item.balance,
                monthly_payment=item.monthly_payment,
                delinquent_amount=item.delinquent_amount,
                collateral=item.collateral,
                collection_lawsuit=item.collection_lawsuit,
                evidence_ids=_ids_to_text(item.evidence_ids),
            )
            for item in case.debts
        ]
        row.assets = [
            CaseAssetModel(
                id=item.id,
                case_id=case.id,
                category=item.category,
                description=item.description,
                estimated_value=item.estimated_value,
                loan_balance=item.loan_balance,
                jointly_owned=item.jointly_owned,
                evidence_ids=_ids_to_text(item.evidence_ids),
            )
            for item in case.assets
        ]
        row.documents = [
            CaseDocumentModel(
                id=item.id,
                case_id=case.id,
                filename=item.name,
                evidence_type=item.evidence_type,
                status=EvidenceStatus(item.status).value,
                chunk_count=0,
            )
            for item in case.evidence
        ]

        self._session.flush()
        self._session.refresh(row)
        return _to_entity(row)

    def record_timeline_event(self, case_id: str, event_type: str, message: str) -> None:
        self._session.add(
            CaseTimelineModel(
                case_id=case_id,
                event_type=TimelineEventType(event_type).value,
                message=message,
            )
        )

    def add_note(self, case_id: str, author_user_id: str, body: str) -> None:
        self._session.add(
            CaseNoteModel(case_id=case_id, author_user_id=author_user_id, body=body)
        )

    def add_task(self, case_id: str, title: str) -> CaseTaskEntity:
        row = CaseTaskModel(case_id=case_id, title=title, status=TaskStatus.OPEN.value)
        self._session.add(row)
        self._session.flush()
        self._session.refresh(row)
        return CaseTaskEntity(
            id=row.id, case_id=row.case_id, title=row.title,
            status=TaskStatus(row.status), created_at=row.created_at,
        )


def _to_entity(row: CaseModel) -> CaseEntity:
    household = row.household
    return CaseEntity(
        id=row.id,
        owner_user_id=row.owner_user_id,
        client_name=row.client_name,
        client_email=row.client_email,
        client_phone=row.client_phone,
        preferred_language=row.preferred_language,
        status=CaseStatus(row.status),
        client_goal=row.client_goal,
        attorney_notes=row.attorney_notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
        household=HouseholdEntity(
            case_id=row.id,
            marital_status=household.marital_status if household else None,
            household_size=household.household_size if household else 1,
            dependents=household.dependents if household else 0,
            filing_jointly=household.filing_jointly if household else False,
            housing_status=household.housing_status if household else None,
            municipality=household.municipality if household else None,
            urgent_collection_action=household.urgent_collection_action if household else False,
            recent_property_transfer=household.recent_property_transfer if household else False,
        ),
        incomes=tuple(
            IncomeEntryEntity(
                id=item.id, case_id=item.case_id, category=item.category, source=item.source,
                gross_amount=item.gross_amount, net_amount=item.net_amount,
                frequency=Frequency(item.frequency), evidence_ids=_text_to_ids(item.evidence_ids),
            )
            for item in row.incomes
        ),
        expenses=tuple(
            ExpenseEntryEntity(
                id=item.id, case_id=item.case_id, category=item.category,
                description=item.description, monthly_amount=item.monthly_amount,
                essential=item.essential, evidence_ids=_text_to_ids(item.evidence_ids),
            )
            for item in row.expenses
        ),
        debts=tuple(
            DebtEntryEntity(
                id=item.id, case_id=item.case_id, creditor=item.creditor,
                debt_type=DebtType(item.debt_type), description=item.description,
                balance=item.balance, monthly_payment=item.monthly_payment,
                delinquent_amount=item.delinquent_amount, collateral=item.collateral,
                collection_lawsuit=item.collection_lawsuit,
                evidence_ids=_text_to_ids(item.evidence_ids),
            )
            for item in row.debts
        ),
        assets=tuple(
            AssetEntryEntity(
                id=item.id, case_id=item.case_id, category=item.category,
                description=item.description, estimated_value=item.estimated_value,
                loan_balance=item.loan_balance, jointly_owned=item.jointly_owned,
                evidence_ids=_text_to_ids(item.evidence_ids),
            )
            for item in row.assets
        ),
        documents=tuple(
            CaseDocumentEntity(
                id=item.id, case_id=item.case_id, filename=item.filename,
                evidence_type=item.evidence_type, status=EvidenceStatus(item.status),
                chunk_count=item.chunk_count, created_at=item.created_at,
            )
            for item in row.documents
        ),
        tasks=tuple(
            CaseTaskEntity(
                id=item.id, case_id=item.case_id, title=item.title,
                status=TaskStatus(item.status), created_at=item.created_at,
            )
            for item in row.tasks
        ),
        timeline=tuple(
            TimelineEventEntity(
                id=item.id, case_id=item.case_id, event_type=TimelineEventType(item.event_type),
                message=item.message, created_at=item.created_at,
            )
            for item in row.timeline
        ),
        notes=tuple(
            CaseNoteEntity(
                id=item.id, case_id=item.case_id, author_user_id=item.author_user_id,
                body=item.body, created_at=item.created_at,
            )
            for item in row.notes
        ),
    )


def get_case_repository(session: SessionDep) -> SqlAlchemyCaseRepository:
    return SqlAlchemyCaseRepository(session)


CaseRepositoryDep = Annotated[SqlAlchemyCaseRepository, Depends(get_case_repository)]
