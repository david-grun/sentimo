import json
from typing import Callable

import pytest
from fastapi.testclient import TestClient

from app import classifier
from app.classifier import classify_reviews, generate_recommendation
from app.models import Classification

DELIVERY = Classification(
    theme="delivery",
    sentiment="negative",
    severity=4,
    extracted_issue="Late, cold delivery",
)
AMBIANCE = Classification(
    theme="ambiance",
    sentiment="positive",
    severity=1,
    extracted_issue="Friendly staff",
)
PRICING = Classification(
    theme="pricing",
    sentiment="negative",
    severity=3,
    extracted_issue="Prices too high",
)


@pytest.fixture()
def mock_classifier(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[list[Classification | None]], None]:
    def _set(results: list[Classification | None]) -> None:
        monkeypatch.setattr("app.main.classify_reviews", lambda texts: results)

    return _set


def _post_reviews(client: TestClient, texts: list[str]) -> object:
    return client.post(
        "/reviews",
        json={"reviews": [{"text": text} for text in texts], "location": "Main Branch"},
    )


def test_create_reviews_without_location_returns_400(client: TestClient) -> None:
    response = client.post("/reviews", json={"reviews": [{"text": "Cold pizza"}]})
    assert response.status_code == 400

    blank = client.post(
        "/reviews", json={"reviews": [{"text": "Cold pizza"}], "location": "   "}
    )
    assert blank.status_code == 400


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_reviews_success(client: TestClient, mock_classifier) -> None:
    mock_classifier([DELIVERY, AMBIANCE])
    response = _post_reviews(client, ["Cold pizza", "Lovely staff"])
    assert response.status_code == 201
    body = response.json()
    assert body["created"] == 2
    assert body["reviews"][0]["theme"] == "delivery"
    assert body["reviews"][0]["severity"] == 4
    assert body["reviews"][1]["sentiment"] == "positive"


def test_create_reviews_skips_existing_duplicates(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    _post_reviews(client, ["Cold pizza"])

    mock_classifier([AMBIANCE])
    response = _post_reviews(client, ["Cold pizza", "Lovely staff"])
    assert response.status_code == 201
    body = response.json()
    assert body["created"] == 1
    assert body["skipped_duplicate"] == 1
    assert body["reviews"][0]["text"] == "Lovely staff"
    assert client.get("/reviews").json()["total"] == 2


def test_create_reviews_all_duplicates_creates_nothing(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    _post_reviews(client, ["Cold pizza"])

    response = _post_reviews(client, ["Cold pizza", "Cold pizza"])
    assert response.status_code == 201
    body = response.json()
    assert body["created"] == 0
    assert body["skipped_duplicate"] == 2
    assert client.get("/reviews").json()["total"] == 1


def test_create_reviews_empty_text_returns_400(client: TestClient) -> None:
    response = _post_reviews(client, [""])
    assert response.status_code == 400
    assert "error" in response.json()


def test_create_reviews_over_50_returns_400(client: TestClient) -> None:
    response = _post_reviews(client, ["ok"] * 51)
    assert response.status_code == 400


def test_create_reviews_partial_failure_returns_422(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY, None])
    response = _post_reviews(client, ["Cold pizza", "Unclassifiable"])
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["created"] == 2
    assert detail["reviews"][0]["theme"] == "delivery"
    assert detail["reviews"][1]["theme"] is None
    # Both reviews were still inserted.
    assert client.get("/reviews").json()["total"] == 2


def test_list_reviews_pagination_and_filters(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY, AMBIANCE, PRICING])
    _post_reviews(client, ["Cold pizza", "Lovely staff", "Too expensive"])

    page = client.get("/reviews", params={"page": 1, "limit": 2}).json()
    assert page["total"] == 3
    assert len(page["items"]) == 2

    filtered = client.get(
        "/reviews", params={"theme": "delivery", "sentiment": "negative"}
    ).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["theme"] == "delivery"

    bad = client.get("/reviews", params={"theme": "not_a_theme"})
    assert bad.status_code == 400


def test_list_reviews_min_severity_filter_and_ordering(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([AMBIANCE, DELIVERY, PRICING])
    _post_reviews(client, ["Lovely", "Cold and late", "Too pricey"])

    critical = client.get("/reviews", params={"min_severity": 3}).json()
    assert critical["total"] == 2
    severities = [item["severity"] for item in critical["items"]]
    assert severities == sorted(severities, reverse=True)
    assert all(s >= 3 for s in severities)


def test_insights_ranked_and_filtered(client: TestClient, mock_classifier) -> None:
    mock_classifier([DELIVERY, DELIVERY, AMBIANCE, PRICING])
    _post_reviews(client, ["Cold", "Late", "Lovely", "Expensive"])

    insights = client.get("/insights").json()["insights"]
    assert insights[0]["theme"] == "delivery"
    assert insights[0]["count"] == 2
    assert insights[0]["avg_severity"] == 4.0
    assert insights[0]["score"] == 8.0
    scores = [insight["score"] for insight in insights]
    assert scores == sorted(scores, reverse=True)

    negative = client.get("/insights", params={"sentiment": "negative"}).json()
    themes = {insight["theme"] for insight in negative["insights"]}
    assert themes == {"delivery", "pricing"}


def test_delete_all_reviews(client: TestClient, mock_classifier) -> None:
    mock_classifier([DELIVERY, AMBIANCE])
    _post_reviews(client, ["Cold pizza", "Lovely staff"])

    response = client.delete("/reviews")
    assert response.status_code == 200
    assert response.json()["deleted"] == 2
    assert client.get("/reviews").json()["total"] == 0


def test_delete_review(client: TestClient, mock_classifier) -> None:
    mock_classifier([DELIVERY])
    created = _post_reviews(client, ["Cold pizza"]).json()
    review_id = created["reviews"][0]["id"]

    assert client.delete(f"/reviews/{review_id}").status_code == 204
    assert client.get("/reviews").json()["total"] == 0
    assert client.delete(f"/reviews/{review_id}").status_code == 404


class _FakeResponse:
    def __init__(self, text: str) -> None:
        self.text = text


def _patch_gemini(monkeypatch: pytest.MonkeyPatch, response_text: str) -> None:
    class _FakeModels:
        def generate_content(self, **kwargs: object) -> _FakeResponse:
            return _FakeResponse(response_text)

    class _FakeClient:
        def __init__(self, api_key: str) -> None:
            self.models = _FakeModels()

    monkeypatch.setattr(classifier.genai, "Client", _FakeClient)


def test_classifier_parses_valid_response(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_gemini(monkeypatch, json.dumps([DELIVERY.model_dump()]))
    results = classify_reviews(["Cold pizza"])
    assert results == [DELIVERY]


def test_classifier_marks_unparseable_as_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_gemini(monkeypatch, "not json at all")
    assert classify_reviews(["a", "b"]) == [None, None]


def test_classifier_marks_invalid_items_as_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    valid = DELIVERY.model_dump()
    invalid = {"theme": "nonsense", "sentiment": "negative", "severity": 99}
    _patch_gemini(monkeypatch, json.dumps([valid, invalid]))
    assert classify_reviews(["a", "b"]) == [DELIVERY, None]


def test_classifier_pads_short_response(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_gemini(monkeypatch, json.dumps([DELIVERY.model_dump()]))
    assert classify_reviews(["a", "b"]) == [DELIVERY, None]


def test_generate_recommendation_returns_text(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_gemini(monkeypatch, "Fix your delivery packaging and driver ETAs.")
    text = generate_recommendation("delivery", 3, 4.0, ["Late delivery", "Cold food"])
    assert text == "Fix your delivery packaging and driver ETAs."


def test_generate_recommendation_raises_on_empty_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_gemini(monkeypatch, "   ")
    with pytest.raises(ValueError):
        generate_recommendation("delivery", 1, 2.0, ["Late"])
