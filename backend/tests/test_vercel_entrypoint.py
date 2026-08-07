"""
The Vercel function, booted the way Vercel boots it.

`api/index.py` is the only entrypoint that deployment uses, and it differs from
every other test in this suite: it forces `ENVIRONMENT=production`, which arms
the JWT guard, and it points the database at a per-instance `/tmp` file that
starts empty on every cold start.

These run in a subprocess rather than importing the app in-process. `Settings`
is read at import time and cached, and the whole point here is what happens
*at* import under a given environment — an in-process test would be asserting
against a `Settings` some earlier test already constructed.

They also run from a scratch directory. `Settings` reads `../.env` and `.env`
relative to the working directory, and this repository has an untracked `.env`
supplying a `JWT_SECRET`. Running from the repo root would therefore prove the
guard fires *here*, which is the one place it does not need to — Vercel ships
no `.env` at all.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

_BOOT_AND_CALL = """
import json, sys
sys.path.insert(0, r"{root}")
import importlib.util
spec = importlib.util.spec_from_file_location("vercel_index", r"{root}/api/index.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

from fastapi.testclient import TestClient
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel

with TestClient(module.app) as client:
    health = client.get("/api/v1/health")
    login = client.post(
        "/api/v1/auth/login",
        json={{"email": "{email}", "password": "{password}"}},
    )
    with get_sessionmaker()() as session:
        cases = session.query(CaseModel).count()
    print("RESULT " + json.dumps({{
        "health": health.status_code,
        "login": login.status_code,
        "cases": cases,
    }}))
"""


def _run(script: str, env_overrides: dict[str, str], cwd: Path) -> subprocess.CompletedProcess[str]:
    import os

    env = {**os.environ, **env_overrides}
    # Cleared so the parent test session's own configuration cannot leak in and
    # make a production-boot test pass for the wrong reason.
    for leaked in ("JWT_SECRET", "SEED_DEMO_DATA_ON_STARTUP", "DATABASE_URL", "ENVIRONMENT"):
        env.pop(leaked, None)
    env.update(env_overrides)
    return subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        env=env,
        cwd=str(cwd),
    )


def test_it_refuses_to_boot_without_a_jwt_secret(tmp_path: Path) -> None:
    """The failure that would take the whole deployment down, asserted rather
    than assumed. `api/index.py` forces ENVIRONMENT=production, so a missing
    JWT_SECRET is not a warning — it is an import-time refusal, and every
    /api route returns a function error until it is set."""
    completed = _run(
        _BOOT_AND_CALL.format(
            root=ROOT.as_posix(), email="client@freshstart.demo", password="FreshStart!2026"
        ),
        {"DATABASE_URL": f"sqlite:///{(tmp_path / 'a.db').as_posix()}"},
        cwd=tmp_path,
    )

    assert completed.returncode != 0
    assert "JWT_SECRET must be overridden" in completed.stderr


def test_it_boots_and_serves_a_seeded_workspace_with_a_secret(tmp_path: Path) -> None:
    """A cold start with the documented environment: the API answers, the demo
    account can log in, and the assistant responds — all against a database
    that did not exist a moment ago."""
    completed = _run(
        _BOOT_AND_CALL.format(
            root=ROOT.as_posix(), email="client@freshstart.demo", password="FreshStart!2026"
        ),
        {
            "JWT_SECRET": "a-long-random-value-for-this-test-only-0123456789",
            "DATABASE_URL": f"sqlite:///{(tmp_path / 'cold-start.db').as_posix()}",
            "SEED_DEMO_DATA_ON_STARTUP": "true",
        },
        cwd=tmp_path,
    )

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(
        next(line for line in completed.stdout.splitlines() if line.startswith("RESULT "))[7:]
    )
    assert payload["health"] == 200
    assert payload["login"] == 200, "the seeded demo account could not log in after a cold start"
    assert payload["cases"] > 0, "a cold start left the workspace empty"


def test_without_seeding_a_cold_start_has_no_demo_case(tmp_path: Path) -> None:
    """The behaviour SEED_DEMO_DATA_ON_STARTUP exists to fix, pinned so the
    flag's value is visible rather than folklore."""
    script = """
import json, sys
sys.path.insert(0, r"{root}")
import importlib.util
spec = importlib.util.spec_from_file_location("vercel_index", r"{root}/api/index.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

from fastapi.testclient import TestClient
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel

with TestClient(module.app):
    with get_sessionmaker()() as session:
        print("RESULT " + json.dumps({{"cases": session.query(CaseModel).count()}}))
""".format(root=ROOT.as_posix())

    completed = _run(
        script,
        {
            "JWT_SECRET": "a-long-random-value-for-this-test-only-0123456789",
            "DATABASE_URL": f"sqlite:///{(tmp_path / 'unseeded.db').as_posix()}",
            "SEED_DEMO_DATA_ON_STARTUP": "false",
        },
        cwd=tmp_path,
    )

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(
        next(line for line in completed.stdout.splitlines() if line.startswith("RESULT "))[7:]
    )
    assert payload["cases"] == 0
