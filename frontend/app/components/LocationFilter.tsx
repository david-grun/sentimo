"use client";

import type { LocationSummary } from "../types";

export default function LocationFilter({
  value,
  onChange,
  locations,
}: {
  value: string;
  onChange: (value: string) => void;
  locations: LocationSummary[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">all locations</option>
      {locations.map((loc) => (
        <option key={loc.location} value={loc.location}>
          {loc.location}
        </option>
      ))}
    </select>
  );
}
