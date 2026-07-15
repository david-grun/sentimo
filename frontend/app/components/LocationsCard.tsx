import type { LocationSummary } from "../types";

export default function LocationsCard({ locations }: { locations: LocationSummary[] }) {
  if (locations.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-900">Locations</h2>
      <ul className="flex flex-col gap-2">
        {locations.map((loc) => (
          <li key={loc.location} className="flex items-center justify-between text-sm">
            <span className="text-slate-700 truncate">{loc.location}</span>
            <span className="text-slate-400 text-xs shrink-0 ml-2">
              {loc.review_count} review{loc.review_count === 1 ? "" : "s"}
              {loc.avg_rating !== null ? ` · ${loc.avg_rating.toFixed(1)} ★` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
