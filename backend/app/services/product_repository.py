from functools import lru_cache
from pathlib import Path

import pandas as pd

from app.services.filter_engine import load_data, tag_taste


BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "최종데이터 전처리_final.csv"
IMAGE_CSV_PATH = BASE_DIR / "data" / "product_images_final.csv"
DEFAULT_IMAGE_URL = "/product-images/과자.png"


@lru_cache(maxsize=1)
def get_image_df() -> pd.DataFrame:
    if not IMAGE_CSV_PATH.exists():
        return pd.DataFrame(columns=["품목명", "제조사명", "image_url"])

    image_df = pd.read_csv(IMAGE_CSV_PATH, dtype=str).fillna("")
    image_df["품목명"] = image_df["품목명"].astype(str).str.strip()
    image_df["제조사명"] = image_df["제조사명"].astype(str).str.strip()
    image_df["image_url"] = image_df["image_url"].astype(str).str.strip()
    image_df["image_url"] = image_df["image_url"].replace("", DEFAULT_IMAGE_URL)

    return image_df


@lru_cache(maxsize=1)
def get_base_df() -> pd.DataFrame:
    df = load_data(str(CSV_PATH))

    if "품목명" in df.columns:
        df["품목명"] = df["품목명"].astype(str).str.strip()
    if "제조사명" in df.columns:
        df["제조사명"] = df["제조사명"].astype(str).str.strip()

    image_df = get_image_df()
    if not image_df.empty:
        df = df.merge(
            image_df[["품목명", "제조사명", "image_url"]],
            on=["품목명", "제조사명"],
            how="left"
        )

    if "stable_id" in df.columns:
        df = df.drop_duplicates(subset=["stable_id"], keep="first").reset_index(drop=True)
    else:
        df = df.drop_duplicates(
            subset=["품목명", "제조사명", "price"],
            keep="first"
        ).reset_index(drop=True)

    if "taste_tags" not in df.columns:
        def _build_taste_tags(row):
            ingredients = str(row.get("원재료명", "") or "")
            name = str(row.get("품목명", "") or "")
            try:
                return tag_taste(ingredients, name)
            except Exception:
                return []
        df["taste_tags"] = df.apply(_build_taste_tags, axis=1)

    return df