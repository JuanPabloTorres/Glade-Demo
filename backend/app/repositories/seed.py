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
from app.domain.value_objects import TimelineEventType, UserRole
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

The attorney-facing case is `ATTORNEY_REVIEW_CASE_ID` below.
"""

ATTORNEY_REVIEW_CASE_ID = "case-miguel-demo"
"""The submitted case the attorney queue opens, and the reason it must exist here.

`CaseAccessService.authorize_for_submission` creates a missing case only for its
owning *client*; an attorney correctly gets 404 rather than being able to conjure
one. Demo cases are seeded in the browser, so a case only reaches the database
once its own client analyzes it — and this case belongs to a client nobody logs
in as. Without a server-side fixture the attorney opened the case and every
`analyze` call returned 404, so the review workspace rendered with no cash flow,
no debt composition and no missing items: the whole professional half of the
demo, failing silently.

Its owner is a user row, not a demo account. Miguel is the subject of a case the
attorney reviews, not a persona anyone signs in as, and `cases.owner_user_id`
has a foreign key to `users.id` — the row exists to satisfy that relationship and
to keep ownership checks meaningful, not to add a third login.

The figures mirror `frontend/src/workspace/BankruptcyWorkspaceContext.tsx`'s
`case-miguel-demo`, so the workspace shows the same case whether it is read from
the browser seed or from here.
"""

ATTORNEY_REVIEW_CLIENT_ID = "client-miguel-demo"

INCOMPLETE_CASE_ID = "case-rosa-demo"
INCOMPLETE_CLIENT_ID = "client-rosa-demo"
"""A third case, deliberately thin.

The portfolio only demonstrates triage if the cases differ in the signals triage
uses. Elena is collecting information with no urgency; Miguel is submitted with a
collection lawsuit and an urgent flag; Rosa is barely started with nothing
attached. A queue of three healthy cases would let a ranking answer look correct
while ranking on nothing.
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

        _seed_attorney_review_case(session, settings)
        _seed_incomplete_case(session)
        session.commit()


def _seed_attorney_review_case(session: Session, settings: Settings) -> None:
    """A second, already-submitted case, so the attorney queue opens something real.

    Kept in its own function rather than inlined: the two fixtures are read for
    different reasons — one is the client's in-progress workspace, this one is
    what professional review looks like — and a single 150-line block made it
    hard to see that they are different stories rather than duplicated data.
    """
    session.add(
        UserModel(
            id=ATTORNEY_REVIEW_CLIENT_ID,
            email="miguel@example.demo",
            name="Miguel Santos",
            role=UserRole.CLIENT.value,
            preferred_language="es",
        )
    )

    case = CaseModel(
        id=ATTORNEY_REVIEW_CASE_ID,
        owner_user_id=ATTORNEY_REVIEW_CLIENT_ID,
        client_name="Miguel Santos",
        client_email="miguel@example.demo",
        client_phone="939-555-0138",
        preferred_language="es",
        # Submitted, not collecting: the attorney's queue is a review surface,
        # and a case still being filled in would not belong in it.
        status="submitted",
        client_goal="Revisar atrasos de vivienda y deudas medicas antes de una consulta.",
    )
    session.add(case)
    session.flush()

    session.add(
        CaseHouseholdModel(
            case_id=case.id,
            marital_status="married",
            household_size=4,
            dependents=2,
            housing_status="own",
            municipality="Caguas",
            # The one fact in this fixture that drives an urgency signal, and the
            # reason this case is worth putting in front of an attorney at all.
            urgent_collection_action=True,
        )
    )
    session.add(
        CaseIncomeModel(
            case_id=case.id,
            category="wages",
            source="Island Manufacturing",
            gross_amount=3400,
            net_amount=2750,
            frequency="monthly",
        )
    )
    for category, description, amount in (
        ("housing", "Hipoteca", 1250),
        ("food", "Alimentos", 850),
        ("transportation", "Vehiculos y gasolina", 760),
        ("medical", "Medicinas y copagos", 240),
    ):
        session.add(
            CaseExpenseModel(
                case_id=case.id,
                category=category,
                description=description,
                monthly_amount=amount,
                essential=True,
            )
        )

    session.add(
        CaseDebtModel(
            case_id=case.id,
            creditor="Example Mortgage",
            debt_type="secured",
            description="Hipoteca residencial",
            balance=148000,
            monthly_payment=1250,
            delinquent_amount=7500,
            collateral="Residencia principal",
            collection_lawsuit=True,
        )
    )
    session.add(
        CaseDebtModel(
            case_id=case.id,
            creditor="Regional Medical",
            debt_type="unsecured",
            description="Servicios medicos",
            balance=24000,
            monthly_payment=200,
        )
    )
    session.add(
        CaseAssetModel(
            case_id=case.id,
            category="real-estate",
            description="Residencia principal",
            estimated_value=165000,
            loan_balance=148000,
            jointly_owned=True,
        )
    )
    session.add(
        CaseTaskModel(
            case_id=case.id,
            title="Revisar atrasos hipotecarios y demanda de cobro",
            status="open",
        )
    )
    session.add(
        CaseNoteModel(
            case_id=case.id,
            author_user_id=settings.demo_attorney_id,
            body="Confirmar el estado de la demanda de cobro antes de la consulta.",
        )
    )
    # `TimelineEventType` is the vocabulary — there is no "case_submitted"
    # member, and inventing one as a bare string is the magic-string pattern the
    # repository forbids. Submission is a status change, so it is recorded as an
    # update; adding a member to the enum would be a domain change, not a seed
    # fixture's business.
    session.add(
        CaseTimelineModel(
            case_id=case.id,
            event_type=TimelineEventType.CASE_UPDATED.value,
            message="Expediente enviado para revision del abogado.",
        )
    )


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


def _seed_incomplete_case(session: Session) -> None:
    """The case that needs chasing rather than reviewing.

    Household only: no income, no expenses, no debts, no assets, no evidence.
    That is the point — an attorney asking which cases need attention should be
    able to separate "waiting on me" from "waiting on the client", and this is
    the second kind.
    """
    session.add(
        UserModel(
            id=INCOMPLETE_CLIENT_ID,
            email="rosa@example.demo",
            name="Rosa Mendez",
            role=UserRole.CLIENT.value,
            preferred_language="es",
        )
    )
    case = CaseModel(
        id=INCOMPLETE_CASE_ID,
        owner_user_id=INCOMPLETE_CLIENT_ID,
        client_name="Rosa Mendez",
        client_email="rosa@example.demo",
        preferred_language="es",
        status="collecting_information",
        client_goal="Entender mis opciones antes de decidir.",
    )
    session.add(case)
    session.flush()
    session.add(
        CaseHouseholdModel(
            case_id=case.id,
            marital_status="single",
            household_size=1,
            dependents=0,
            housing_status="rent",
            municipality="Bayamon",
        )
    )
    session.add(
        CaseTimelineModel(
            case_id=case.id,
            event_type=TimelineEventType.CASE_CREATED.value,
            message="Expediente iniciado; falta informacion financiera.",
        )
    )
