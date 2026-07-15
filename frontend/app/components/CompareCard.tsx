import type { LocationInsights } from "../types";

function ThemeList({ items }: { items: { theme: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">None</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.theme} className="flex items-center justify-between text-sm">
          <span className="capitalize">{item.theme.replace(/_/g, " ")}</span>
          <span className="text-black/50 dark:text-white/50">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CompareCard({ insights }: { insights: LocationInsights }) {
  const { sentiment_distribution: dist } = insights;

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-col gap-4">
      <h3 className="font-semibold text-lg">{insights.location}</h3>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-black/50 dark:text-white/50">Reviews</div>
          <div className="font-medium">{insights.total_reviews}</div>
        </div>
        <div>
          <div className="text-black/50 dark:text-white/50">Avg severity</div>
          <div className="font-medium">{insights.avg_severity?.toFixed(1) ?? "—"}</div>
        </div>
        <div>
          <div className="text-black/50 dark:text-white/50">Avg rating</div>
          <div className="font-medium">
            {insights.avg_rating !== null ? `${insights.avg_rating.toFixed(1)} ★` : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="text-emerald-600 dark:text-emerald-400">{dist.positive} positive</span>
        <span className="text-black/50 dark:text-white/50">{dist.neutral} neutral</span>
        <span className="text-red-500">{dist.negative} negative</span>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Top complaints</h4>
        <ThemeList items={insights.top_complaints} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Top praise</h4>
        <ThemeList items={insights.top_praise} />
      </div>
    </div>
  );
}
