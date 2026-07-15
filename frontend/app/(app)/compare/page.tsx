"use client";

import { useEffect, useState } from "react";
import { compareLocations, fetchLocations } from "../../api";
import CompareCard from "../../components/CompareCard";
import type { CompareResponse, LocationSummary } from "../../types";

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
    <main className="max-w-5xl mx-auto px-8 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Compare locations</h1>
        <p className="text-sm text-slate-500 mt-1">
          See which location is performing better, theme by theme.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card flex items-center gap-3 flex-wrap">
        <select
          value={locationA}
          onChange={(e) => setLocationA(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Location A</option>
          {locations.map((loc) => (
            <option key={loc.location} value={loc.location}>
              {loc.location}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400">vs</span>
        <select
          value={locationB}
          onChange={(e) => setLocationB(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {locations.length === 0 && !error && (
        <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-3">Which location is performing better</h3>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Theme</th>
                    <th className="py-2 pr-4 font-medium">{a.location}</th>
                    <th className="py-2 pr-4 font-medium">{b.location}</th>
                    <th className="py-2 pr-4 font-medium">Better</th>
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
                      <tr key={theme} className="border-b border-slate-100">
                        <td className="py-2.5 pr-4 capitalize text-slate-700">
                          {theme.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">{countA}</td>
                        <td className="py-2.5 pr-4 text-slate-700">{countB}</td>
                        <td className="py-2.5 pr-4">
                          {winner === "tie" ? (
                            <span className="text-slate-400">tie</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">{winner}</span>
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
