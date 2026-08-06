import os
import tempfile
from collections.abc import Generator
from pathlib import Path

# The persistence layer's DATABASE_URL must be set before `app.main` (and
# therefore `app.core.config.get_settings`, which is `@lru_cache`d) is
# imported for the first time — otherwise the test suite would silently
# read/write the real demo database file at backend/data/freshstart.db
# instead of an isolated, disposable one. See app.core.config.Settings
# .database_url and app.repositories.database for the production side of
# this.
_TEST_DB_PATH = Path(tempfile.mkdtemp(prefix="freshstart-tests-")) / "freshstart-test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH.as_posix()}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.seed import reset_demo_data  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _seeded_demo_database() -> None:
    """Runs once per test session: creates the schema and seeds the two
    demo accounts (+ one demo case) into the isolated test database defined
    above, via the exact same app.repositories.seed.reset_demo_data used by
    `backend/scripts/seed_demo_data.py` and `POST /api/v1/admin/demo/reset`
    — dogfooding the reset path rather than hand-rolling test-only setup."""
    reset_demo_data(get_settings())


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "client@freshstart.demo",
                "password": "FreshStart!2026",
            },
        )
        assert login.status_code == 200
        test_client.headers.update(
            {"Authorization": f"Bearer {login.json()['access_token']}"}
        )
        yield test_client


@pytest.fixture
def attorney_client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "attorney@freshstart.demo",
                "password": "Counsel!2026",
            },
        )
        assert login.status_code == 200
        test_client.headers.update(
            {"Authorization": f"Bearer {login.json()['access_token']}"}
        )
        yield test_client
