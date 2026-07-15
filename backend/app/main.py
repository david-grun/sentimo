from fastapi import FastAPI, File, Form, Query, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app import config, db
from app.classifier import classify_reviews
from app.csv_parser import CsvParseError, parse_csv
from app.models import (
    CompareResponse,
    CsvUploadResponse,
    EnrichedReview,
    Insight,
    InsightsResponse,
    LocationInsights,
    LocationsResponse,
    LocationSummary,
    ReviewItem,
    ReviewListResponse,
    ReviewsRequest,
    ReviewsResponse,
    Sentiment,
    SentimentDistribution,
    Theme,
    ThemeCount,
)

app = FastAPI(title="Sentimo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "validation error", "detail": jsonable_encoder(exc.errors())},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/reviews")
def create_reviews(payload: ReviewsRequest) -> JSONResponse:
    texts = [review.text for review in payload.reviews]

    with db.get_connection() as conn, conn.cursor() as cur:
        review_ids: list[int] = []
        for review in payload.reviews:
            cur.execute(
                "INSERT INTO reviews (text, source) VALUES (%s, %s) RETURNING id",
                (review.text, review.source),
            )
            review_ids.append(cur.fetchone()[0])

        try:
            classifications = classify_reviews(texts)
        except Exception:
            # Gemini unreachable or errored: reviews are still inserted,
            # every classification in the batch is marked failed.
            classifications = [None] * len(texts)

        enriched: list[EnrichedReview] = []
        for review_id, review, classification in zip(
            review_ids, payload.reviews, classifications
        ):
            if classification is None:
                enriched.append(EnrichedReview(id=review_id, text=review.text))
                continue
            cur.execute(
                """
                INSERT INTO classifications
                    (review_id, theme, sentiment, severity, extracted_issue, model)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    review_id,
                    classification.theme,
                    classification.sentiment,
                    classification.severity,
                    classification.extracted_issue,
                    config.GEMINI_MODEL,
                ),
            )
            enriched.append(
                EnrichedReview(id=review_id, text=review.text, **classification.model_dump())
            )

    body = ReviewsResponse(created=len(review_ids), reviews=enriched)
    if any(classification is None for classification in classifications):
        return JSONResponse(
            status_code=422,
            content={
                "error": "classification failed for some reviews",
                "detail": body.model_dump(),
            },
        )
    return JSONResponse(status_code=201, content=body.model_dump())


@app.post("/reviews/csv")
async def upload_reviews_csv(
    file: UploadFile = File(...),
    location: str | None = Form(default=None),
) -> JSONResponse:
    location = (location or "").strip() or None

    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "file is not valid UTF-8 text", "detail": None},
        )

    try:
        parsed = parse_csv(content)
    except CsvParseError as exc:
        return JSONResponse(
            status_code=400,
            content={"error": str(exc), "detail": {"headers": exc.headers}},
        )

    if not parsed.reviews:
        return JSONResponse(
            status_code=400,
            content={
                "error": "no valid reviews found in CSV",
                "detail": {
                    "skipped_empty": parsed.skipped_empty,
                    "skipped_duplicate": parsed.skipped_duplicate,
                },
            },
        )

    if len(parsed.reviews) > 50:
        return JSONResponse(
            status_code=400,
            content={"error": "max 50 reviews per batch", "detail": None},
        )

    texts = [review.text for review in parsed.reviews]

    with db.get_connection() as conn, conn.cursor() as cur:
        review_ids: list[int] = []
        for review in parsed.reviews:
            cur.execute(
                """
                INSERT INTO reviews (text, source, location, reviewer_name, rating)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (review.text, "csv", location, review.reviewer_name, review.rating),
            )
            review_ids.append(cur.fetchone()[0])

        try:
            classifications = classify_reviews(texts)
        except Exception:
            classifications = [None] * len(texts)

        enriched: list[EnrichedReview] = []
        for review_id, review, classification in zip(
            review_ids, parsed.reviews, classifications
        ):
            if classification is None:
                enriched.append(
                    EnrichedReview(
                        id=review_id,
                        text=review.text,
                        location=location,
                        reviewer_name=review.reviewer_name,
                        rating=review.rating,
                    )
                )
                continue
            cur.execute(
                """
                INSERT INTO classifications
                    (review_id, theme, sentiment, severity, extracted_issue, model)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    review_id,
                    classification.theme,
                    classification.sentiment,
                    classification.severity,
                    classification.extracted_issue,
                    config.GEMINI_MODEL,
                ),
            )
            enriched.append(
                EnrichedReview(
                    id=review_id,
                    text=review.text,
                    location=location,
                    reviewer_name=review.reviewer_name,
                    rating=review.rating,
                    **classification.model_dump(),
                )
            )

    body = CsvUploadResponse(
        created=len(review_ids),
        skipped_empty=parsed.skipped_empty,
        skipped_duplicate=parsed.skipped_duplicate,
        reviews=enriched,
    )
    if any(classification is None for classification in classifications):
        return JSONResponse(
            status_code=422,
            content={
                "error": "classification failed for some reviews",
                "detail": body.model_dump(),
            },
        )
    return JSONResponse(status_code=201, content=body.model_dump())


@app.get("/reviews")
def list_reviews(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    theme: Theme | None = None,
    sentiment: Sentiment | None = None,
    location: str | None = None,
) -> ReviewListResponse:
    params = {
        "theme": theme,
        "sentiment": sentiment,
        "location": location,
        "limit": limit,
        "offset": (page - 1) * limit,
    }
    where = """
        (%(theme)s::text IS NULL OR c.theme = %(theme)s)
        AND (%(sentiment)s::text IS NULL OR c.sentiment = %(sentiment)s)
        AND (%(location)s::text IS NULL OR r.location = %(location)s)
    """
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM reviews r
            LEFT JOIN classifications c ON c.review_id = r.id
            WHERE {where}
            """,
            params,
        )
        total: int = cur.fetchone()[0]

        cur.execute(
            f"""
            SELECT r.id, r.text, r.source, r.created_at,
                   r.location, r.reviewer_name, r.rating,
                   c.theme, c.sentiment, c.severity, c.extracted_issue
            FROM reviews r
            LEFT JOIN classifications c ON c.review_id = r.id
            WHERE {where}
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        items = [
            ReviewItem(
                id=row[0],
                text=row[1],
                source=row[2],
                created_at=row[3].isoformat(),
                location=row[4],
                reviewer_name=row[5],
                rating=row[6],
                theme=row[7],
                sentiment=row[8],
                severity=row[9],
                extracted_issue=row[10],
            )
            for row in cur.fetchall()
        ]
    return ReviewListResponse(items=items, page=page, total=total)


@app.get("/insights")
def get_insights(
    sentiment: Sentiment | None = None, location: str | None = None
) -> InsightsResponse:
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.theme, COUNT(*), COALESCE(AVG(c.severity), 0)::float
            FROM classifications c
            JOIN reviews r ON r.id = c.review_id
            WHERE (%(sentiment)s::text IS NULL OR c.sentiment = %(sentiment)s)
              AND (%(location)s::text IS NULL OR r.location = %(location)s)
            GROUP BY c.theme
            """,
            {"sentiment": sentiment, "location": location},
        )
        insights = [
            Insight(
                theme=row[0],
                count=row[1],
                avg_severity=round(row[2], 2),
                score=round(row[1] * row[2], 2),
            )
            for row in cur.fetchall()
        ]
    insights.sort(key=lambda insight: insight.score, reverse=True)
    return InsightsResponse(insights=insights)


@app.get("/locations")
def list_locations() -> LocationsResponse:
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT location, COUNT(*), AVG(rating)::float
            FROM reviews
            WHERE location IS NOT NULL
            GROUP BY location
            ORDER BY location
            """
        )
        locations = [
            LocationSummary(
                location=row[0],
                review_count=row[1],
                avg_rating=round(row[2], 2) if row[2] is not None else None,
            )
            for row in cur.fetchall()
        ]
    return LocationsResponse(locations=locations)


@app.get("/insights/compare")
def compare_locations(locations: str) -> JSONResponse:
    requested = [loc.strip() for loc in locations.split(",") if loc.strip()]
    if len(requested) != 2:
        return JSONResponse(
            status_code=400,
            content={
                "error": "locations must contain exactly two comma-separated values",
                "detail": {"received": requested},
            },
        )

    with db.get_connection() as conn, conn.cursor() as cur:
        results: list[LocationInsights] = []
        for location in requested:
            cur.execute(
                "SELECT COUNT(*), AVG(rating)::float FROM reviews WHERE location = %s",
                (location,),
            )
            total_reviews, avg_rating = cur.fetchone()

            cur.execute(
                """
                SELECT COALESCE(AVG(c.severity), 0)::float
                FROM classifications c
                JOIN reviews r ON r.id = c.review_id
                WHERE r.location = %s
                """,
                (location,),
            )
            (avg_severity,) = cur.fetchone()

            cur.execute(
                """
                SELECT c.sentiment, COUNT(*)
                FROM classifications c
                JOIN reviews r ON r.id = c.review_id
                WHERE r.location = %s
                GROUP BY c.sentiment
                """,
                (location,),
            )
            counts = {row[0]: row[1] for row in cur.fetchall()}
            sentiment_distribution = SentimentDistribution(
                positive=counts.get("positive", 0),
                neutral=counts.get("neutral", 0),
                negative=counts.get("negative", 0),
            )

            def _top_themes(sentiment: str) -> list[ThemeCount]:
                cur.execute(
                    """
                    SELECT c.theme, COUNT(*) AS n
                    FROM classifications c
                    JOIN reviews r ON r.id = c.review_id
                    WHERE r.location = %s AND c.sentiment = %s
                    GROUP BY c.theme
                    ORDER BY n DESC
                    LIMIT 3
                    """,
                    (location, sentiment),
                )
                return [ThemeCount(theme=row[0], count=row[1]) for row in cur.fetchall()]

            results.append(
                LocationInsights(
                    location=location,
                    total_reviews=total_reviews,
                    avg_severity=round(avg_severity, 2) if total_reviews else None,
                    avg_rating=round(avg_rating, 2) if avg_rating is not None else None,
                    sentiment_distribution=sentiment_distribution,
                    top_complaints=_top_themes("negative"),
                    top_praise=_top_themes("positive"),
                )
            )

    return JSONResponse(
        status_code=200, content=CompareResponse(locations=results).model_dump()
    )


@app.delete("/reviews/{review_id}")
def delete_review(review_id: int) -> JSONResponse:
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM reviews WHERE id = %s RETURNING id", (review_id,))
        deleted = cur.fetchone()
    if deleted is None:
        return JSONResponse(
            status_code=404,
            content={"error": "review not found", "detail": {"id": review_id}},
        )
    return Response(status_code=204)
