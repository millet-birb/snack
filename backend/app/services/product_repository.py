import logging
import os
import sqlite3
from functools import lru_cache
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from app.services.filter_engine import load_data, tag_taste


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CSV_PATH = DATA_DIR / "최종데이터 전처리_final.csv"
IMAGE_CSV_PATH = DATA_DIR / "product_images_final.csv"
DB_PATH = DATA_DIR / "snack_products.sqlite3"
DEFAULT_IMAGE_URL = "/product-images/과자.png"
SUPABASE_TABLE = "products"
SUPABASE_PAGE_SIZE = 1000

logger = logging.getLogger(__name__)

PRODUCT_NAME_COL = "품목명"
BRAND_COL = "제조사명"
IMAGE_URL_COL = "image_url"
INGREDIENTS_COL = "원재료명"


@lru_cache(maxsize=1)
def get_image_df() -> pd.DataFrame:
    if not IMAGE_CSV_PATH.exists():
        return pd.DataFrame(columns=[PRODUCT_NAME_COL, BRAND_COL, IMAGE_URL_COL])

    image_df = pd.read_csv(IMAGE_CSV_PATH, dtype=str).fillna("")
    image_df[PRODUCT_NAME_COL] = image_df[PRODUCT_NAME_COL].astype(str).str.strip()
    image_df[BRAND_COL] = image_df[BRAND_COL].astype(str).str.strip()
    image_df[IMAGE_URL_COL] = image_df[IMAGE_URL_COL].astype(str).str.strip()
    image_df[IMAGE_URL_COL] = image_df[IMAGE_URL_COL].replace("", DEFAULT_IMAGE_URL)

    return image_df[[PRODUCT_NAME_COL, BRAND_COL, IMAGE_URL_COL]].drop_duplicates(
        subset=[PRODUCT_NAME_COL, BRAND_COL],
        keep="first",
    )


def _load_from_supabase() -> pd.DataFrame | None:
    load_dotenv(BASE_DIR.parent / ".env")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None

    try:
        from supabase import create_client
    except ModuleNotFoundError:
        logger.warning("supabase package not installed; falling back to local data")
        return None

    try:
        client = create_client(url, key)
        rows: list[dict] = []
        start = 0
        while True:
            end = start + SUPABASE_PAGE_SIZE - 1
            resp = client.table(SUPABASE_TABLE).select("*").range(start, end).execute()
            batch = resp.data or []
            rows.extend(batch)
            if len(batch) < SUPABASE_PAGE_SIZE:
                break
            start += SUPABASE_PAGE_SIZE
    except Exception:
        logger.exception("Failed to load products from Supabase; falling back to local data")
        return None

    if not rows:
        return None

    logger.info("Loaded %d products from Supabase", len(rows))
    return pd.DataFrame(rows)


def _load_from_db() -> pd.DataFrame | None:
    if not DB_PATH.exists():
        return None

    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql_query("SELECT * FROM products", conn)


def _load_from_csv() -> pd.DataFrame:
    df = load_data(str(CSV_PATH))

    for col in (PRODUCT_NAME_COL, BRAND_COL):
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    image_df = get_image_df()
    if not image_df.empty:
        df = df.merge(
            image_df,
            on=[PRODUCT_NAME_COL, BRAND_COL],
            how="left",
        )

    return df


def _dedupe_products(df: pd.DataFrame) -> pd.DataFrame:
    if "stable_id" in df.columns:
        return df.drop_duplicates(subset=["stable_id"], keep="first").reset_index(drop=True)

    return df.drop_duplicates(
        subset=[PRODUCT_NAME_COL, BRAND_COL, "price"],
        keep="first",
    ).reset_index(drop=True)


def _ensure_taste_tags(df: pd.DataFrame) -> pd.DataFrame:
    if "taste_tags" in df.columns:
        return df

    def _build_taste_tags(row):
        ingredients = str(row.get(INGREDIENTS_COL, "") or "")
        name = str(row.get(PRODUCT_NAME_COL, "") or "")
        try:
            return tag_taste(ingredients, name)
        except Exception:
            return []

    df = df.copy()
    df["taste_tags"] = df.apply(_build_taste_tags, axis=1)
    return df


@lru_cache(maxsize=1)
def get_base_df() -> pd.DataFrame:
    df = _load_from_supabase()
    if df is None:
        df = _load_from_db()
    if df is None:
        df = _load_from_csv()

    if IMAGE_URL_COL not in df.columns:
        df[IMAGE_URL_COL] = DEFAULT_IMAGE_URL
    else:
        df[IMAGE_URL_COL] = df[IMAGE_URL_COL].fillna("").replace("", DEFAULT_IMAGE_URL)

    df = _dedupe_products(df)
    df = _ensure_taste_tags(df)
    return df
