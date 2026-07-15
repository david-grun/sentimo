from typing import Callable

import pytest
from fastapi.testclient import TestClient

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
def mock_recommendation(monkeypatch: pytest.MonkeyPatch) -> Callable[[str], None]:
    def _set(text: str) -> None:
        monkeypatch.setattr("app.main.generate_recommendation", lambda *a, **kw: text)

    return _set


def test_recommendation_for_existing_theme(
    client: TestClient, mock_classifier, mock_recommendation
) -> None:
    mock_classifier([DELIVERY])
    client.post("/reviews", json={"reviews": [{"text": "Cold pizza"}]})
    mock_recommendation("Fix your delivery packaging and driver ETAs.")

    response = client.get("/insights/delivery/recommendation")
    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "delivery"
    assert body["recommendation"] == "Fix your delivery packaging and driver ETAs."


def test_recommendation_unknown_theme_returns_404(client: TestClient) -> None:
    response = client.get("/insights/delivery/recommendation")
    assert response.status_code == 404


def test_recommendation_invalid_theme_returns_400(client: TestClient) -> None:
    response = client.get("/insights/not_a_theme/recommendation")
    assert response.status_code == 400


def test_recommendation_falls_back_on_gemini_error(
    client: TestClient, mock_classifier, monkeypatch: pytest.MonkeyPatch
) -> None:
    mock_classifier([DELIVERY])
    client.post("/reviews", json={"reviews": [{"text": "Cold pizza"}]})

    def _raise(*args: object, **kwargs: object) -> str:
        raise RuntimeError("Gemini unavailable")

    monkeypatch.setattr("app.main.generate_recommendation", _raise)

    response = client.get("/insights/delivery/recommendation")
    assert response.status_code == 200
    assert "try again" in response.json()["recommendation"].lower()


def test_recommendation_respects_location_filter(
    client: TestClient, mock_classifier, mock_recommendation
) -> None:
    mock_classifier([DELIVERY])
    client.post(
        "/reviews/csv",
        files={"file": ("r.csv", "Review\nCold pizza\n", "text/csv")},
        data={"location": "Vikings MOA"},
    )
    mock_recommendation("ok")

    found = client.get(
        "/insights/delivery/recommendation", params={"location": "Vikings MOA"}
    )
    assert found.status_code == 200

    missing = client.get(
        "/insights/delivery/recommendation", params={"location": "Nonexistent"}
    )
    assert missing.status_code == 404
