# Sentimo

Customer review classifier. Ingests reviews, classifies via Gemini, surfaces ranked insights.

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

Browser (Vercel) → REST/JSON → FastAPI (Render) → Neon PostgreSQL
                                    └→ Gemini API (batch classification)

## Conventions

- Backend: snake_case files and variables, type hints on all functions, Pydantic models for request/response
- Frontend: PascalCase components, camelCase variables, one component per file
- API responses: `{ "data": ... }` on success, `{ "error": "message", "detail": ... }` on failure
- Environment variables in `.env` (NEVER committed). Required: `DATABASE_URL`, `GEMINI_API_KEY`
- Git: conventional commits (`feat:`, `fix:`, `chore:`), no direct push to main without CI passing

## Constraints

- Do NOT install packages without stating which and why
- Do NOT modify .env or .gitignore without asking
- Do NOT add features beyond what SPEC.md defines
- Keep Gemini calls batched (one call per ingestion, not per review)
- All SQL queries MUST use parameterized inputs