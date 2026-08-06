from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, BaseEntity
from app.domain.enums import (
    AlertSeverity,
    CaseStatus,
    DocumentCategory,
    DocumentStatus,
    IntakeSectionKey,
    PreferredLanguage,
    TaskPriority,
    TaskStatus,
    UserRole,
)


class User(Base, BaseEntity):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.APPLICANT)

    cases: Mapped[list[BankruptcyCase]] = relationship(
        back_populates="applicant", cascade="all, delete-orphan"
    )


class BankruptcyCase(Base, BaseEntity):
    __tablename__ = "bankruptcy_cases"

    applicant_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), default="Chapter 7 Intake")
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus), default=CaseStatus.DRAFT)
    preferred_language: Mapped[PreferredLanguage] = mapped_column(
        Enum(PreferredLanguage), default=PreferredLanguage.ES
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")

    applicant: Mapped[User] = relationship(back_populates="cases")
    sections: Mapped[list[IntakeSection]] = relationship(
        back_populates="case", cascade="all, delete-orphan", lazy="selectin"
    )
    documents: Mapped[list[CaseDocument]] = relationship(
        back_populates="case", cascade="all, delete-orphan", lazy="selectin"
    )
    tasks: Mapped[list[CaseTask]] = relationship(
        back_populates="case", cascade="all, delete-orphan", lazy="selectin"
    )
    notes: Mapped[list[CaseNote]] = relationship(
        back_populates="case", cascade="all, delete-orphan", lazy="selectin"
    )
    alerts: Mapped[list[CaseAlert]] = relationship(
        back_populates="case", cascade="all, delete-orphan", lazy="selectin"
    )


class IntakeSection(Base, BaseEntity):
    __tablename__ = "intake_sections"
    __table_args__ = (UniqueConstraint("case_id", "section_key"),)

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    section_key: Mapped[IntakeSectionKey] = mapped_column(Enum(IntakeSectionKey))
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    case: Mapped[BankruptcyCase] = relationship(back_populates="sections")


class CaseDocument(Base, BaseEntity):
    __tablename__ = "case_documents"

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory), default=DocumentCategory.OTHER
    )
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.REQUESTED
    )
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    uploaded_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    case: Mapped[BankruptcyCase] = relationship(back_populates="documents")


class CaseTask(Base, BaseEntity):
    __tablename__ = "case_tasks"

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority), default=TaskPriority.MEDIUM
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_to_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    case: Mapped[BankruptcyCase] = relationship(back_populates="tasks")


class CaseNote(Base, BaseEntity):
    __tablename__ = "case_notes"

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    case: Mapped[BankruptcyCase] = relationship(back_populates="notes")


class CaseAlert(Base, BaseEntity):
    __tablename__ = "case_alerts"

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    message: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity), default=AlertSeverity.WARNING
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    case: Mapped[BankruptcyCase] = relationship(back_populates="alerts")
