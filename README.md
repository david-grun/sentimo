
# sentimo
Turns scattered customer reviews into a ranked "fix this first" priority list using AI classification

## Problem

Small-business owners collect hundreds of reviews but cannot see the pattern. Sentimo ingests raw reviews, classifies each into a fixed theme taxonomy with sentiment and severity via one batched Gemini API call, and surfaces a ranked "fix this first" insights dashboard.

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

Copy `.env.example` to `.env` in the repo root and fill in `DATABASE_URL` (Neon pooled connection string) and `GEMINI_API_KEY` (from Google AI Studio).

Create the tables once:

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

- **Backend (Render)**: new Web Service from this repo, root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS` env vars.
- **Frontend (Vercel)**: import this repo, root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- **Database (Neon)**: create a project, run `python -m app.db` once (with `DATABASE_URL` pointed at Neon) to create tables.

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests:
- **backend job**: installs deps, `ruff check .`, `pytest -q` (against a Postgres service container)
- **frontend job**: `npm ci`, `tsc --noEmit`, `next build`
