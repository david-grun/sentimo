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

    theme: Theme | None = None
    sentiment: Sentiment | None = None
    severity: int | None = None
    extracted_issue: str | None = None


class ReviewsResponse(BaseModel):
    created: int
    reviews: list[EnrichedReview]


class ReviewItem(BaseModel):
    id: int
    text: str
    source: str
    created_at: str
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
