from __future__ import annotations

from typing import Any

from sqlalchemy import Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, BaseEntity
from app.domain.enums import CaseStatus, IntakeSectionKey, PreferredLanguage, UserRole


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


class IntakeSection(Base, BaseEntity):
    __tablename__ = "intake_sections"
    __table_args__ = (UniqueConstraint("case_id", "section_key"),)

    case_id: Mapped[str] = mapped_column(ForeignKey("bankruptcy_cases.id"), index=True)
    section_key: Mapped[IntakeSectionKey] = mapped_column(Enum(IntakeSectionKey))
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    completed: Mapped[bool] = mapped_column(default=False)

    case: Mapped[BankruptcyCase] = relationship(back_populates="sections")
