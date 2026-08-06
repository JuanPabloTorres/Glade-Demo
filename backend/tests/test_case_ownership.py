"""
Server-side case-ownership authorization tests — the fix for
docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3/§5 ("no ownership
check... any authenticated client or attorney can submit any case_id/case
payload and the backend processes it").

The demo ships exactly one client account and one attorney account, so
"another user's case" is simulated by inserting a case row directly through
the repository layer under a fabricated owner_user_id, then asserting the
authenticated demo client is refused access to it over HTTP — this proves
the check is against the *persisted* owner, not anything the client can
claim in the request body.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseHouseholdModel, CaseModel

OTHER_OWNER_ID = "someone-else-entirely"
FOREIGN_CASE_ID = "case-not-owned-by-demo-client"


def _seed_foreign_case(case_id: str = FOREIGN_CASE_ID, owner_user_id: str = OTHER_OWNER_ID) -> None:
    session_factory = get_sessionmaker()
    with session_factory() as session:
        if session.get(CaseModel, case_id) is not None:
            return
        case = CaseModel(
            id=case_id,
            owner_user_id=owner_user_id,
            client_name="Someone Else",
            client_email="someone-else@example.invalid",
            status="draft",
        )
        session.add(case)
        session.flush()
        session.add(CaseHouseholdModel(case_id=case_id, household_size=1))
        session.commit()


def _minimal_case_payload(case_id: str, owner_user_id: str) -> dict[str, object]:
    return {
        "id": case_id,
        # Deliberately claiming a foreign owner_user_id in the body — the
        # server must ignore/reject this, never trust it (that was exactly
        # the gap: the field existed on the DTO and was never checked).
        "owner_user_id": owner_user_id,
        "client_name": "Someone Else",
        "client_email": "someone-else@example.invalid",
        "status": "draft",
        "household": {"household_size": 1},
    }


def test_analyze_rejects_client_accessing_a_case_they_do_not_own(client: TestClient) -> None:
    _seed_foreign_case()
    response = client.post(
        "/api/v1/bankruptcy/analyze",
        json={"case": _minimal_case_payload(FOREIGN_CASE_ID, OTHER_OWNER_ID)},
    )
    assert response.status_code == 403


def test_guide_rejects_client_accessing_a_case_they_do_not_own(client: TestClient) -> None:
    _seed_foreign_case()
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={
            "case": _minimal_case_payload(FOREIGN_CASE_ID, OTHER_OWNER_ID),
            "message": "¿Qué hago?",
            "role": "client",
            "locale": "es",
        },
    )
    assert response.status_code == 403


def test_client_cannot_spoof_owner_user_id_on_a_brand_new_case(client: TestClient) -> None:
    # A case id that has never been submitted before: the server must set
    # owner_user_id to the authenticated user, not trust the body's claim.
    new_case_id = "case-brand-new-owner-spoof-attempt"
    response = client.post(
        "/api/v1/bankruptcy/analyze",
        json={"case": _minimal_case_payload(new_case_id, OTHER_OWNER_ID)},
    )
    assert response.status_code == 200

    session_factory = get_sessionmaker()
    with session_factory() as session:
        row = session.get(CaseModel, new_case_id)
        assert row is not None
        assert row.owner_user_id == "client-demo"
        assert row.owner_user_id != OTHER_OWNER_ID


def test_attorney_can_access_any_existing_case(attorney_client: TestClient) -> None:
    # Documented demo-scope rule (app.services.case_access_service): no
    # case-assignment table exists yet, so "assigned cases" degrades to
    # "any existing case" for the one attorney account this demo has.
    _seed_foreign_case()
    response = attorney_client.post(
        "/api/v1/bankruptcy/analyze",
        json={"case": _minimal_case_payload(FOREIGN_CASE_ID, OTHER_OWNER_ID)},
    )
    assert response.status_code == 200


def test_attorney_cannot_create_a_brand_new_case(attorney_client: TestClient) -> None:
    # Attorneys review cases a client has already submitted; they cannot
    # originate a new one through this endpoint.
    never_submitted_case_id = "case-attorney-cannot-create"
    response = attorney_client.post(
        "/api/v1/bankruptcy/analyze",
        json={"case": _minimal_case_payload(never_submitted_case_id, "attorney-demo")},
    )
    assert response.status_code == 404


def test_documents_analyze_rejects_client_accessing_a_case_they_do_not_own(
    client: TestClient,
) -> None:
    import base64

    _seed_foreign_case()
    response = client.post(
        "/api/v1/documents/analyze",
        json={
            "case_id": FOREIGN_CASE_ID,
            "filename": "paystub.txt",
            "content_base64": base64.b64encode(b"whatever").decode("ascii"),
        },
    )
    assert response.status_code == 403


def test_documents_analyze_isolates_case_documents_across_cases(client: TestClient) -> None:
    import base64

    from app.repositories.database import get_sessionmaker
    from app.repositories.document_repository import SqlAlchemyDocumentRepository
    from app.repositories.orm_models import CaseModel

    case_a = "case-doc-isolation-a"
    case_b = "case-doc-isolation-b"

    session_factory = get_sessionmaker()
    with session_factory() as session:
        for case_id in (case_a, case_b):
            if session.get(CaseModel, case_id) is None:
                session.add(CaseModel(id=case_id, owner_user_id="client-demo", client_name="Elena Rivera", client_email="client@freshstart.demo"))
        session.commit()

    content = base64.b64encode(
        "Talón de pago - salario bruto $1,200.00 - Employer Inc.".encode()
    ).decode("ascii")
    response = client.post(
        "/api/v1/documents/analyze",
        json={"case_id": case_a, "filename": "paystub.txt", "content_base64": content},
    )
    assert response.status_code == 200

    with session_factory() as session:
        repo = SqlAlchemyDocumentRepository(session)
        docs_a = repo.list_for_case(case_a)
        docs_b = repo.list_for_case(case_b)

    assert len(docs_a) == 1
    assert docs_a[0].filename == "paystub.txt"
    assert docs_b == []
