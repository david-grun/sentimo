import csv
import io
from dataclasses import dataclass
from datetime import datetime

TEXT_COLUMNS = {"review", "text", "review_text", "comment", "body", "feedback"}
RATING_COLUMNS = {"rating", "stars", "star_rating", "score"}
DATE_COLUMNS = {"date", "review_date", "posted_at", "created_at", "timestamp"}
REVIEWER_COLUMNS = {"reviewer", "reviewer_name", "author", "name", "user"}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%B %d, %Y",
    "%b %d, %Y",
]


class CsvParseError(Exception):
    """Raised when the review text column can't be auto-mapped."""

    def __init__(self, headers: list[str]) -> None:
        self.headers = headers
        found = ", ".join(headers) if headers else "(no headers found)"
        super().__init__(f"Could not find a review text column. Headers found: {found}")


@dataclass
class ParsedReview:
    text: str
    rating: int | None = None
    date: str | None = None
    reviewer_name: str | None = None


@dataclass
class ParsedCsv:
    reviews: list[ParsedReview]
    skipped_empty: int
    skipped_duplicate: int


def _normalize_header(header: str) -> str:
    return header.strip().lower().replace(" ", "_")


def _map_headers(fieldnames: list[str]) -> dict[str, str]:
    """Map internal field name -> the actual CSV column name that matched it."""
    mapping: dict[str, str] = {}
    groups = {
        "text": TEXT_COLUMNS,
        "rating": RATING_COLUMNS,
        "date": DATE_COLUMNS,
        "reviewer_name": REVIEWER_COLUMNS,
    }
    for raw_header in fieldnames:
        normalized = _normalize_header(raw_header)
        for field_name, synonyms in groups.items():
            if field_name not in mapping and normalized in synonyms:
                mapping[field_name] = raw_header
    return mapping


def _parse_rating(raw: str | None) -> int | None:
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    try:
        value = round(float(raw))
    except ValueError:
        return None
    if 1 <= value <= 5:
        return value
    return None


def _parse_date(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_csv(content: str) -> ParsedCsv:
    """Parse CSV text into reviews, auto-mapping headers to internal fields.

    Raises CsvParseError if no review-text column can be identified.
    """
    reader = csv.DictReader(io.StringIO(content))
    fieldnames = reader.fieldnames or []
    mapping = _map_headers(fieldnames)

    if "text" not in mapping:
        raise CsvParseError(headers=fieldnames)

    reviews: list[ParsedReview] = []
    seen: set[str] = set()
    skipped_empty = 0
    skipped_duplicate = 0

    for row in reader:
        text = (row.get(mapping["text"]) or "").strip()
        if not text:
            skipped_empty += 1
            continue
        if text in seen:
            skipped_duplicate += 1
            continue
        seen.add(text)

        rating = _parse_rating(row.get(mapping["rating"])) if "rating" in mapping else None
        date = _parse_date(row.get(mapping["date"])) if "date" in mapping else None
        reviewer_name: str | None = None
        if "reviewer_name" in mapping:
            raw_name = (row.get(mapping["reviewer_name"]) or "").strip()
            reviewer_name = raw_name or None

        reviews.append(
            ParsedReview(text=text, rating=rating, date=date, reviewer_name=reviewer_name)
        )

    return ParsedCsv(
        reviews=reviews, skipped_empty=skipped_empty, skipped_duplicate=skipped_duplicate
    )
