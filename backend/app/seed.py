from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.domain.enums import PreferredLanguage, UserRole
from app.domain.models import User
from app.schemas.cases import CaseCreate
from app.repositories.case_repository import CaseRepository
from app.repositories.user_repository import UserRepository
from app.services.case_service import CaseService

DEMO_PASSWORD = "Demo123!"
DEMO_USERS = (
    ("applicant@freshstart.demo", "Ana Rivera", UserRole.APPLICANT),
    ("manager@freshstart.demo", "Luis Case Manager", UserRole.CASE_MANAGER),
    ("admin@freshstart.demo", "FreshStart Admin", UserRole.ADMIN),
)


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(User.id).limit(1))
    if existing:
        return

    users: list[User] = []
    for email, full_name, role in DEMO_USERS:
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
    CaseService(CaseRepository(db), UserRepository(db)).create_case(
        CaseCreate(title="Ana Rivera — Chapter 7 Intake", preferred_language=PreferredLanguage.ES),
        applicant,
    )
