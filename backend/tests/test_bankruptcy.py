from fastapi.testclient import TestClient


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
    assert response.json()["focus_section"] == "debts-assets"
    assert "bienes" in response.json()["reply"].casefold()


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
