import json

from google import genai
from google.genai import types
from pydantic import ValidationError

from app import config
from app.models import Classification

SYSTEM_PROMPT = f"""You classify customer reviews for a small business.

Input: a JSON array of review texts.
Output: a JSON array of classification objects, one per review, in the same order.

Each classification object must have exactly these fields:
- "theme": one of {json.dumps(config.THEMES)}
- "sentiment": one of {json.dumps(config.SENTIMENTS)}
- "severity": integer 1-5 (1=mild, 5=critical; how urgently the business should act)
- "extracted_issue": one-line summary of the core issue or praise in the review

Theme definitions:
- "delivery": shipping/delivery logistics — lateness, courier behavior, packaging or
  temperature on arrival.
- "product_quality": taste, freshness, portion size, or how the food/product itself was
  made or presented. Does NOT include illness, contamination, or unsanitary conditions —
  those are "cleanliness" even if the review focuses on the food.
- "customer_service": staff friendliness, attentiveness, order accuracy, how complaints
  were handled.
- "pricing": value for money, cost relative to portion/quality.
- "ambiance": physical atmosphere — decor, noise, seating, vibe.
- "cleanliness": hygiene and sanitation — dirtiness, odors, pests, food safety, or any
  illness/sickness reported after consuming food, even if not explicitly described as
  "dirty" (e.g. food poisoning symptoms are a cleanliness/food-safety issue, not a
  product_quality one).
- "communication": order updates, reservation confirmations, responsiveness to inquiries,
  miscommunication about orders.
- "other": doesn't fit any of the above.

Rules:
- Return ONLY the JSON array, no markdown, no commentary.
- The output array must have exactly as many elements as the input array.
- If a review fits no theme, use "other".
"""


def classify_reviews(texts: list[str]) -> list[Classification | None]:
    """Classify a batch of review texts with one Gemini call.

    Returns one entry per input text, in order. Entries that Gemini
    failed to classify (unparseable or invalid) are None.
    """
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=json.dumps(texts),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
        ),
    )

    try:
        parsed = json.loads(response.text or "")
        if not isinstance(parsed, list):
            raise ValueError("Gemini response is not a JSON array")
    except (json.JSONDecodeError, ValueError):
        return [None] * len(texts)

    results: list[Classification | None] = []
    for i in range(len(texts)):
        if i >= len(parsed):
            results.append(None)
            continue
        try:
            results.append(Classification.model_validate(parsed[i]))
        except ValidationError:
            results.append(None)
    return results


RECOMMENDATION_PROMPT = """You are a business consultant advising a small business owner.

You'll receive a theme name, how many reviews raised it, the average severity (1-5,
5=critical), and a list of short issue/praise snippets extracted from real customer
reviews about that theme.

Write ONE short, concrete, actionable paragraph (2-4 sentences) telling the owner what
to do about it. Synthesize the snippets into practical next steps — do not just repeat
them verbatim. If severity is low and sentiment is mostly positive, keep it brief and
affirming instead of inventing problems. Plain text only, no markdown, no headers.
"""


def generate_recommendation(
    theme: str, count: int, avg_severity: float, issues: list[str]
) -> str:
    """Synthesize an actionable recommendation for a theme from its review issues."""
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    payload = {
        "theme": theme,
        "review_count": count,
        "avg_severity": round(avg_severity, 2),
        "issues": issues,
    }
    response = client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=json.dumps(payload),
        config=types.GenerateContentConfig(system_instruction=RECOMMENDATION_PROMPT),
    )
    text = (response.text or "").strip()
    if not text:
        raise ValueError("empty recommendation")
    return text
