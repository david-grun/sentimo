from typing import Literal

from pydantic import BaseModel, Field

Theme = Literal[
    "delivery",
    "product_quality",
    "customer_service",
    "pricing",
    "ambiance",
    "cleanliness",
    "communication",
    "other",
]

Sentiment = Literal["positive", "neutral", "negative"]


class ReviewIn(BaseModel):
    text: str = Field(min_length=1)
    source: str = Field(default="manual", max_length=50)


class ReviewsRequest(BaseModel):
    reviews: list[ReviewIn] = Field(min_length=1, max_length=50)


class Classification(BaseModel):
    theme: Theme
    sentiment: Sentiment
    severity: int = Field(ge=1, le=5)
    extracted_issue: str


class EnrichedReview(BaseModel):
    id: int
    text: str
    location: str | None = None
    reviewer_name: str | None = None
    rating: int | None = None

    theme: Theme | None = None
    sentiment: Sentiment | None = None
    severity: int | None = None
    extracted_issue: str | None = None


class ReviewsResponse(BaseModel):
    created: int
    skipped_duplicate: int = 0
    reviews: list[EnrichedReview]


class CsvUploadResponse(BaseModel):
    created: int
    skipped_empty: int
    skipped_duplicate: int
    reviews: list[EnrichedReview]


class ReviewItem(BaseModel):
    id: int
    text: str
    source: str
    created_at: str
    location: str | None = None
    reviewer_name: str | None = None
    rating: int | None = None
    theme: Theme | None = None
    sentiment: Sentiment | None = None
    severity: int | None = None
    extracted_issue: str | None = None


class ReviewListResponse(BaseModel):
    items: list[ReviewItem]
    page: int
    total: int


class Insight(BaseModel):
    theme: str
    count: int
    avg_severity: float
    score: float


class InsightsResponse(BaseModel):
    insights: list[Insight]


class RecommendationResponse(BaseModel):
    theme: str
    recommendation: str


class LocationSummary(BaseModel):
    location: str
    review_count: int
    avg_rating: float | None = None


class LocationsResponse(BaseModel):
    locations: list[LocationSummary]


class ThemeCount(BaseModel):
    theme: str
    count: int


class SentimentDistribution(BaseModel):
    positive: int
    neutral: int
    negative: int


class LocationInsights(BaseModel):
    location: str
    total_reviews: int
    avg_severity: float | None = None
    avg_rating: float | None = None
    sentiment_distribution: SentimentDistribution
    top_complaints: list[ThemeCount]
    top_praise: list[ThemeCount]


class CompareResponse(BaseModel):
    locations: list[LocationInsights]
