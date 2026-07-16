
# sentimo
Turns scattered customer reviews into a ranked "fix this first" priority list using AI classification

## Why I built this

Small-business owners collect hundreds of reviews across platforms but can't see the pattern in them. Worse, the reviews that matter most get buried: a single "I got food poisoning here" disappears among fifty "great vibes!" comments, and by the time the owner notices the trend, it has already cost them customers. Reading every review doesn't scale, and star averages hide *why* people are unhappy.

Sentimo turns that pile of unstructured text into a prioritized action list. Paste reviews in (or upload a CSV export), and every review is classified by theme, sentiment, and a 1–5 severity score. The dashboard then answers the only question that matters: **what should I fix first?** — ranked by how many customers are complaining and how severe it is — plus a critical-alerts strip so a single severity-5 review can never be diluted by averages.

I also built this to go beyond a tutorial-scale project: a real product deployed end-to-end (frontend, API, database, CI) on production infrastructure, integrating an LLM in a way that is cheap, validated, and resilient to failure.

## What I did

- **Designed and shipped the full stack**: a FastAPI backend (9 REST endpoints, raw parameterized SQL on PostgreSQL), a Next.js 14 + TypeScript + Tailwind frontend (dashboard, review browser, location comparison), deployed on Render, Vercel, and Neon — all free tier, $0/month.
- **Built the AI pipeline for cost and resilience**: one batched Gemini call per ingestion (not per review), strict JSON-mode output, and every model response validated with Pydantic before it touches the database. If the AI returns garbage or is down entirely, reviews are still saved and flagged — an AI outage degrades the product, it never breaks it.
- **Engineered the classification prompt like code**: a fixed 8-theme taxonomy with explicit per-theme definitions, iterated when the model misbehaved (e.g. food-poisoning reviews now correctly classify as `cleanliness`, not `product_quality`).
- **Made messy real-world data "just work"**: the CSV importer auto-maps arbitrary export headers via synonym matching, dedupes within the file and against the database, and fails with an actionable error listing the headers it found.
- **Shipped multi-location analytics**: side-by-side branch comparison with sentiment splits, per-theme winners, and AI-generated recommendations synthesized from each theme's actual review text.
- **Backed it with engineering discipline**: 50 pytest tests (unit + integration, LLM fully mocked, run against a Dockerized Postgres), GitHub Actions CI gating lint, tests, type-checking, and the production build on every push.

## The value

For a business owner: hours of review-reading collapses into a ranked list of concrete problems, each with an AI-written "here's what to do about it" — and emergencies (hygiene, food safety) surface immediately instead of drowning in averages.

As an engineering artifact: it demonstrates end-to-end product delivery — schema design, API design, LLM integration with real failure handling, automated testing, CI, and multi-service cloud deployment — in one coherent, working system.

## Stack

| Layer | Choice | Free tier |
|-------|--------|-----------|
| Backend | FastAPI on Render | Yes |
| Frontend | Next.js + TypeScript on Vercel | Yes |
| Database | Neon PostgreSQL | Yes |
| AI | Gemini Flash-Lite (google-genai SDK) | Yes (60 RPM) |
| CI | GitHub Actions | Yes |

## Setup

### Backend

```
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` in the repo root and fill in `DATABASE_URL` (Neon pooled connection string) and `GEMINI_API_KEY` (from Google AI Studio). Optionally set `API_KEY` to require an `X-API-Key` header on all mutating endpoints.

The schema is applied automatically on startup (it's idempotent). To create the tables without starting the server:

```
cd backend
python -m app.db
```

Run the dev server:

```
cd backend && uvicorn app.main:app --reload --port 8000
```

### Frontend

```
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the dev server:

```
cd frontend && npm run dev
```

## Commands

- Dev (backend): `cd backend && uvicorn app.main:app --reload --port 8000`
- Dev (frontend): `cd frontend && npm run dev`
- Lint (backend): `cd backend && ruff check .`
- Lint (frontend): `cd frontend && npx eslint .`
- Test: `cd backend && pytest -q`
- Build frontend: `cd frontend && npm run build`
- Type check: `cd frontend && npx tsc --noEmit`

## Architecture

Monorepo, two subdirectories:
- `backend/` — FastAPI (Python 3.11+), psycopg for Neon PostgreSQL, google-genai SDK for Gemini Flash-Lite
- `frontend/` — Next.js 14 App Router, TypeScript, Tailwind CSS

```
Browser (Vercel) → REST/JSON → FastAPI (Render) → Neon PostgreSQL
                                    └→ Gemini API (batch classification)
```

## API

### `GET /health`
`200 { "status": "ok" }`

### `POST /reviews`
Accepts a batch of review texts, inserts them, sends one batched Gemini call, inserts classifications, returns enriched results.
- Request: `{ "reviews": [{ "text": "...", "source": "manual" }] }`
- Response: `201 { "created": N, "reviews": [{ "id", "text", "theme", "sentiment", "severity", "extracted_issue" }] }`
- Max 50 reviews per batch; text must be non-empty
- `422` if Gemini fails to classify some reviews — those reviews are still inserted with null classification fields

### `GET /reviews`
Paginated, filterable list.
- Query params: `?page=1&limit=20&theme=delivery&sentiment=negative`
- Response: `200 { "items": [...], "page": 1, "total": 87 }`

### `GET /insights`
Ranked "fix this first" aggregation, `score = count * avg_severity`.
- Query params: `?sentiment=negative` (optional)
- Response: `200 { "insights": [{ "theme": "delivery", "count": 34, "avg_severity": 4.2, "score": 142.8 }] }`

### `DELETE /reviews/{id}`
`204` on success, `404` if not found.

## Theme taxonomy

`delivery`, `product_quality`, `customer_service`, `pricing`, `ambiance`, `cleanliness`, `communication`, `other`

## Deployment

- **Backend (Render)**: new Web Service from this repo, root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS` (and optionally `API_KEY`) env vars.
- **Frontend (Vercel)**: import this repo, root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL (and `NEXT_PUBLIC_API_KEY` if the backend sets `API_KEY`).
- **Database (Neon)**: create a project; the schema is applied automatically when the backend starts.
- **Verifying a deploy**: `curl <backend>/version` returns the live commit hash — if it doesn't match `git rev-parse HEAD`, Render is serving stale code (trigger a manual deploy).

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests:
- **backend job**: installs deps, `ruff check .`, `pytest -
q` (against a Postgres service container)
- **frontend job**: `npm ci`, `tsc --noEmit`, `next build`


