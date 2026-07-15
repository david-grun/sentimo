"use client";

import { useState } from "react";
import { submitReviews } from "../api";

function parseTextarea(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseCsv(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(",")[0].trim())
    .filter((line) => line.length > 0);
}

export default function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(texts: string[]) {
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

  function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => submit(parseCsv(String(reader.result ?? "")));
    reader.readAsText(file);
    event.target.value = "";
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => submit(parseTextarea(text))}
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
