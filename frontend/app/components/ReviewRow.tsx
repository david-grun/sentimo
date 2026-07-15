"use client";

import { useState } from "react";
import type { ReviewItem, Sentiment } from "../types";

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "bg-emerald-50 text-emerald-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-rose-50 text-rose-700",
};

export default function ReviewRow({
  review,
  onDelete,
}: {
  review: ReviewItem;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview =
    review.text.length > 80 ? `${review.text.slice(0, 80)}...` : review.text;

  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
      <td
        className="py-3 pr-4 max-w-sm cursor-pointer text-slate-700"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? review.text : preview}
      </td>
      <td className="py-3 pr-4 text-slate-500">{review.location ?? "—"}</td>
      <td className="py-3 pr-4 capitalize text-slate-700">
        {review.theme?.replace(/_/g, " ") ?? "—"}
      </td>
      <td className="py-3 pr-4">
        {review.sentiment ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SENTIMENT_STYLES[review.sentiment]}`}
          >
            {review.sentiment}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        {review.rating !== null && (
          <span className="ml-2 text-amber-500 text-xs">{"★".repeat(review.rating)}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-slate-700">{review.severity ?? "—"}</td>
      <td className="py-3 pr-4">
        <button
          onClick={() => onDelete(review.id)}
          className="text-rose-600 hover:underline text-sm font-medium"
        >
          delete
        </button>
      </td>
    </tr>
  );
}
