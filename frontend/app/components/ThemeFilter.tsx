"use client";

import { THEMES, type Theme } from "../types";

export default function ThemeFilter({
  value,
  onChange,
}: {
  value: Theme | "";
  onChange: (value: Theme | "") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Theme | "")}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">all themes</option>
      {THEMES.map((theme) => (
        <option key={theme} value={theme}>
          {theme.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
