from typing import Callable

import pytest
from fastapi.testclient import TestClient

from app import config
from app.models import Classification

DELIVERY = Classification(
    theme="delivery",
    sentiment="negative",
    severity=4,
    extracted_issue="Late, cold delivery",
)


@pytest.fixture()
def mock_classifier(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[list[Classification | None]], None]:
    def _set(results: list[Classification | None]) -> None:
        monkeypatch.setattr("app.main.classify_reviews", lambda texts: results)

    return _set


@pytest.fixture()
def api_key(monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(config, "API_KEY", "test-secret")
    return "test-secret"


PAYLOAD = {"reviews": [{"text": "Cold pizza"}], "location": "Main Branch"}


def test_mutating_endpoints_reject_missing_or_wrong_key(
    client: TestClient, api_key: str
) -> None:
    missing = client.post("/reviews", json=PAYLOAD)
    assert missing.status_code == 401
    assert missing.json()["error"] == "invalid or missing API key"

    wrong = client.post("/reviews", json=PAYLOAD, headers={"X-API-Key": "nope"})
    assert wrong.status_code == 401

    assert client.delete("/reviews").status_code == 401
    assert client.delete("/reviews/1").status_code == 401
    assert (
        client.post(
            "/reviews/csv",
            files={"file": ("r.csv", "Review\nCold pizza\n", "text/csv")},
            data={"location": "Main Branch"},
        ).status_code
        == 401
    )


def test_correct_key_is_accepted(
    client: TestClient, api_key: str, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    response = client.post(
        "/reviews", json=PAYLOAD, headers={"X-API-Key": api_key}
    )
    assert response.status_code == 201

    assert (
        client.delete("/reviews", headers={"X-API-Key": api_key}).status_code == 200
    )


def test_read_endpoints_stay_open_with_key_configured(
    client: TestClient, api_key: str
) -> None:
    assert client.get("/health").status_code == 200
    assert client.get("/reviews").status_code == 200
    assert client.get("/insights").status_code == 200


def test_auth_disabled_when_no_key_configured(
    client: TestClient, mock_classifier
) -> None:
    assert config.API_KEY == ""
    mock_classifier([DELIVERY])
    assert client.post("/reviews", json=PAYLOAD).status_code == 201


def test_version_endpoint(client: TestClient) -> None:
    response = client.get("/version")
    assert response.status_code == 200
    assert "commit" in response.json()
