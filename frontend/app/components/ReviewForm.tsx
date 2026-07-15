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
        rows={6}
        className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3 text-sm"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional, e.g. Vikings MOA)"
        className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={submitText}
          disabled={status === "loading"}
          className="rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {status === "loading" ? "Classifying..." : "Submit reviews"}
        </button>
        <label className="text-sm underline cursor-pointer">
          Upload CSV
          <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </label>
      </div>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-500" : "text-black/60 dark:text-white/60"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
