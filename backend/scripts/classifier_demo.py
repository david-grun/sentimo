"""Standalone check: classify 3 hardcoded reviews and print the result.

Run from backend/: .venv\\Scripts\\python.exe -m scripts.classifier_demo
"""

from app.classifier import classify_reviews

REVIEWS = [
    "The pizza arrived 90 minutes late and stone cold. Never ordering again.",
    "Lovely atmosphere and the staff were incredibly friendly. Will be back!",
    "Prices went up again — a coffee is now $8. It's decent but not worth that.",
]


def main() -> None:
    results = classify_reviews(REVIEWS)
    for text, result in zip(REVIEWS, results):
        print(f"\nReview: {text}")
        if result is None:
            print("  -> classification FAILED")
        else:
            print(f"  -> theme={result.theme} sentiment={result.sentiment} "
                  f"severity={result.severity}")
            print(f"     issue: {result.extracted_issue}")


if __name__ == "__main__":
    main()
