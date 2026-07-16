import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    title: "Batched AI classification",
    description:
      "One Gemini call per ingestion sorts every review into a fixed theme with sentiment and a 1–5 severity score — no per-review API calls.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    ),
  },
  {
    title: "Ranked fix-this-first list",
    description:
      "Every theme gets a score — count × average severity — so you always know what's costing you the most customers right now.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    title: "Compare across locations",
    description:
      "Tag reviews by location on upload, then see side-by-side which branch is improving and which theme needs attention — with a clear winner per theme.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.5l3.75-4.5 3 3L15 6l6 6M3 13.5V18a.75.75 0 00.75.75h16.5A.75.75 0 0021 18v-4.5M3 13.5h18"
      />
    ),
  },
];

const SAMPLE_INSIGHTS = [
  { theme: "Delivery", count: 34, severity: 4.2, tone: "bg-rose-50 text-rose-700" },
  { theme: "Pricing", count: 21, severity: 3.1, tone: "bg-amber-50 text-amber-700" },
  { theme: "Customer service", count: 18, severity: 1.4, tone: "bg-emerald-50 text-emerald-700" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-mark.png"
            alt="Sentimo logo"
            width={34}
            height={34}
            className="h-[2.125rem] w-[2.125rem]"
          />
          <span className="text-lg font-semibold text-slate-900 tracking-tight">Sentimo</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-violet-500 transition-colors"
        >
          Open Dashboard
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            AI-powered review intelligence
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 text-balance">
            Turn scattered reviews into your fix-this-first list
          </h1>
          <p className="text-lg text-slate-500 text-balance">
            Sentimo ingests customer reviews from anywhere, classifies them with Gemini in one
            batched call, and ranks what to fix first — by theme, severity, and location.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="rounded-lg bg-violet-600 text-white px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-violet-500 transition-colors"
            >
              Open Dashboard
            </Link>
            <Link
              href="/reviews"
              className="rounded-lg border border-slate-300 text-slate-700 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Browse reviews
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card">
          <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Fix this first</span>
              <span className="text-xs text-slate-400">Updated just now</span>
            </div>
            <div className="flex flex-col gap-3">
              {SAMPLE_INSIGHTS.map((row) => (
                <div
                  key={row.theme}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${row.tone}`}>
                      {row.severity.toFixed(1)}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{row.theme}</span>
                  </div>
                  <span className="text-sm text-slate-400">{row.count} reviews</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card flex flex-col gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.75}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  {feature.icon}
                </svg>
              </span>
              <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 sm:px-8 py-10 flex items-center justify-between text-xs text-slate-400">
        <span>Sentimo — built with FastAPI, Next.js, and Gemini.</span>
        <Link href="/dashboard" className="font-medium text-slate-500 hover:text-violet-600">
          Open Dashboard →
        </Link>
      </footer>
    </div>
  );
}
