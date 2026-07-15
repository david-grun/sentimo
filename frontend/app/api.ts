import type {
  InsightsResponse,
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

export function fetchReviews(params: {
  page?: number;
  limit?: number;
  theme?: Theme | "";
  sentiment?: Sentiment | "";
}): Promise<ReviewListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.theme) query.set("theme", params.theme);
  if (params.sentiment) query.set("sentiment", params.sentiment);
  return request<ReviewListResponse>(`/reviews?${query.toString()}`);
}

export function fetchInsights(sentiment?: Sentiment | ""): Promise<InsightsResponse> {
  const query = new URLSearchParams();
  if (sentiment) query.set("sentiment", sentiment);
  return request<InsightsResponse>(`/insights?${query.toString()}`);
}

export async function deleteReview(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/reviews/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete review ${id}`);
  }
}
