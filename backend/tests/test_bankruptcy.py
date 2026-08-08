from fastapi.testclient import TestClient

from app.ai.contracts.assistant_response import ALLOWED_ACTION_RESOURCES, AssistantActionType

ALLOWED_ACTION_TYPES = {member.value for member in AssistantActionType}


def sample_case() -> dict[str, object]:
    return {
        "id": "case-test",
        "owner_user_id": "client-demo",
        "client_name": "Elena Rivera",
        "client_email": "client@freshstart.demo",
        "client_goal": "Detener el desorden financiero y consultar alternativas.",
        "status": "collecting_information",
        "household": {
            "marital_status": "single",
            "household_size": 2,
            "dependents": 1,
            "housing_status": "rent",
            "municipality": "Ponce",
        },
        "incomes": [
            {
                "id": "income-1",
                "category": "wages",
                "source": "Employer",
                "gross_amount": 1200,
                "net_amount": 950,
                "frequency": "biweekly",
                "evidence_ids": ["evidence-1"],
            }
        ],
        "expenses": [
            {
                "id": "expense-1",
                "category": "housing",
                "description": "Rent",
                "monthly_amount": 1100,
                "essential": True,
            },
            {
                "id": "expense-2",
                "category": "food",
                "description": "Food",
                "monthly_amount": 650,
                "essential": True,
            },
        ],
        "debts": [
            {
                "id": "debt-1",
                "creditor": "Example Card",
                "debt_type": "unsecured",
                "description": "Credit card",
                "balance": 18000,
                "monthly_payment": 450,
                "delinquent_amount": 900,
            }
        ],
        "assets": [
            {
                "id": "asset-1",
                "category": "vehicle",
                "description": "2018 sedan",
                "estimated_value": 9000,
                "loan_balance": 7000,
            }
        ],
        "evidence": [
            {
                "id": "evidence-1",
                "evidence_type": "Talones de pago",
                "name": "paystub.pdf",
                "status": "received",
            }
        ],
    }


def test_analysis_normalizes_income_and_finances(client: TestClient) -> None:
    response = client.post(
        "/api/v1/bankruptcy/analyze",
        json={"case": sample_case()},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["monthly_gross_income"] == 2600.0
    assert payload["monthly_net_income"] == 2058.33
    assert payload["monthly_expenses"] == 1750.0
    assert payload["monthly_cash_flow"] == 308.33
    assert payload["unsecured_debt"] == 18000.0
    assert "Existen cuentas en atraso" in " ".join(payload["warnings"])


def test_a_client_can_analyze_a_case_that_does_not_exist_yet(client: TestClient) -> None:
    """Creating a request must work on its first analyze call.

    This is the client half of the "Could not refresh the financial analysis"
    report: the case has no persisted owner yet, and `authorize_for_submission`
    is what decides whether that is a creation or a 404.
    """
    case = sample_case()
    case["id"] = "case-brand-new-client"
    # Emptied, and not only for realism: `sample_case`'s child rows carry fixed
    # ids ("asset-1", "expense-1"), which another test in this session has
    # already persisted under a different case. A brand-new request has no child
    # rows anyway, so this is the honest shape as well as the isolated one.
    for section in ("incomes", "expenses", "debts", "assets", "evidence"):
        case[section] = []

    response = client.post("/api/v1/bankruptcy/analyze", json={"case": case})

    assert response.status_code == 200, response.text
    assert response.json()["completion_score"] >= 0


def test_an_attorney_cannot_conjure_a_case_that_has_no_client_owner(
    attorney_client: TestClient,
) -> None:
    """The other half, and the actual defect.

    The attorney dashboard used to offer "Create case", which built a case whose
    owner was the *attorney*. A case must have a client owner
    (`CaseAccessService`'s docstring), so this 404s — and the workspace rendered
    that as "Could not refresh the financial analysis" on every attorney-created
    case.

    The control was removed rather than this rule relaxed: letting an attorney
    create on a client's behalf is an authorization change and needs an ADR.
    This test is here so that re-adding the button fails with the reason
    attached instead of failing in a browser.
    """
    case = sample_case()
    case["id"] = "case-attorney-conjured"
    case["owner_user_id"] = "attorney-demo"

    response = attorney_client.post("/api/v1/bankruptcy/analyze", json={"case": case})

    assert response.status_code == 404


def test_guidance_asks_for_missing_section(client: TestClient) -> None:
    case = sample_case()
    case["assets"] = []
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={
            "case": case,
            "message": "¿Qué hago ahora?",
            "role": "client",
            "locale": "es",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "bienes" in payload["message"].casefold()
    # The deterministic draft's focus section survives the 4.0.0 contract
    # change as the resource an action points at — the workspace section
    # vocabulary did not change, only where it is carried.
    assert any(action["resource"] == "debts-assets" for action in payload["actions"])


def test_guidance_returns_structured_actions(client: TestClient) -> None:
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={"case": sample_case(), "message": "¿Qué me falta?", "role": "client", "locale": "es"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["actions"], list)
    for action in payload["actions"]:
        assert {"id", "label", "icon", "action_type", "resource"} <= action.keys()
        assert action["action_type"] in ALLOWED_ACTION_TYPES
        assert action["resource"] in ALLOWED_ACTION_RESOURCES
    for field in ("language", "handled_by", "cards", "warnings", "requires_attorney_review", "degraded", "disclaimer"):
        assert field in payload


def test_guidance_without_a_model_is_deterministic_and_disclaims(client: TestClient) -> None:
    """The default deployment (AI_PROVIDER=rule_based) has no agent layer.

    It must still answer — never 5xx, never an empty body — and must still
    carry the disclaimer. `degraded` is how the contract admits the answer
    did not come from the agent layer, instead of silently passing a
    deterministic draft off as a model response.
    """
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={"case": sample_case(), "message": "¿Qué me falta?", "role": "client", "locale": "es"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is True
    assert payload["handled_by"] == "deterministic"
    assert payload["message"].strip()
    assert "no es asesoramiento legal" in payload["disclaimer"]


def test_guidance_guardrail_forces_attorney_review(client: TestClient) -> None:
    # "chapter 7" routes through the deterministic chapter-comparison branch,
    # which RuleBasedProvider already flags requires_attorney_review=True -
    # this proves that flag survives all the way through the HTTP response,
    # not just at the GuidanceDraft/provider layer (backend/tests/
    # test_ai_providers.py already covers the provider layer in isolation).
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={"case": sample_case(), "message": "¿Qué chapter 7 me conviene?", "role": "client", "locale": "es"},
    )
    assert response.status_code == 200
    assert response.json()["requires_attorney_review"] is True


def test_guidance_rejects_role_mismatched_with_session(client: TestClient) -> None:
    # `client` fixture authenticates as the demo client; declaring role
    # "attorney" in the body must be rejected, not trusted (security fix,
    # docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md §6).
    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={
            "case": sample_case(),
            "message": "Resume el caso",
            "role": "attorney",
            "locale": "es",
        },
    )
    assert response.status_code == 403


def test_bankruptcy_endpoints_require_jwt(client: TestClient) -> None:
    authorization = client.headers.pop("Authorization")
    try:
        response = client.post(
            "/api/v1/bankruptcy/analyze",
            json={"case": sample_case()},
        )
    finally:
        client.headers["Authorization"] = authorization
    assert response.status_code == 401
