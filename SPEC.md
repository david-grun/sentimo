# Sentimo — Project Spec

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

### Table: reviews
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| text | TEXT NOT NULL | Raw review, immutable |
| source | VARCHAR(50) DEFAULT 'manual' | manual / csv |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

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

INDEX on review_id, INDEX on (theme, sentiment).

### Theme Enum (fixed, passed to Gemini in prompt)
delivery, product_quality, customer_service, pricing, ambiance, cleanliness, communication, other

## API Endpoints

### GET /health
Response: `200 { "status": "ok" }`

### POST /reviews
The AI endpoint. Accepts batch of review texts, inserts into reviews table, sends one batched Gemini call, inserts classifications, returns enriched results.
- Request: `{ "reviews": [{ "text": "...", "source": "manual" }] }`
- Response: `201 { "created": N, "reviews": [{ "id", "text", "theme", "sentiment", "severity", "extracted_issue" }] }`
- Validation: text must be non-empty string, max 50 reviews per batch
- Errors: 400 (validation), 422 (Gemini parse failure on some reviews — still insert reviews, mark classifications as failed), 500

### GET /reviews
Paginated, filterable list.
- Query params: `?page=1&limit=20&theme=delivery&sentiment=negative`
- Response: `200 { "items": [...], "page": 1, "total": 87 }`

### GET /insights
Ranked "fix this first" aggregation.
- Query params: `?sentiment=negative` (optional filter)
- Response: `200 { "insights": [{ "theme": "delivery", "count": 34, "avg_severity": 4.2, "score": 142.8 }] }`
- Score formula: count * avg_severity (simple, explainable)

### DELETE /reviews/{id}
- Response: `204` on success, `404` if not found

## Frontend Pages

### / (Dashboard)
- Top section: paste reviews (textarea) or upload CSV, submit button
- Bottom section: insights cards ranked by score, each showing theme name, count, avg severity, and a severity bar
- Filter toggles: sentiment (positive/neutral/negative)

### /reviews (Review List)
- Paginated table of all reviews with their classifications
- Filter by theme and sentiment
- Click to expand full review text

## Gemini Prompt Structure
One system prompt. Input: JSON array of review texts. Output: JSON array of classification objects matching the schema. Fixed theme enum passed in prompt. Model must return valid JSON array — wrap in try/catch and mark unparseable results as failed.

## CI: GitHub Actions
Single workflow `ci.yml`:
- Job 1 (backend): install deps, ruff check, pytest
- Job 2 (frontend): npm ci, tsc --noEmit, next build
Trigger: push to main, pull requests

## File Structure