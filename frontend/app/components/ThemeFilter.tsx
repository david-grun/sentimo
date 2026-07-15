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
      className="rounded-full border border-black/20 dark:border-white/20 bg-transparent px-3 py-1 text-sm"
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
