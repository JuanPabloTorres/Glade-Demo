"""
Synthetic demo-data seeding. Reuses the two demo accounts already defined in
`app.core.security.get_demo_accounts` (Elena Rivera / client, Lic. Andrea
Morales / attorney) — same synthetic personas the login screen's quick-
access buttons use, never real PII. Shared by:
  - `backend/scripts/seed_demo_data.py` (CLI, for local/dev setup)
  - `POST /api/v1/admin/demo/reset` (dev-only endpoint, gated by
    `settings.environment != "production"` — see
    `app.api.routers.admin.reset_demo_data`)

Both call `reset_demo_data()` so there is exactly one place that defines
what "demo data" means.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import get_demo_accounts
from app.domain.value_objects import UserRole
from app.repositories.database import get_sessionmaker, init_db
from app.repositories.orm_models import (
    AIConversationModel,
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
    UserModel,
)

DEMO_CASE_ID = "case-elena-demo"
"""The demo client's case id, and it must equal the one the UI seeds.

`frontend/src/workspace/BankruptcyWorkspaceContext.tsx` seeds the browser
workspace with `case-elena-demo` and `case-miguel-demo`. This constant used to
be `case-demo-elena-rivera`, so the two seeds never referred to the same case:
the server held a rich fixture — household, incomes, expenses, debts, assets,
timeline, notes, tasks — that the demo never displayed, while the UI worked
against a bare snapshot built from `localStorage` on the first `analyze` call.

Aligning it is not cosmetic. `CaseAccessService.authorize_for_submission`
creates a missing case only for the owning *client*; an attorney gets 404 by
design. So any case the UI shows to an attorney has to exist server-side
already, and it can only do that if both seeds agree on the identifier.

Known remaining gap: `case-miguel-demo`, the case the attorney queue opens, has
no server-side fixture at all, so `POST /api/v1/bankruptcy/analyze` still
returns 404 for it. See `changes/demo-close-integration.md`.
"""


def _wipe_all(session: Session) -> None:
    # Children first (no ON DELETE CASCADE is configured at the SQLite
    # level; ORM-level cascade only fires through the mapped relationship,
    # not a bulk DELETE, so tables are cleared explicitly and in FK order).
    for model in (
        AIConversationModel,
        CaseTimelineModel,
        CaseNoteModel,
        CaseTaskModel,
        CaseDocumentModel,
        CaseAssetModel,
        CaseDebtModel,
        CaseExpenseModel,
        CaseIncomeModel,
        CaseHouseholdModel,
        CaseModel,
        UserModel,
    ):
        session.query(model).delete()


def reset_demo_data(settings: Settings) -> None:
    """Drops and recreates every demo-owned row. Never touches anything
    outside the demo accounts/case — safe to run repeatedly."""
    init_db(settings)
    session_factory = get_sessionmaker()
    with session_factory() as session:
        _wipe_all(session)

        for user, _password in get_demo_accounts(settings):
            session.add(
                UserModel(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    role=UserRole(user.role).value,
                    preferred_language=user.preferred_language,
                )
            )

        client_id = settings.demo_client_id
        case = CaseModel(
            id=DEMO_CASE_ID,
            owner_user_id=client_id,
            client_name=settings.demo_client_name,
            client_email=settings.demo_client_email,
            client_phone="787-555-0100",
            preferred_language="es",
            status="collecting_information",
            client_goal="Detener el desorden financiero y consultar alternativas de quiebra.",
        )
        session.add(case)
        session.flush()

        session.add(
            CaseHouseholdModel(
                case_id=case.id,
                marital_status="single",
                household_size=2,
                dependents=1,
                housing_status="rent",
                municipality="Ponce",
            )
        )
        session.add(
            CaseIncomeModel(
                case_id=case.id,
                category="wages",
                source="Panaderia Los Robles",
                gross_amount=1200,
                net_amount=950,
                frequency="biweekly",
            )
        )
        session.add(
            CaseExpenseModel(
                case_id=case.id,
                category="housing",
                description="Alquiler",
                monthly_amount=1100,
                essential=True,
            )
        )
        session.add(
            CaseDebtModel(
                case_id=case.id,
                creditor="Tarjeta Ejemplo",
                debt_type="unsecured",
                description="Tarjeta de credito",
                balance=18000,
                monthly_payment=450,
                delinquent_amount=900,
            )
        )
        session.add(
            CaseAssetModel(
                case_id=case.id,
                category="vehicle",
                description="Sedan 2018",
                estimated_value=9000,
                loan_balance=7000,
            )
        )
        session.add(
            CaseTaskModel(
                case_id=case.id, title="Adjuntar talones de pago recientes", status="open"
            )
        )
        session.add(
            CaseTimelineModel(
                case_id=case.id,
                event_type="case_created",
                message="Caso de demostracion inicializado.",
            )
        )
        session.commit()


def seed_demo_data_if_absent(settings: Settings) -> bool:
    """Seed the demo case only into a database that has none, and report it.

    `reset_demo_data` above wipes before it writes, which is what a "reset"
    button and a dev CLI want and exactly what a startup hook must never do.
    This is the non-destructive counterpart: it writes only when there is
    nothing to lose, so enabling it on a deployment that later gains real
    rows becomes a silent no-op rather than a data-loss event.

    It exists for one deployment shape — a serverless target whose storage is
    per-instance and ephemeral. There, every cold start begins with an empty
    database, and without this the demo answers a login with an empty
    workspace until somebody remembers to call the admin reset endpoint. Opt
    in with `SEED_DEMO_DATA_ON_STARTUP=true`; it is off by default precisely
    because "populate the database on boot" is the wrong default everywhere
    else.

    Returns True when it seeded, so the caller can log which happened rather
    than leaving an operator guessing why a workspace is or is not populated.
    """
    init_db(settings)
    session_factory = get_sessionmaker()
    with session_factory() as session:
        already_populated = (
            session.query(CaseModel).first() is not None
            or session.query(UserModel).first() is not None
        )
    if already_populated:
        return False
    reset_demo_data(settings)
    return True
