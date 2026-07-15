import type { Insight } from "../types";
import SeverityBar from "./SeverityBar";

export default function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold capitalize">
          {insight.theme.replace(/_/g, " ")}
        </h3>
        <span className="text-sm text-black/50 dark:text-white/50">
          score {insight.score.toFixed(1)}
        </span>
      </div>
      <SeverityBar severity={insight.avg_severity} />
      <div className="flex justify-between text-sm text-black/60 dark:text-white/60">
        <span>{insight.count} review{insight.count === 1 ? "" : "s"}</span>
        <span>avg severity {insight.avg_severity.toFixed(1)}</span>
      </div>
    </div>
  );
}
