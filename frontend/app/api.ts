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
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

function apiKeyHeader(): Record<string, string> {
  return API_KEY ? { "X-API-Key": API_KEY } : {};
}

// On 422 (partial classification failure) the backend nests the real payload
// under `detail` — unwrap it so callers always get the response shape they expect.
function unwrapBody<T>(response: Response, body: unknown): T {
  if (response.status === 422) {
    const detail = (body as { detail?: T } | null)?.detail;
    if (detail) return detail;
  }
  return body as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...apiKeyHeader(), ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 422) {
    const message =
      (body as { error?: string } | null)?.error ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return unwrapBody<T>(response, body);
}

export function submitReviews(texts: string[], location: string): Promise<ReviewsResponse> {
  return request<ReviewsResponse>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      reviews: texts.map((text) => ({ text, source: "manual" })),
      location,
    }),
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
    headers: apiKeyHeader(),
    body: formData,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 422) {
    const message =
      (body as { error?: string } | null)?.error ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return unwrapBody<CsvUploadResponse>(response, body);
}

export function fetchReviews(
  params: {
    page?: number;
    limit?: number;
    theme?: Theme | "";
    sentiment?: Sentiment | "";
    location?: string;
    minSeverity?: number;
  },
  signal?: AbortSignal
): Promise<ReviewListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.theme) query.set("theme", params.theme);
  if (params.sentiment) query.set("sentiment", params.sentiment);
  if (params.location) query.set("location", params.location);
  if (params.minSeverity) query.set("min_severity", String(params.minSeverity));
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
  const response = await fetch(`${API_URL}/reviews/${id}`, {
    method: "DELETE",
    headers: apiKeyHeader(),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete review ${id}`);
  }
}

export async function deleteAllReviews(): Promise<number> {
  const response = await fetch(`${API_URL}/reviews`, {
    method: "DELETE",
    headers: apiKeyHeader(),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to delete reviews");
  }
  return body?.deleted ?? 0;
}
