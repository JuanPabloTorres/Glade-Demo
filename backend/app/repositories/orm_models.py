"""
SQLAlchemy declarative models — the real schema behind
`docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md`'s "no database of any
kind is wired up" finding. Sync SQLAlchemy 2.0 style (`Mapped`/`mapped_column`).

Every case-scoped table carries a `case_id` foreign key to `cases.id`, and
`cases` itself carries `owner_user_id` — the field the ownership-
authorization gap was about (it existed on the DTO, never on a real,
checked record). See `app.services.case_access_service.CaseAccessService`
for the authorization rule built on top of `owner_user_id`.

These models are internal to the persistence layer. Routers and services
must never import them directly for API responses — translate through
`app.domain.entities` (see `app.repositories.case_repository`) or
`app.schemas` DTOs instead (AGENTS.md rule 4).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Stored as plain text (not a DB enum) so SQLite/Postgres portability is
    # unaffected; app.domain.value_objects.UserRole is the validated
    # vocabulary — repositories only ever write `.value` from that enum.
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(5), default="es")


class CaseModel(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=False, index=True
    )
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    client_email: Mapped[str] = mapped_column(String(320), nullable=False)
    client_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(5), default="es")
    status: Mapped[str] = mapped_column(String(40), default="draft")
    client_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    attorney_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    household: Mapped[CaseHouseholdModel | None] = relationship(
        back_populates="case", cascade="all, delete-orphan", uselist=False
    )
    incomes: Mapped[list[CaseIncomeModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    expenses: Mapped[list[CaseExpenseModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    debts: Mapped[list[CaseDebtModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    assets: Mapped[list[CaseAssetModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    documents: Mapped[list[CaseDocumentModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    tasks: Mapped[list[CaseTaskModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    timeline: Mapped[list[CaseTimelineModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    notes: Mapped[list[CaseNoteModel]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class CaseHouseholdModel(Base):
    __tablename__ = "case_household"

    case_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("cases.id"), primary_key=True
    )
    marital_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    household_size: Mapped[int] = mapped_column(Integer, default=1)
    dependents: Mapped[int] = mapped_column(Integer, default=0)
    filing_jointly: Mapped[bool] = mapped_column(Boolean, default=False)
    housing_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    municipality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    urgent_collection_action: Mapped[bool] = mapped_column(Boolean, default=False)
    recent_property_transfer: Mapped[bool] = mapped_column(Boolean, default=False)

    case: Mapped[CaseModel] = relationship(back_populates="household")


class CaseIncomeModel(Base):
    __tablename__ = "case_income"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    net_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    frequency: Mapped[str] = mapped_column(String(20), default="monthly")
    evidence_ids: Mapped[str] = mapped_column(Text, default="")

    case: Mapped[CaseModel] = relationship(back_populates="incomes")


class CaseExpenseModel(Base):
    __tablename__ = "case_expenses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    monthly_amount: Mapped[float] = mapped_column(Float, nullable=False)
    essential: Mapped[bool] = mapped_column(Boolean, default=True)
    evidence_ids: Mapped[str] = mapped_column(Text, default="")

    case: Mapped[CaseModel] = relationship(back_populates="expenses")


class CaseDebtModel(Base):
    __tablename__ = "case_debts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    creditor: Mapped[str] = mapped_column(String(200), nullable=False)
    debt_type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_payment: Mapped[float] = mapped_column(Float, default=0)
    delinquent_amount: Mapped[float] = mapped_column(Float, default=0)
    collateral: Mapped[str | None] = mapped_column(String(300), nullable=True)
    collection_lawsuit: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_ids: Mapped[str] = mapped_column(Text, default="")

    case: Mapped[CaseModel] = relationship(back_populates="debts")


class CaseAssetModel(Base):
    __tablename__ = "case_assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    estimated_value: Mapped[float] = mapped_column(Float, nullable=False)
    loan_balance: Mapped[float] = mapped_column(Float, default=0)
    jointly_owned: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_ids: Mapped[str] = mapped_column(Text, default="")

    case: Mapped[CaseModel] = relationship(back_populates="assets")


class CaseDocumentModel(Base):
    """
    Durable record of a document submission (filename, classified evidence
    type, chunk count). The RAG chunk vectors themselves stay in the
    in-process `app.services.documents.index.CaseDocumentIndex` — unchanged
    by this task; this table is the audit trail / evidence-checklist
    backing, not a vector store.
    """

    __tablename__ = "case_documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="received")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[CaseModel] = relationship(back_populates="documents")


class CaseTaskModel(Base):
    __tablename__ = "case_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[CaseModel] = relationship(back_populates="tasks")


class CaseTimelineModel(Base):
    __tablename__ = "case_timeline"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[CaseModel] = relationship(back_populates="timeline")


class CaseNoteModel(Base):
    __tablename__ = "case_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    author_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[CaseModel] = relationship(back_populates="notes")


class AIConversationModel(Base):
    """
    Stub table (task scope: "ai_conversations can be a stub table for now —
    a parallel/future step wires it into the AI context; just make sure the
    table exists with case_id/role/message/created_at columns so that work
    isn't blocked later."). Not read by `CaseContextBuilder` or
    `BankruptcyGuidanceService` yet — see
    docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4's "no timeline/
    conversation history in AI context" finding, which this table exists to
    unblock but does not itself resolve.
    """

    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
