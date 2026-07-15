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


@pytest.fixture()
def mock_classifier(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[list[Classification | None]], None]:
    def _set(results: list[Classification | None]) -> None:
        monkeypatch.setattr("app.main.classify_reviews", lambda texts: results)

    return _set


def _upload(
    client: TestClient, csv_text: str, location: str | None = None
) -> object:
    data = {"location": location} if location is not None else {}
    return client.post(
        "/reviews/csv",
        files={"file": ("reviews.csv", csv_text, "text/csv")},
        data=data,
    )


def test_upload_csv_with_reviewer_rating_date_review_headers(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY, AMBIANCE])
    csv_text = (
        "Reviewer,Rating,Date,Review\n"
        "Jane,2,2024-01-15,Cold pizza and late delivery\n"
        "Bob,5,2024-01-16,Lovely staff\n"
    )
    response = _upload(client, csv_text, location="Vikings MOA")
    assert response.status_code == 201
    body = response.json()
    assert body["created"] == 2
    assert body["skipped_empty"] == 0
    assert body["skipped_duplicate"] == 0
    assert body["reviews"][0]["location"] == "Vikings MOA"
    assert body["reviews"][0]["reviewer_name"] == "Jane"
    assert body["reviews"][0]["rating"] == 2
    assert body["reviews"][0]["theme"] == "delivery"


def test_upload_csv_without_location_is_optional(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    response = _upload(client, "Review\nCold pizza\n")
    assert response.status_code == 201
    assert response.json()["reviews"][0]["location"] is None


def test_upload_csv_unmappable_headers_returns_400(client: TestClient) -> None:
    response = _upload(client, "Name,Score\nJane,5\n")
    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert body["detail"]["headers"] == ["Name", "Score"]


def test_upload_csv_all_empty_returns_400(client: TestClient) -> None:
    response = _upload(client, "Review\n,\n  \n")
    assert response.status_code == 400


def test_upload_csv_skips_empty_and_dedupes(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    csv_text = "Review,Rating\nCold pizza,1\nCold pizza,1\n,3\n"
    response = _upload(client, csv_text)
    assert response.status_code == 201
    body = response.json()
    assert body["created"] == 1
    assert body["skipped_duplicate"] == 1
    assert body["skipped_empty"] == 1


def test_upload_csv_partial_classification_failure_returns_422(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY, None])
    csv_text = "Review\nCold pizza\nUnclassifiable\n"
    response = _upload(client, csv_text)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["created"] == 2
    assert detail["reviews"][1]["theme"] is None
    # both still inserted
    assert client.get("/reviews").json()["total"] == 2


def test_uploaded_reviews_have_csv_source(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    _upload(client, "Review\nCold pizza\n")
    item = client.get("/reviews").json()["items"][0]
    assert item["source"] == "csv"


def test_existing_json_endpoint_still_works_without_location(
    client: TestClient, mock_classifier
) -> None:
    mock_classifier([DELIVERY])
    response = client.post("/reviews", json={"reviews": [{"text": "Cold pizza"}]})
    assert response.status_code == 201
    assert response.json()["reviews"][0]["location"] is None
