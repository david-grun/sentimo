"use client";

import { useEffect, useState } from "react";
import { compareLocations, fetchLocations } from "../api";
import CompareCard from "../components/CompareCard";
import type { CompareResponse, LocationSummary } from "../types";

export default function ComparePage() {
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [locationA, setLocationA] = useState("");
  const [locationB, setLocationB] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations()
      .then((res) => setLocations(res.locations))
      .catch(() => setLocations([]));
  }, []);

  async function handleCompare() {
    if (!locationA || !locationB) {
      setError("Pick two locations to compare.");
      return;
    }
    if (locationA === locationB) {
      setError("Pick two different locations.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await compareLocations(locationA, locationB);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  const [a, b] = result?.locations ?? [];
  const complaintThemes = a && b
    ? Array.from(
        new Set([...a.top_complaints, ...b.top_complaints].map((t) => t.theme))
      )
    : [];

  return (
    <main className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Compare locations</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={locationA}
          onChange={(e) => setLocationA(e.target.value)}
          className="rounded-full border border-black/20 dark:border-white/20 bg-transparent px-3 py-1 text-sm"
        >
          <option value="">Location A</option>
          {locations.map((loc) => (
            <option key={loc.location} value={loc.location}>
              {loc.location}
            </option>
          ))}
        </select>
        <span className="text-sm text-black/50 dark:text-white/50">vs</span>
        <select
          value={locationB}
          onChange={(e) => setLocationB(e.target.value)}
          className="rounded-full border border-black/20 dark:border-white/20 bg-transparent px-3 py-1 text-sm"
        >
          <option value="">Location B</option>
          {locations.map((loc) => (
            <option key={loc.location} value={loc.location}>
              {loc.location}
            </option>
          ))}
        </select>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {locations.length === 0 && !error && (
        <p className="text-sm text-black/50 dark:text-white/50">
          No locations yet — upload a CSV with a location tag first.
        </p>
      )}

      {a && b && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CompareCard insights={a} />
            <CompareCard insights={b} />
          </div>

          {complaintThemes.length > 0 && (
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h3 className="font-semibold mb-3">Which location is performing better</h3>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-black/20 dark:border-white/20">
                    <th className="py-2 pr-4">Theme</th>
                    <th className="py-2 pr-4">{a.location}</th>
                    <th className="py-2 pr-4">{b.location}</th>
                    <th className="py-2 pr-4">Better</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintThemes.map((theme) => {
                    const countA =
                      a.top_complaints.find((t) => t.theme === theme)?.count ?? 0;
                    const countB =
                      b.top_complaints.find((t) => t.theme === theme)?.count ?? 0;
                    const winner =
                      countA === countB ? "tie" : countA < countB ? a.location : b.location;
                    return (
                      <tr key={theme} className="border-b border-black/10 dark:border-white/10">
                        <td className="py-2 pr-4 capitalize">{theme.replace(/_/g, " ")}</td>
                        <td className="py-2 pr-4">{countA}</td>
                        <td className="py-2 pr-4">{countB}</td>
                        <td className="py-2 pr-4">
                          {winner === "tie" ? (
                            <span className="text-black/50 dark:text-white/50">tie</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">{winner}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
