"use client";

import { useState } from "react";
import { submitReviews, uploadReviewsCsv } from "../api";

function parseTextarea(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submitText() {
    const texts = parseTextarea(text);
    if (texts.length === 0) {
      setStatus("error");
      setMessage("Nothing to submit.");
      return;
    }
    if (texts.length > 50) {
      setStatus("error");
      setMessage("Max 50 reviews per batch.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    setFileName(null);
    try {
      const result = await submitReviews(texts);
      setMessage(`Classified ${result.created} review${result.created === 1 ? "" : "s"}.`);
      setStatus("idle");
      setText("");
      onSubmitted();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setStatus("loading");
    setMessage(null);
    try {
      const result = await uploadReviewsCsv(file, location.trim());
      const parts = [`Classified ${result.created} review${result.created === 1 ? "" : "s"}.`];
      if (result.skipped_empty) parts.push(`${result.skipped_empty} skipped (empty).`);
      if (result.skipped_duplicate) parts.push(`${result.skipped_duplicate} skipped (duplicate).`);
      setMessage(parts.join(" "));
      setStatus("idle");
      onSubmitted();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "CSV upload failed.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste one review per line..."
        rows={5}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional, e.g. Vikings MOA)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={submitText}
          disabled={status === "loading"}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {status === "loading" ? "Classifying..." : "Submit reviews"}
        </button>

        <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12"
            />
          </svg>
          Upload CSV
          <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </label>

        {fileName && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            {fileName}
          </span>
        )}
      </div>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-rose-600" : "text-slate-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
