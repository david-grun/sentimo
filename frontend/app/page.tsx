"use client";

import { useEffect, useState } from "react";
import { fetchInsights } from "./api";
import InsightCard from "./components/InsightCard";
import ReviewForm from "./components/ReviewForm";
import SentimentFilter from "./components/SentimentFilter";
import type { Insight, Sentiment } from "./types";

export default function DashboardPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment | "">("");
  const [error, setError] = useState<string | null>(null);

  async function loadInsights() {
    try {
      const result = await fetchInsights(sentiment);
      setInsights(result.insights);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights.");
    }
  }

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentiment]);

  return (
    <main className="max-w-3xl mx-auto p-8 flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Submit reviews</h1>
        <ReviewForm onSubmitted={loadInsights} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Fix this first</h2>
          <SentimentFilter value={sentiment} onChange={setSentiment} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {insights.length === 0 && !error ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No insights yet — submit some reviews above.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard key={insight.theme} insight={insight} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
