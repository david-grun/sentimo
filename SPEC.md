# Sentimo — Project Spec

> Updated 2026-07-16 to match the shipped product. The original launch spec
> covered only paste-in ingestion, insights, and the review list; locations,
> CSV upload, comparison, recommendations, API-key auth, and `/version` were
> added during development and are now part of the spec.

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

## Database Schema

Defined as idempotent SQL in `backend/app/db.py`, applied automatically on
app startup (FastAPI lifespan hook) — no separate migration step.

### Table: reviews
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| text | TEXT NOT NULL | Raw review, immutable |
| source | VARCHAR(50) DEFAULT 'manual' | manual / csv |
| created_at | TIMESTAMPTZ DEFAULT NOW() | When it entered Sentimo |
| location | VARCHAR(200) | Required on all submissions |
| reviewer_name | VARCHAR(200) | From CSV, optional |
| rating | INTEGER CHECK (1-5) | From CSV, optional |
| review_date | DATE | Original review date parsed from CSV, optional |

### Table: classifications
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| review_id | INTEGER REFERENCES reviews(id) ON DELETE CASCADE | |
| theme | VARCHAR(50) NOT NULL | From fixed enum below |
| sentiment | VARCHAR(10) NOT NULL | positive / neutral / negative |
| severity | INTEGER CHECK (1-5) | 1=mild, 5=critical |
| extracted_issue | TEXT | One-line summary from LLM |
| model | VARCHAR(100) | Which model produced this |
| classified_at | TIMESTAMPTZ DEFAULT NOW() | |

INDEX on review_id, INDEX on (theme, sentiment), INDEX on reviews(location).

### Theme Enum (fixed, passed to Gemini in prompt)
delivery, product_quality, customer_service, pricing, ambiance, cleanliness, communication, other

## Auth

Optional shared secret: when the `API_KEY` env var is set, all mutating
endpoints (`POST /reviews`, `POST /reviews/csv`, both `DELETE`s) require an
`X-API-Key` header with that value (401 otherwise). Read endpoints stay open.
When unset (local dev), auth is disabled. The frontend sends
`NEXT_PUBLIC_API_KEY` when configured.

## API Endpoints

Error responses always use `{ "error": "message", "detail": ... }`.

### GET /health
Response: `200 { "status": "ok" }`

### GET /version
Response: `200 { "commit": "<git sha or 'unknown'>" }` — from Render's
`RENDER_GIT_COMMIT` env var; used to verify a deploy actually picked up new code.

### POST /reviews
The AI endpoint. Accepts batch of review texts, dedupes against the DB and
within the batch, inserts, sends one batched Gemini call, inserts
classifications, returns enriched results.
- Request: `{ "reviews": [{ "text": "...", "source": "manual" }], "location": "Branch name" }`
- Response: `201 { "created": N, "skipped_duplicate": N, "reviews": [{ "id", "text", "location", "theme", "sentiment", "severity", "extracted_issue", ... }] }`
- Validation: text non-empty, max 50 reviews per batch, location required (400 otherwise)
- `422` if Gemini fails on some reviews — reviews still inserted, failed ones have null classification fields, payload nested under `detail`

### POST /reviews/csv
Multipart upload: `file` (CSV) + `location` (form field, required).
Auto-maps arbitrary headers to text/rating/date/reviewer via synonym lists
(`backend/app/csv_parser.py`); skips empty rows; dedupes in-file and against
the DB; parses `review_date` from 8 common date formats.
- Response: `201 { "created", "skipped_empty", "skipped_duplicate", "reviews": [...] }`
- `400` with the headers found if no review-text column can be mapped; `422` on partial classification failure (same contract as POST /reviews)

### GET /reviews
Paginated, filterable list.
- Query params: `?page=1&limit=20&theme=delivery&sentiment=negative&location=X&min_severity=4`
- `min_severity` also orders by severity desc (powers the critical-alerts panel)
- Response: `200 { "items": [...], "page": 1, "total": 87 }`

### GET /insights
Ranked "fix this first" aggregation.
- Query params: `?sentiment=negative&location=X` (both optional)
- Response: `200 { "insights": [{ "theme": "delivery", "count": 34, "avg_severity": 4.2, "score": 142.8 }] }`
- Score formula: count * avg_severity (simple, explainable)

### GET /insights/{theme}/recommendation
One Gemini call synthesizing a short actionable paragraph from that theme's
top-severity extracted issues. Falls back to a friendly message (still 200)
if Gemini fails; `404` if the theme has no reviews.
- Query params: `?sentiment=...&location=...` (optional filters)
- Response: `200 { "theme": "...", "recommendation": "..." }`

### GET /locations
Distinct locations with review count and average rating.
- Response: `200 { "locations": [{ "location", "review_count", "avg_rating" }] }`

### GET /insights/compare?locations=A,B
Side-by-side stats for exactly two locations: totals, avg severity, avg
rating, sentiment split, top-3 complaints and praise per location.
- `400` unless exactly two comma-separated locations are given

### DELETE /reviews/{id}
- Response: `204` on success, `404` if not found

### DELETE /reviews
Clear all (confirm-guarded in the UI).
- Response: `200 { "deleted": N }`

## Frontend Pages

### / (Landing)
Static marketing page — hero, feature cards, sample insight preview. No API calls.

### /dashboard
- Submit form: paste reviews (one per line) or upload CSV; location required; CSV is select-then-submit
- Critical alerts strip: individual severity 4–5 reviews (can't be diluted by averages)
- "Fix this first": insight cards ranked by score, defaulting to negative sentiment; expandable AI recommendation per card
- "Keep doing this": positive themes, same card UI
- Filters: sentiment, location

### /reviews (Review List)
- Paginated table (20/page) with full review text, location, theme, sentiment, severity, rating
- Filters: location, theme, sentiment; per-row delete; confirm-guarded Clear all

### /compare
- Pick two locations → side-by-side stat cards + per-theme "which location is performing better" table

## Gemini Prompt Structure
One system prompt with explicit per-theme definitions (notably: illness/
food-safety classifies as `cleanliness`, not `product_quality`). Input: JSON
array of review texts. Output: JSON array of classification objects, JSON
mode enforced. Model must return a valid JSON array — parse failures and
invalid items are marked failed (`None`) rather than erroring; short arrays
are padded.

## CI: GitHub Actions
Single workflow `ci.yml`:
- Job 1 (backend): install deps, ruff check, pytest (against a Postgres 16 service container on port 5433)
- Job 2 (frontend): npm ci, eslint, tsc --noEmit, next build
Trigger: push to main, pull requests

## File Structure

```
backend/
  app/            config, db (schema), models, main (API), classifier (Gemini), csv_parser
  scripts/        classifier_demo (live-API smoke test)
  tests/          55 pytest tests, Gemini mocked, real Postgres
frontend/
  app/            layout + landing page, api.ts, types.ts
  app/(app)/      dashboard, reviews, compare (shared sidebar layout)
  app/components/ one component per file
.github/workflows/ci.yml
```
