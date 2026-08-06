from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.domain.enums import (
    AlertSeverity,
    DocumentCategory,
    DocumentStatus,
    PreferredLanguage,
    TaskPriority,
    UserRole,
)
from app.domain.models import CaseAlert, CaseDocument, CaseNote, CaseTask, User
from app.repositories.case_repository import CaseRepository
from app.repositories.user_repository import UserRepository
from app.schemas.cases import CaseCreate
from app.services.case_service import CaseService

DEMO_PASSWORD = "Demo123!"
DEMO_USERS = (
    ("applicant@freshstart.demo", "Ana Rivera", UserRole.APPLICANT),
    ("manager@freshstart.demo", "Luis Case Manager", UserRole.CASE_MANAGER),
    ("admin@freshstart.demo", "FreshStart Admin", UserRole.ADMIN),
)


def seed_demo_data(db: Session) -> None:
    users: list[User] = []
    for email, full_name, role in DEMO_USERS:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                role=role,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
        users.append(user)
    db.commit()
    for user in users:
        db.refresh(user)

    applicant = next(user for user in users if user.role == UserRole.APPLICANT)
    manager = next(user for user in users if user.role == UserRole.CASE_MANAGER)
    cases = CaseRepository(db).list_for_applicant(applicant.id)
    case = cases[0] if cases else CaseService(CaseRepository(db), UserRepository(db)).create_case(
        CaseCreate(
            title="Ana Rivera — Chapter 7 Intake",
            preferred_language=PreferredLanguage.ES,
        ),
        applicant,
    )

    existing_document = db.scalar(
        select(CaseDocument.id).where(CaseDocument.case_id == case.id).limit(1)
    )
    if existing_document:
        return

    db.add_all(
        [
            CaseDocument(
                case_id=case.id,
                name="Identificación con foto",
                category=DocumentCategory.IDENTITY,
                status=DocumentStatus.VERIFIED,
                notes="Documento demo revisado por el especialista.",
                uploaded_by_id=applicant.id,
            ),
            CaseDocument(
                case_id=case.id,
                name="Comprobantes de ingreso — últimos 60 días",
                category=DocumentCategory.INCOME,
                status=DocumentStatus.REQUESTED,
                uploaded_by_id=manager.id,
            ),
            CaseTask(
                case_id=case.id,
                title="Confirmar lista de acreedores",
                description="Revisar nombres, balances y números de cuenta antes de marcar la sección como completada.",
                priority=TaskPriority.HIGH,
                due_date=datetime.now(UTC) + timedelta(days=3),
                assigned_to_id=manager.id,
            ),
            CaseNote(
                case_id=case.id,
                content="La solicitante prefiere recibir orientación en español.",
                is_internal=True,
                author_id=manager.id,
            ),
            CaseAlert(
                case_id=case.id,
                title="Ingresos pendientes de evidencia",
                message="La sección contiene datos preliminares, pero faltan comprobantes para revisión.",
                severity=AlertSeverity.WARNING,
            ),
        ]
    )
    db.commit()
