import os
from pathlib import Path

from dotenv import load_dotenv

# .env lives at the repo root (one level above backend/)
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH)

DATABASE_URL: str = os.getenv("DATABASE_URL", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# Optional shared secret. When set, mutating endpoints require an
# X-API-Key header with this value; when empty, auth is disabled (local dev).
API_KEY: str = os.getenv("API_KEY", "")

# Render injects RENDER_GIT_COMMIT on every deploy; used by GET /version
# to verify which commit is actually live.
GIT_COMMIT: str = os.getenv("RENDER_GIT_COMMIT", os.getenv("GIT_COMMIT", ""))

GEMINI_MODEL: str = "gemini-flash-lite-latest"

THEMES: list[str] = [
    "delivery",
    "product_quality",
    "customer_service",
    "pricing",
    "ambiance",
    "cleanliness",
    "communication",
    "other",
]

SENTIMENTS: list[str] = ["positive", "neutral", "negative"]
