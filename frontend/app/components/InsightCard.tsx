"use client";

import { useState } from "react";
import { fetchRecommendation } from "../api";
import type { Insight, Sentiment } from "../types";
import SeverityBar from "./SeverityBar";

export default function InsightCard({
  insight,
  sentiment,
  location,
}: {
  insight: Insight;
  sentiment?: Sentiment | "";
  location?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (recommendation || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecommendation(insight.theme, sentiment, location);
      setRecommendation(result.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recommendation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold capitalize text-slate-900">
          {insight.theme.replace(/_/g, " ")}
        </h3>
        <span
          className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 cursor-help"
          title="score = review count × average severity"
        >
          score {insight.score.toFixed(1)}
        </span>
      </div>
      <SeverityBar severity={insight.avg_severity} />
      <div className="flex justify-between text-sm text-slate-500">
        <span>{insight.count} review{insight.count === 1 ? "" : "s"}</span>
        <span
          className="cursor-help"
          title="1 (mild) – 5 (critical): how urgently Gemini judged these reviews need action."
        >
          avg severity {insight.avg_severity.toFixed(1)}
        </span>
      </div>

      <button
        onClick={toggle}
        className="flex items-center gap-1.5 self-start text-xs font-medium text-indigo-600 hover:text-indigo-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {expanded ? "Hide recommendation" : "What should I do about this?"}
      </button>

      {expanded && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-600">
          {loading && "Thinking..."}
          {error && <span className="text-rose-600">{error}</span>}
          {!loading && !error && recommendation}
        </div>
      )}
    </div>
  );
}
