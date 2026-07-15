from fastapi import FastAPI, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app import config, db
from app.classifier import classify_reviews
from app.models import (
    EnrichedReview,
    Insight,
    InsightsResponse,
    ReviewItem,
    ReviewListResponse,
    ReviewsRequest,
    ReviewsResponse,
    Sentiment,
    Theme,
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


@app.get("/reviews")
def list_reviews(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    theme: Theme | None = None,
    sentiment: Sentiment | None = None,
) -> ReviewListResponse:
    params = {
        "theme": theme,
        "sentiment": sentiment,
        "limit": limit,
        "offset": (page - 1) * limit,
    }
    where = """
        (%(theme)s::text IS NULL OR c.theme = %(theme)s)
        AND (%(sentiment)s::text IS NULL OR c.sentiment = %(sentiment)s)
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
                theme=row[4],
                sentiment=row[5],
                severity=row[6],
                extracted_issue=row[7],
            )
            for row in cur.fetchall()
        ]
    return ReviewListResponse(items=items, page=page, total=total)


@app.get("/insights")
def get_insights(sentiment: Sentiment | None = None) -> InsightsResponse:
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT theme, COUNT(*), COALESCE(AVG(severity), 0)::float
            FROM classifications
            WHERE %(sentiment)s::text IS NULL OR sentiment = %(sentiment)s
            GROUP BY theme
            """,
            {"sentiment": sentiment},
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
