"use client";

import { useEffect, useState } from "react";
import { fetchReviews } from "../api";
import type { ReviewItem } from "../types";

export default function CriticalAlerts({ location }: { location: string }) {
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReviews({ minSeverity: 4, limit: 5, location }, controller.signal)
      .then((result) => setItems(result.items))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setItems([]);
      });
    return () => controller.abort();
  }, [location]);

  if (items.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-rose-200 bg-white p-4 shadow-card flex flex-col gap-3"
      title="Individual reviews rated severity 4-5, surfaced regardless of theme so they can't get diluted by averages."
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            className="h-4 w-4 text-rose-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-slate-900">Critical alerts</h2>
        </div>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
          {items.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 flex items-start gap-2.5"
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold mt-0.5">
              {item.severity}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                {item.text}
              </span>
              <span className="text-[11px] text-slate-400 capitalize">
                {item.theme?.replace(/_/g, " ")}
                {item.location ? ` · ${item.location}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
