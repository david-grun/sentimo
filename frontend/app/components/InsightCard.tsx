import type { Insight } from "../types";
import SeverityBar from "./SeverityBar";

export default function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold capitalize text-slate-900">
          {insight.theme.replace(/_/g, " ")}
        </h3>
        <span
          className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 cursor-help"
          title="score = review count × average severity"
        >
          score {insight.score.toFixed(1)}
        </span>
      </div>
      <SeverityBar severity={insight.avg_severity} />
      <div className="flex justify-between text-sm text-slate-500">
        <span>{insight.count} review{insight.count === 1 ? "" : "s"}</span>
        <span
          className="cursor-help"
          title="1 (mild) – 5 (critical): how urgently Gemini judged these reviews need action."
        >
          avg severity {insight.avg_severity.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
