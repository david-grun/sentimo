"use client";

import { useState } from "react";
import type { ReviewItem } from "../types";

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
    <tr className="border-b border-black/10 dark:border-white/10 align-top">
      <td className="py-2 pr-4 max-w-sm cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        {expanded ? review.text : preview}
      </td>
      <td className="py-2 pr-4 capitalize">{review.theme?.replace(/_/g, " ") ?? "—"}</td>
      <td className="py-2 pr-4 capitalize">{review.sentiment ?? "—"}</td>
      <td className="py-2 pr-4">{review.severity ?? "—"}</td>
      <td className="py-2 pr-4">
        <button
          onClick={() => onDelete(review.id)}
          className="text-red-500 hover:underline text-sm"
        >
          delete
        </button>
      </td>
    </tr>
  );
}
