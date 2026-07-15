"use client";

import { useEffect, useState } from "react";
import { fetchInsights, fetchLocations } from "../../api";
import CriticalAlerts from "../../components/CriticalAlerts";
import InsightCard from "../../components/InsightCard";
import LocationFilter from "../../components/LocationFilter";
import ReviewForm from "../../components/ReviewForm";
import SentimentFilter from "../../components/SentimentFilter";
import type { Insight, LocationSummary, Sentiment } from "../../types";

export default function DashboardPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment | "">("negative");
  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadInsights(signal?: AbortSignal) {
    try {
      const result = await fetchInsights(sentiment, location, signal);
      setInsights(result.insights);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load insights.");
    }
  }

  async function loadLocations() {
    try {
      const result = await fetchLocations();
      setLocations(result.locations);
    } catch {
      setLocations([]);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadInsights(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentiment, location]);

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleSubmitted() {
    await loadInsights();
    await loadLocations();
    setRefreshKey((k) => k + 1);
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste reviews or upload a CSV — Sentimo classifies them and ranks what to fix first.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          Submit reviews
        </h2>
        <ReviewForm onSubmitted={handleSubmitted} />
      </section>

      <CriticalAlerts key={refreshKey} location={location} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Fix this first</h2>
          <div className="flex items-center gap-3">
            <LocationFilter value={location} onChange={setLocation} locations={locations} />
            <SentimentFilter value={sentiment} onChange={setSentiment} />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {insights.length === 0 && !error ? (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
            {sentiment === "negative"
              ? "No negative reviews yet — nothing to fix. Switch the filter to see other sentiments."
              : "No insights yet — submit some reviews above."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.theme}
                insight={insight}
                sentiment={sentiment}
                location={location}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
