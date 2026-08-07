"""Drive real turns through the Strands agent layer against a live model.

Not a test — an evidence capture, and the thing that answers the open question
ADR 0002 shipped with: *"No live LLM has run through this layer."* Everything
in the test suite stops at the SDK's tool surface; this goes all the way to a
running model and writes each turn's full `AssistantResponse` to JSON, so
frontend fixtures can quote what the agent actually produced rather than what
someone imagined it would produce.

It is kept out of `backend/tests` deliberately: it needs a reachable model, it
takes minutes, and it is non-deterministic. CI must never depend on it.

    ollama serve
    backend/.venv/Scripts/python.exe backend/scripts/live_agent_turns.py \
        docs/evidence/live-agent-turns.json

Environment: `LIVE_MODEL` picks the Ollama tag (default `llama3.1:8b-16k`).
The database is a throwaway temp file seeded with the demo accounts, so the
run never touches `backend/data/freshstart.db`.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import tempfile
import time
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]

# Every one of these must be set before `app.core.config.get_settings` is
# imported: it is `@lru_cache`d, so the first read wins for the process.
_DB = Path(tempfile.mkdtemp(prefix="freshstart-live-")) / "live.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.as_posix()}"
os.environ["AI_PROVIDER"] = "ollama"
# llama3.1 because the agent path needs native tool calling — llama3 and
# llama3.2:1b do not have it, and an orchestrator whose specialists are tools
# has nothing to delegate with. Note the *stock* 8b tag: the `8b-16k` variant
# crashes this machine's runner outright ("llama runner process has terminated:
# exit status 2") even on a one-line prompt, so a run against it degrades every
# turn and proves nothing about the agent layer.
os.environ["OLLAMA_MODEL"] = os.environ.get("LIVE_MODEL", "llama3.1:8b")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")
os.environ.setdefault("JWT_SECRET_KEY", "live-evidence-run-not-a-deployment-key")

sys.path.insert(0, str(_REPO_ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.seed import reset_demo_data  # noqa: E402

# AgentRuntime swallows every agent failure into the deterministic fallback and
# logs a warning. Surface those: a run that silently degraded on all eight
# turns would otherwise be indistinguishable from a run that worked.
logging.basicConfig(level=logging.WARNING, stream=sys.stderr)

CASE: dict[str, object] = {
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
"""The same synthetic case the backend suite uses, so a figure in a captured
answer can be checked against the analysis endpoint's known values: net income
2058.33/mo, expenses 1750/mo, cash flow 308.33/mo, unsecured debt 18000."""

TURNS: list[tuple[str, str, str]] = [
    ("client", "es", "¿Qué documentos me faltan por entregar?"),
    ("client", "es", "¿Cuánto me queda cada mes después de pagar todo?"),
    ("client", "es", "¿Cuánto debo en total y a quién?"),
    ("client", "en", "What is my monthly income after taxes?"),
    # The product boundary. AGENTS.md forbids determining eligibility or
    # selecting a chapter; these ask for both as directly as a person would.
    ("client", "es", "¿Califico para el capítulo 7?"),
    ("client", "es", "Dime si debo declararme en bancarrota o no."),
    ("attorney", "es", "Resume el expediente para la consulta."),
    ("attorney", "en", "Which evidence is still outstanding for this case?"),
]

CREDENTIALS = {
    "client": ("client@freshstart.demo", "FreshStart!2026"),
    "attorney": ("attorney@freshstart.demo", "Counsel!2026"),
}


def main() -> int:
    reset_demo_data(get_settings())
    settings = get_settings()
    print(f"provider={settings.ai_provider} model={settings.ollama_model}", file=sys.stderr)

    captured: list[dict[str, object]] = []
    with TestClient(app) as http:
        health = http.get("/api/v1/ai/health")
        print(f"ai/health -> {health.status_code} {health.text}", file=sys.stderr)

        for role, locale, message in TURNS:
            email, password = CREDENTIALS[role]
            login = http.post("/api/v1/auth/login", json={"email": email, "password": password})
            login.raise_for_status()
            token = login.json()["access_token"]

            started = time.monotonic()
            response = http.post(
                "/api/v1/bankruptcy/guide",
                json={"case": CASE, "message": message, "role": role, "locale": locale},
                headers={"Authorization": f"Bearer {token}"},
                timeout=600,
            )
            elapsed = time.monotonic() - started
            response.raise_for_status()
            payload = response.json()
            captured.append(
                {
                    "role": role,
                    "locale": locale,
                    "question": message,
                    "seconds": round(elapsed, 1),
                    "response": payload,
                }
            )
            print(
                f"[{role}/{locale}] {elapsed:6.1f}s  handled_by={payload['handled_by']:>14}  "
                f"degraded={payload['degraded']!s:>5}  review={payload['requires_attorney_review']!s:>5}  "
                f"cards={len(payload['cards'])} actions={len(payload['actions'])}",
                file=sys.stderr,
            )

    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("live-agent-turns.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(captured, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {destination}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
