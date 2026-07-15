import psycopg

from app import config

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classifications (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL,
    sentiment VARCHAR(10) NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    extracted_issue TEXT,
    model VARCHAR(100),
    classified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classifications_review_id
    ON classifications (review_id);
CREATE INDEX IF NOT EXISTS idx_classifications_theme_sentiment
    ON classifications (theme, sentiment);
"""


def get_connection() -> psycopg.Connection:
    return psycopg.connect(config.DATABASE_URL)


def create_tables() -> None:
    with get_connection() as conn:
        conn.execute(CREATE_TABLES_SQL)
    print("Tables created (or already existed).")


if __name__ == "__main__":
    create_tables()
