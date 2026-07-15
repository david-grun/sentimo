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
    <div className="flex gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option || "all"}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-sm border transition-colors ${
            value === option
              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
              : "border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          }`}
        >
          {option === "" ? "all" : option}
        </button>
      ))}
    </div>
  );
}
