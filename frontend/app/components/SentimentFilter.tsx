"use client";

import type { Sentiment } from "../types";

const OPTIONS: (Sentiment | "")[] = ["", "positive", "neutral", "negative"];

export default function SentimentFilter({
  value,
  onChange,
}: {
  value: Sentiment | "";
  onChange: (value: Sentiment | "") => void;
}) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((option) => (
        <button
          key={option || "all"}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
            value === option
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option === "" ? "all" : option}
        </button>
      ))}
    </div>
  );
}
