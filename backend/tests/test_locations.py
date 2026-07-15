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


def _upload(client: TestClient, csv_text: str, location: str) -> object:
    return client.post(
        "/reviews/csv",
        files={"file": ("reviews.csv", csv_text, "text/csv")},
        data={"location": location},
    )


def _seed_two_locations(client: TestClient, mock_classifier) -> None:
    mock_classifier([DELIVERY, AMBIANCE])
    _upload(
        client,
        "Rating,Review\n1,Cold pizza and late delivery\n5,Lovely staff\n",
        location="Vikings MOA",
    )
    mock_classifier([DELIVERY, PRICING])
    _upload(
        client,
        "Rating,Review\n2,Also cold and late\n2,Way too expensive\n",
        location="Vikings North EDSA",
    )


def test_locations_endpoint_returns_counts_and_avg_rating(
    client: TestClient, mock_classifier
) -> None:
    _seed_two_locations(client, mock_classifier)
    body = client.get("/locations").json()
    by_name = {loc["location"]: loc for loc in body["locations"]}
    assert by_name["Vikings MOA"]["review_count"] == 2
    assert by_name["Vikings MOA"]["avg_rating"] == 3.0
    assert by_name["Vikings North EDSA"]["review_count"] == 2


def test_manual_reviews_appear_in_locations(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    response = client.post(
        "/reviews",
        json={"reviews": [{"text": "Cold pizza"}], "location": "Main Branch"},
    )
    assert response.status_code == 201
    locations = client.get("/locations").json()["locations"]
    assert [loc["location"] for loc in locations] == ["Main Branch"]


def test_reviews_filter_by_location(client: TestClient, mock_classifier) -> None:
    _seed_two_locations(client, mock_classifier)
    result = client.get("/reviews", params={"location": "Vikings MOA"}).json()
    assert result["total"] == 2
    assert all(item["location"] == "Vikings MOA" for item in result["items"])


def test_insights_filter_by_location(client: TestClient, mock_classifier) -> None:
    _seed_two_locations(client, mock_classifier)
    result = client.get("/insights", params={"location": "Vikings North EDSA"}).json()
    themes = {insight["theme"] for insight in result["insights"]}
    assert themes == {"delivery", "pricing"}


def test_compare_two_locations(client: TestClient, mock_classifier) -> None:
    _seed_two_locations(client, mock_classifier)
    result = client.get(
        "/insights/compare",
        params={"locations": "Vikings MOA,Vikings North EDSA"},
    ).json()
    assert len(result["locations"]) == 2

    moa = result["locations"][0]
    assert moa["location"] == "Vikings MOA"
    assert moa["total_reviews"] == 2
    assert moa["avg_rating"] == 3.0
    assert moa["sentiment_distribution"] == {"positive": 1, "neutral": 0, "negative": 1}
    assert moa["top_complaints"] == [{"theme": "delivery", "count": 1}]
    assert moa["top_praise"] == [{"theme": "ambiance", "count": 1}]

    edsa = result["locations"][1]
    assert edsa["location"] == "Vikings North EDSA"
    assert edsa["total_reviews"] == 2
    assert edsa["sentiment_distribution"] == {"positive": 0, "neutral": 0, "negative": 2}
    complaint_themes = {c["theme"] for c in edsa["top_complaints"]}
    assert complaint_themes == {"delivery", "pricing"}


def test_compare_requires_exactly_two_locations(client: TestClient) -> None:
    response = client.get("/insights/compare", params={"locations": "Only One"})
    assert response.status_code == 400


def test_compare_unknown_location_returns_zeroed_stats(
    client: TestClient, mock_classifier
) -> None:
    _seed_two_locations(client, mock_classifier)
    result = client.get(
        "/insights/compare",
        params={"locations": "Vikings MOA,Nonexistent Branch"},
    ).json()
    ghost = result["locations"][1]
    assert ghost["total_reviews"] == 0
    assert ghost["avg_severity"] is None
    assert ghost["avg_rating"] is None
    assert ghost["top_complaints"] == []
