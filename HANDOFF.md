# Sentimo — Handoff

Status: feature-complete for the current scope and pushed to `origin/main`
(`github.com/david-grun/sentimo`). Deployed to Render (backend) + Vercel
(frontend) + Neon (database) — all three are live, but **Render's
auto-deploy has been unreliable this session** (see "Known issue" below).
Always verify Render is actually on the latest commit before assuming a
feature is live.

## Live URLs

- Frontend: `https://sentimo-ten.vercel.app`
- Backend: `https://sentimo-49kj.onrender.com` (health check: `/health`)
- Database: Neon, connection string in `backend/.env` (`DATABASE_URL`)

## What's built

### Backend (`backend/`, FastAPI + psycopg + Neon Postgres)

Endpoints:
- `POST /reviews` — paste-in reviews, **location required**, batched Gemini
  classification, skips exact-text duplicates already in the DB.
- `POST /reviews/csv` — CSV upload, **location required** (form field),
  auto-maps arbitrary headers (see `app/csv_parser.py`) to
  text/rating/date/reviewer, dedupes within the file and against the DB.
- `GET /reviews` — paginated, filterable by theme/sentiment/location, plus
  `min_severity` (orders by severity desc when set — powers the dashboard's
  critical-alerts panel).
- `GET /insights` — ranked `count × avg_severity` per theme, filterable.
- `GET /insights/{theme}/recommendation` — one Gemini call, synthesizes a
  short actionable paragraph from that theme's actual review text (not a
  template). Falls back to a friendly error string if Gemini fails; never
  hard-errors the request.
- `GET /insights/compare?locations=A,B` — side-by-side stats for two
  locations: totals, avg severity, avg rating, sentiment split, top
  complaints/praise, per-theme winner.
- `GET /locations` — distinct locations with review count + avg rating.
- `DELETE /reviews/{id}` and `DELETE /reviews` (clear all).

Schema: `reviews` (text, source, location, reviewer_name, rating,
created_at) + `classifications` (theme, sentiment, severity 1-5,
extracted_issue). Migrations are idempotent `ADD COLUMN IF NOT EXISTS` in
`app/db.py`, run automatically — no separate migration step needed on
deploy.

Classifier prompt (`app/classifier.py`) has explicit per-theme definitions
— notably, illness/food-safety issues classify as `cleanliness`, not
`product_quality`, even when the review is nominally about food.

50 pytest tests, `ruff check .` clean. Local dev needs a Postgres on
`localhost:5433` matching `.github/workflows/ci.yml`'s config
(`postgres:sentimo@localhost:5433/sentimo`) — spin one up with:
```
docker run -d --name sentimo-pg -e POSTGRES_PASSWORD=sentimo -e POSTGRES_DB=sentimo -p 5433:5432 postgres:16-alpine
```

### Frontend (`frontend/`, Next.js 14 App Router + Tailwind)

Pages:
- `/` — marketing landing page (hero, feature cards, sample insight
  preview). Not part of the app shell.
- `/dashboard` — submit form (paste or CSV, location required, CSV is
  select-then-submit not auto-submit), compact critical-alerts strip
  (severity 4-5 reviews surfaced individually so they can't get diluted by
  per-theme averaging), "Fix this first" (defaults to negative sentiment
  filter — ranks real problems first), "Keep doing this" (positive themes,
  same expandable-recommendation UI).
- `/reviews` — paginated table, filters (location/theme/sentiment), Clear
  all button (confirm-guarded), full review text (no truncation).
- `/compare` — pick two locations, side-by-side cards + per-theme winner
  table.

Design system: violet accent (matches the logo), slate neutrals, dark
sidebar nav (`/dashboard`, `/reviews`, `/compare` share a route-group
layout at `app/(app)/`), Geist Sans as the single font everywhere. Logo mark
lives at `frontend/public/logo-mark.png` (cropped from the full brand sheet
at `frontend/public/brand/sentimo-logo-sheet.png`), also used as the
favicon (`app/icon.png`).

`tsc --noEmit`, `eslint`, `next build` all clean.

### CI

`.github/workflows/ci.yml` — backend job (ruff + pytest against a Postgres
service container), frontend job (tsc + build). Runs on push/PR to `main`.

## Known issue: Render auto-deploy

Multiple times this session, pushes to `main` did not trigger a Render
rebuild — the service kept serving old code (confirmed by hitting
`/locations` and getting 404 when it should have existed). A **restart**
(Render spinning the free-tier service back up after idle) is not the same
as a **deploy** (pulling and rebuilding from the latest commit) — the logs
look similar but only one picks up new code.

**After every push**, check Render's dashboard:
1. **Deploys** tab — confirm the latest commit hash actually shows up and
   finished building.
2. If it's missing or stuck, **Manual Deploy → Deploy latest commit**.
3. **Settings** → confirm Auto-Deploy is "Yes" for `main`.

Quick sanity check from anywhere: `curl https://sentimo-49kj.onrender.com/locations`
— if that 404s, Render is stale (this endpoint has existed since early in
the session).

## Local dev

```
# backend
cd backend && uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm run dev
```

`frontend/.env.local` already points `NEXT_PUBLIC_API_URL` at
`http://localhost:8000`. Backend `.env` (repo root, gitignored) has the
real Neon `DATABASE_URL` and `GEMINI_API_KEY` — both confirmed working.

Test suite: `cd backend && pytest -q` (needs local Postgres, see above).
Lint: `cd backend && ruff check .` / `cd frontend && npx eslint .`.
Typecheck: `cd frontend && npx tsc --noEmit`.

## Notable non-obvious things

- **Reviews without a real location tag** (e.g. ones submitted before
  location became required) show `—` in the location column and are
  invisible to location filters/comparisons — nothing retroactively
  back-fills them.
- **No reclassify endpoint.** If a review's theme is wrong (e.g. an old
  review classified before a prompt fix), the only way to fix it is delete
  + resubmit — the raw review text is immutable by design.
- **Recommendation calls hit Gemini live**, not cached — repeated clicks on
  "What should I do about this?" for the same theme will re-generate
  (cheap on Flash-Lite, but worth knowing if it ever feels slow).
- **CSV parser** auto-maps headers case-insensitively against synonym
  lists in `app/csv_parser.py` (e.g. `Review`/`review`/`text`/`comment`/
  `feedback` all map to the review-text field). If a business's export uses
  a header outside those synonyms, the upload fails with a clear "headers
  found" error rather than guessing.
