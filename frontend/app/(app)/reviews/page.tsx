"use client";

import { useEffect, useState } from "react";
import { deleteReview, fetchLocations, fetchReviews } from "../../api";
import LocationFilter from "../../components/LocationFilter";
import ReviewRow from "../../components/ReviewRow";
import SentimentFilter from "../../components/SentimentFilter";
import ThemeFilter from "../../components/ThemeFilter";
import type { LocationSummary, ReviewItem, Sentiment, Theme } from "../../types";

const PAGE_SIZE = 20;

export default function ReviewsPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<Theme | "">("");
  const [sentiment, setSentiment] = useState<Sentiment | "">("");
  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    try {
      const result = await fetchReviews({ page, limit: PAGE_SIZE, theme, sentiment, location }, signal);
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load reviews.");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, theme, sentiment, location]);

  useEffect(() => {
    fetchLocations()
      .then((result) => setLocations(result.locations))
      .catch(() => setLocations([]));
  }, []);

  async function handleDelete(id: number) {
    await deleteReview(id);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="max-w-6xl mx-auto px-8 py-10 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">{total} review{total === 1 ? "" : "s"} total</p>
        </div>
        <div className="flex items-center gap-3">
          <LocationFilter
            value={location}
            onChange={(value) => {
              setLocation(value);
              setPage(1);
            }}
            locations={locations}
          />
          <ThemeFilter
            value={theme}
            onChange={(value) => {
              setTheme(value);
              setPage(1);
            }}
          />
          <SentimentFilter
            value={sentiment}
            onChange={(value) => {
              setSentiment(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="py-3 px-4 font-medium">Review</th>
              <th className="py-3 px-4 font-medium">Location</th>
              <th className="py-3 px-4 font-medium">Theme</th>
              <th className="py-3 px-4 font-medium">Sentiment</th>
              <th className="py-3 px-4 font-medium">Severity</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ReviewRow key={item.id} review={item} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>

        {items.length === 0 && !error && (
          <p className="text-sm text-slate-500 px-4 py-10 text-center">No reviews found.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            next
          </button>
        </div>
      </div>
    </main>
  );
}
