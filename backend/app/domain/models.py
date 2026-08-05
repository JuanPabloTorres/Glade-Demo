from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.base import Base, EntityBase


class Matter(EntityBase, Base):
    __tablename__ = "matters"

    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    case_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(500))
    date_of_birth: Mapped[str | None] = mapped_column(String(30))
    assigned_to: Mapped[str | None] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text)

    documents: Mapped[list[Document]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )
    facts: Mapped[list[ExtractedFact]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )
    conflicts: Mapped[list[Conflict]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )
    activities: Mapped[list[Activity]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )


class Document(EntityBase, Base):
    __tablename__ = "documents"

    matter_id: Mapped[str] = mapped_column(ForeignKey("matters.id"), nullable=False, index=True)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    matter: Mapped[Matter] = relationship(back_populates="documents")
    facts: Mapped[list[ExtractedFact]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class ExtractedFact(EntityBase, Base):
    __tablename__ = "extracted_facts"

    matter_id: Mapped[str] = mapped_column(ForeignKey("matters.id"), nullable=False, index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_label: Mapped[str] = mapped_column(String(255), nullable=False)
    is_current: Mapped[bool] = mapped_column(default=False)

    matter: Mapped[Matter] = relationship(back_populates="facts")
    document: Mapped[Document | None] = relationship(back_populates="facts")


class Conflict(EntityBase, Base):
    __tablename__ = "conflicts"

    matter_id: Mapped[str] = mapped_column(ForeignKey("matters.id"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    canonical_value: Mapped[str] = mapped_column(Text, nullable=False)
    conflicting_value: Mapped[str] = mapped_column(Text, nullable=False)
    canonical_source: Mapped[str] = mapped_column(String(255), nullable=False)
    conflicting_source: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    resolved_value: Mapped[str | None] = mapped_column(Text)

    matter: Mapped[Matter] = relationship(back_populates="conflicts")


class Activity(EntityBase, Base):
    __tablename__ = "activities"

    matter_id: Mapped[str] = mapped_column(ForeignKey("matters.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    matter: Mapped[Matter] = relationship(back_populates="activities")
