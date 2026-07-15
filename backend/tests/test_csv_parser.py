import pytest

from app.csv_parser import CsvParseError, parse_csv


def test_maps_reviewer_rating_date_review_headers() -> None:
    csv_text = (
        "Reviewer,Rating,Date,Review\n"
        "Jane,5,2024-01-15,Great food and service\n"
        "Bob,3,01/16/2024,It was okay\n"
    )
    result = parse_csv(csv_text)
    assert len(result.reviews) == 2
    assert result.reviews[0].text == "Great food and service"
    assert result.reviews[0].rating == 5
    assert result.reviews[0].date == "2024-01-15"
    assert result.reviews[0].reviewer_name == "Jane"
    assert result.reviews[1].date == "2024-01-16"


def test_maps_alternate_header_names() -> None:
    csv_text = "author,score,timestamp,comment\nAlice,4,2024-02-01,Loved it\n"
    result = parse_csv(csv_text)
    assert len(result.reviews) == 1
    assert result.reviews[0].text == "Loved it"
    assert result.reviews[0].rating == 4
    assert result.reviews[0].reviewer_name == "Alice"


def test_case_insensitive_header_matching() -> None:
    csv_text = "REVIEW\nGood stuff\n"
    result = parse_csv(csv_text)
    assert len(result.reviews) == 1
    assert result.reviews[0].text == "Good stuff"


def test_missing_text_column_raises_clear_error() -> None:
    csv_text = "Name,Score\nJane,5\n"
    with pytest.raises(CsvParseError) as exc_info:
        parse_csv(csv_text)
    assert exc_info.value.headers == ["Name", "Score"]
    assert "Name" in str(exc_info.value)
    assert "Score" in str(exc_info.value)


def test_skips_rows_with_empty_review_text() -> None:
    csv_text = "Review,Rating\nGreat,5\n,3\n   ,4\nAlso great,4\n"
    result = parse_csv(csv_text)
    assert len(result.reviews) == 2
    assert result.skipped_empty == 2


def test_deduplicates_exact_matches() -> None:
    csv_text = "Review\nSame review\nSame review\nDifferent review\n"
    result = parse_csv(csv_text)
    assert len(result.reviews) == 2
    assert result.skipped_duplicate == 1


def test_strips_whitespace() -> None:
    csv_text = "Review,Reviewer\n  padded text  ,  Jane  \n"
    result = parse_csv(csv_text)
    assert result.reviews[0].text == "padded text"
    assert result.reviews[0].reviewer_name == "Jane"


def test_rating_out_of_range_becomes_none() -> None:
    csv_text = "Review,Rating\nText here,10\nOther text,not-a-number\n"
    result = parse_csv(csv_text)
    assert result.reviews[0].rating is None
    assert result.reviews[1].rating is None


def test_unparseable_date_becomes_none() -> None:
    csv_text = "Review,Date\nText here,not-a-date\n"
    result = parse_csv(csv_text)
    assert result.reviews[0].date is None


def test_missing_optional_columns_still_works() -> None:
    csv_text = "Review\nJust a review\n"
    result = parse_csv(csv_text)
    assert len(result.reviews) == 1
    assert result.reviews[0].rating is None
    assert result.reviews[0].date is None
    assert result.reviews[0].reviewer_name is None
