import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql://postgres:sentimo@localhost:5433/sentimo"
)

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _tables() -> None:
    db.create_tables()


@pytest.fixture(autouse=True)
def _clean_db() -> None:
    with db.get_connection() as conn:
        conn.execute("TRUNCATE reviews, classifications RESTART IDENTITY CASCADE")


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
