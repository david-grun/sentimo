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
  location: string | null;
  reviewer_name: string | null;
  rating: number | null;
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

export interface CsvUploadResponse {
  created: number;
  skipped_empty: number;
  skipped_duplicate: number;
  reviews: EnrichedReview[];
}

export interface LocationSummary {
  location: string;
  review_count: number;
  avg_rating: number | null;
}

export interface LocationsResponse {
  locations: LocationSummary[];
}

export interface ThemeCount {
  theme: string;
  count: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface LocationInsights {
  location: string;
  total_reviews: number;
  avg_severity: number | null;
  avg_rating: number | null;
  sentiment_distribution: SentimentDistribution;
  top_complaints: ThemeCount[];
  top_praise: ThemeCount[];
}

export interface CompareResponse {
  locations: LocationInsights[];
}

export interface ApiError {
  error: string;
  detail?: unknown;
}
