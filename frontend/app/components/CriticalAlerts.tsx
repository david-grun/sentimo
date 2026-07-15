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
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          className="h-5 w-5 text-rose-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-rose-900">Needs immediate attention</h2>
      </div>
      <p className="text-xs text-rose-700 -mt-2">
        Individual reviews rated severity 4-5 — these can get diluted when averaged into a
        theme, so they&apos;re surfaced here regardless of category.
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg bg-white border border-rose-100 px-3 py-2.5 flex items-start gap-3"
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
              {item.severity}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-slate-800">{item.text}</span>
              <span className="text-xs text-slate-400 capitalize">
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
