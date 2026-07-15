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
