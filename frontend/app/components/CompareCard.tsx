import type { LocationInsights } from "../types";

function ThemeList({ items }: { items: { theme: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">None</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.theme} className="flex items-center justify-between text-sm">
          <span className="capitalize text-slate-700">{item.theme.replace(/_/g, " ")}</span>
          <span className="text-slate-400">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CompareCard({ insights }: { insights: LocationInsights }) {
  const { sentiment_distribution: dist } = insights;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card flex flex-col gap-4">
      <h3 className="font-semibold text-lg text-slate-900">{insights.location}</h3>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-slate-400">Reviews</div>
          <div className="font-medium text-slate-900">{insights.total_reviews}</div>
        </div>
        <div>
          <div className="text-slate-400">Avg severity</div>
          <div className="font-medium text-slate-900">{insights.avg_severity?.toFixed(1) ?? "—"}</div>
        </div>
        <div>
          <div className="text-slate-400">Avg rating</div>
          <div className="font-medium text-slate-900">
            {insights.avg_rating !== null ? `${insights.avg_rating.toFixed(1)} ★` : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="text-emerald-600 font-medium">{dist.positive} positive</span>
        <span className="text-slate-400">{dist.neutral} neutral</span>
        <span className="text-rose-600 font-medium">{dist.negative} negative</span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Top complaints</h4>
        <ThemeList items={insights.top_complaints} />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Top praise</h4>
        <ThemeList items={insights.top_praise} />
      </div>
    </div>
  );
}
