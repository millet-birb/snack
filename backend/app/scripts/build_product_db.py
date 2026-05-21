import argparse
import sqlite3
import sys
from pathlib import Path

import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.filter_engine import load_data


BASE_DIR = BACKEND_DIR / "app"
DATA_DIR = BASE_DIR / "data"
DEFAULT_SOURCE_CSV = DATA_DIR / "최종데이터 전처리_final.csv"
DEFAULT_IMAGE_CSV = DATA_DIR / "product_images_final.csv"
DEFAULT_PRICE_CSV = DATA_DIR / "가격전처리.csv"
DEFAULT_DB_PATH = DATA_DIR / "snack_products.sqlite3"
DEFAULT_TABLE_NAME = "products"
DEFAULT_IMAGE_URL = "/product-images/과자.png"

PRODUCT_NAME_COL = "품목명"
BRAND_COL = "제조사명"
IMAGE_URL_COL = "image_url"
PRICE_UPDATE_COLS = ["식품중량", "중량(g)", "갯수(개)", "price"]


def apply_price_updates(products_df: pd.DataFrame, price_csv: Path) -> pd.DataFrame:
    price_df = pd.read_csv(price_csv, dtype=str).fillna("")

    for col in (PRODUCT_NAME_COL, BRAND_COL):
        products_df[col] = products_df[col].astype(str).str.strip()
        price_df[col] = price_df[col].astype(str).str.strip()

    price_df = price_df[[PRODUCT_NAME_COL, BRAND_COL, *PRICE_UPDATE_COLS]].drop_duplicates(
        subset=[PRODUCT_NAME_COL, BRAND_COL],
        keep="first",
    )

    products_without_old_prices = products_df.drop(
        columns=[col for col in PRICE_UPDATE_COLS if col in products_df.columns],
        errors="ignore",
    )

    return products_without_old_prices.merge(
        price_df,
        on=[PRODUCT_NAME_COL, BRAND_COL],
        how="inner",
    )


def build_products_df(source_csv: Path, image_csv: Path, price_csv: Path) -> pd.DataFrame:
    products_df = load_data(str(source_csv))

    for col in (PRODUCT_NAME_COL, BRAND_COL):
        products_df[col] = products_df[col].astype(str).str.strip()

    images_df = pd.read_csv(image_csv, dtype=str).fillna("")
    images_df[PRODUCT_NAME_COL] = images_df[PRODUCT_NAME_COL].astype(str).str.strip()
    images_df[BRAND_COL] = images_df[BRAND_COL].astype(str).str.strip()
    images_df[IMAGE_URL_COL] = images_df[IMAGE_URL_COL].astype(str).str.strip()
    images_df[IMAGE_URL_COL] = images_df[IMAGE_URL_COL].replace("", DEFAULT_IMAGE_URL)
    images_df = images_df[[PRODUCT_NAME_COL, BRAND_COL, IMAGE_URL_COL]].drop_duplicates(
        subset=[PRODUCT_NAME_COL, BRAND_COL],
        keep="first",
    )

    merged_df = products_df.merge(
        images_df,
        on=[PRODUCT_NAME_COL, BRAND_COL],
        how="left",
    )
    merged_df[IMAGE_URL_COL] = merged_df[IMAGE_URL_COL].fillna(DEFAULT_IMAGE_URL)
    merged_df = apply_price_updates(merged_df, price_csv)

    if "stable_id" in merged_df.columns:
        merged_df = merged_df.drop_duplicates(subset=["stable_id"], keep="first")
    else:
        merged_df = merged_df.drop_duplicates(
            subset=[PRODUCT_NAME_COL, BRAND_COL, "price"],
            keep="first",
        )

    return merged_df.reset_index(drop=True)


def write_sqlite(df: pd.DataFrame, db_path: Path, table_name: str) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path) as conn:
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.execute(
            f'CREATE INDEX IF NOT EXISTS idx_{table_name}_stable_id '
            f'ON "{table_name}" ("stable_id")'
        )
        conn.execute(
            f'CREATE INDEX IF NOT EXISTS idx_{table_name}_name_brand '
            f'ON "{table_name}" ("{PRODUCT_NAME_COL}", "{BRAND_COL}")'
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Merge product image URLs into final product data and write SQLite DB."
    )
    parser.add_argument("--source-csv", type=Path, default=DEFAULT_SOURCE_CSV)
    parser.add_argument("--image-csv", type=Path, default=DEFAULT_IMAGE_CSV)
    parser.add_argument("--price-csv", type=Path, default=DEFAULT_PRICE_CSV)
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--table-name", default=DEFAULT_TABLE_NAME)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    df = build_products_df(args.source_csv, args.image_csv, args.price_csv)
    write_sqlite(df, args.db_path, args.table_name)
    print(f"Wrote {len(df)} rows to {args.db_path} table={args.table_name}")


if __name__ == "__main__":
    main()
