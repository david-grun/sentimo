export type Theme =
  | "delivery"
  | "product_quality"
  | "customer_service"
  | "pricing"
  | "ambiance"
  | "cleanliness"
  | "communication"
  | "other";

export type Sentiment = "positive" | "neutral" | "negative";

export const THEMES: Theme[] = [
  "delivery",
  "product_quality",
  "customer_service",
  "pricing",
  "ambiance",
  "cleanliness",
  "communication",
  "other",
];

export const SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative"];

export interface EnrichedReview {
  id: number;
  text: string;
  theme: Theme | null;
  sentiment: Sentiment | null;
  severity: number | null;
  extracted_issue: string | null;
}

export interface ReviewItem extends EnrichedReview {
  source: string;
  created_at: string;
}

export interface ReviewListResponse {
  items: ReviewItem[];
  page: number;
  total: number;
}

export interface Insight {
  theme: string;
  count: number;
  avg_severity: number;
  score: number;
}

export interface InsightsResponse {
  insights: Insight[];
}

export interface ReviewsResponse {
  created: number;
  reviews: EnrichedReview[];
}

export interface ApiError {
  error: string;
  detail?: unknown;
}
