"""Upload the prebuilt product SQLite database to Supabase."""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BACKEND_DIR / "app" / "data" / "snack_products.sqlite3"
DEFAULT_TABLE_NAME = "products"
DEFAULT_CONFLICT_COLUMN = "stable_id"


def load_records(db_path: Path, conflict_column: str) -> list[dict]:
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {db_path}")

    with sqlite3.connect(db_path) as conn:
        df = pd.read_sql_query("SELECT * FROM products", conn)

    if conflict_column not in df.columns:
        raise ValueError(
            f"SQLite table must contain '{conflict_column}' for safe upserts."
        )

    return df.astype(object).where(pd.notnull(df), None).to_dict(orient="records")


def upload_records(
    records: list[dict],
    table_name: str,
    conflict_column: str,
    batch_size: int,
) -> None:
    try:
        from supabase import create_client
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Install migration dependencies first: "
            "python -m pip install -r requirements-migrate.txt"
        ) from exc

    load_dotenv(BACKEND_DIR / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise ValueError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )

    client = create_client(supabase_url, service_role_key)
    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        client.table(table_name).upsert(
            batch,
            on_conflict=conflict_column,
        ).execute()
        print(f"Uploaded {start + 1}-{start + len(batch)} of {len(records)} rows")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--table-name", default=DEFAULT_TABLE_NAME)
    parser.add_argument("--conflict-column", default=DEFAULT_CONFLICT_COLUMN)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and count SQLite rows without calling Supabase.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1.")

    records = load_records(args.db_path, args.conflict_column)
    print(f"Loaded {len(records)} rows from {args.db_path}")

    if args.dry_run:
        print("Dry run complete; no rows were uploaded.")
        return

    upload_records(
        records=records,
        table_name=args.table_name,
        conflict_column=args.conflict_column,
        batch_size=args.batch_size,
    )
    print("Migration complete.")


if __name__ == "__main__":
    main()
