import type { ReviewItem, Sentiment } from "../types";

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "bg-emerald-50 text-emerald-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-rose-50 text-rose-700",
};

function severityStyle(severity: number): string {
  if (severity >= 4) return "bg-rose-50 text-rose-700";
  if (severity >= 3) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function ReviewRow({
  review,
  onDelete,
}: {
  review: ReviewItem;
  onDelete: (id: number) => void;
}) {
  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
      <td className="py-3 pr-4 max-w-md text-slate-700">{review.text}</td>
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
      <td className="py-3 pr-4">
        {review.severity !== null ? (
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${severityStyle(review.severity)}`}
          >
            {review.severity}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
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
