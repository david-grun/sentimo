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
