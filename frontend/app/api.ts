import type {
  CompareResponse,
  CsvUploadResponse,
  InsightsResponse,
  LocationsResponse,
  RecommendationResponse,
  ReviewListResponse,
  ReviewsResponse,
  Sentiment,
  Theme,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 422) {
    const message = body?.error ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function submitReviews(texts: string[]): Promise<ReviewsResponse> {
  return request<ReviewsResponse>("/reviews", {
    method: "POST",
    body: JSON.stringify({ reviews: texts.map((text) => ({ text, source: "manual" })) }),
  });
}

export async function uploadReviewsCsv(
  file: File,
  location: string
): Promise<CsvUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (location) formData.append("location", location);

  const response = await fetch(`${API_URL}/reviews/csv`, {
    method: "POST",
    body: formData,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 422) {
    const message = body?.error ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return body as CsvUploadResponse;
}

export function fetchReviews(
  params: {
    page?: number;
    limit?: number;
    theme?: Theme | "";
    sentiment?: Sentiment | "";
    location?: string;
  },
  signal?: AbortSignal
): Promise<ReviewListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.theme) query.set("theme", params.theme);
  if (params.sentiment) query.set("sentiment", params.sentiment);
  if (params.location) query.set("location", params.location);
  return request<ReviewListResponse>(`/reviews?${query.toString()}`, { signal });
}

export function fetchInsights(
  sentiment?: Sentiment | "",
  location?: string,
  signal?: AbortSignal
): Promise<InsightsResponse> {
  const query = new URLSearchParams();
  if (sentiment) query.set("sentiment", sentiment);
  if (location) query.set("location", location);
  return request<InsightsResponse>(`/insights?${query.toString()}`, { signal });
}

export function fetchRecommendation(
  theme: string,
  sentiment?: Sentiment | "",
  location?: string
): Promise<RecommendationResponse> {
  const query = new URLSearchParams();
  if (sentiment) query.set("sentiment", sentiment);
  if (location) query.set("location", location);
  return request<RecommendationResponse>(
    `/insights/${encodeURIComponent(theme)}/recommendation?${query.toString()}`
  );
}

export function fetchLocations(): Promise<LocationsResponse> {
  return request<LocationsResponse>("/locations");
}

export function compareLocations(
  locationA: string,
  locationB: string
): Promise<CompareResponse> {
  const query = new URLSearchParams({ locations: `${locationA},${locationB}` });
  return request<CompareResponse>(`/insights/compare?${query.toString()}`);
}

export async function deleteReview(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/reviews/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete review ${id}`);
  }
}
