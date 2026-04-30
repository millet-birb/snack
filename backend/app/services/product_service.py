from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from app.services.filter_engine import (
    load_data,
    filter_safe_products,
    compute_nutrition_score,
    tag_taste,
    evaluate_product,
)


BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "최종데이터 전처리.csv"
IMAGE_CSV_PATH = BASE_DIR / "data" / "product_images.csv"

CONDITION_MAP = {
    "알레르기": "알레르기",
    "아토피": "아토피",
    "소아천식": "천식",
    "유당불내증": "유당불내증",
    "아나필락시스": "아나필락시스",
    "소아비만": "소아비만",
    "소아당뇨": "소아당뇨",
    "카페인": "카페인주의",
}


def normalize_conditions(conditions: list[str]) -> list[str]:
    normalized = []
    for cond in conditions:
        mapped = CONDITION_MAP.get(cond, cond)
        normalized.append(mapped)
    return normalized


def _safe_number(value, default=0):
    if pd.isna(value):
        return default
    return value

@lru_cache(maxsize=1)
def get_image_df() -> pd.DataFrame:
    if not IMAGE_CSV_PATH.exists():
        return pd.DataFrame(columns=["품목명", "제조사명", "image_url"])

    image_df = pd.read_csv(IMAGE_CSV_PATH, dtype=str).fillna("")
    image_df["품목명"] = image_df["품목명"].astype(str).str.strip()
    image_df["제조사명"] = image_df["제조사명"].astype(str).str.strip()
    image_df["image_url"] = image_df["image_url"].astype(str).str.strip()
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

def apply_query_filter(df: pd.DataFrame, query: str) -> pd.DataFrame:
    if not query:
        return df

    q = query.strip().lower()
    if not q:
        return df

    def _match(row) -> bool:
        fields = [
            str(row.get("품목명", "")),
            str(row.get("제조사명", "")),
            str(row.get("원재료명", "")),
        ]
        text = " ".join(fields).lower()
        return q in text

    mask = df.apply(_match, axis=1)
    return df[mask].copy()


def apply_taste_filter(df: pd.DataFrame, tastes: list[str]) -> pd.DataFrame:
    if not tastes:
        return df

    taste_set = set(tastes)

    def _has_taste(tags):
        if not isinstance(tags, list):
            return False
        return any(tag in taste_set for tag in tags)

    return df[df["taste_tags"].apply(_has_taste)].copy()


def apply_budget_filter(df: pd.DataFrame, budget: int) -> pd.DataFrame:
    if not budget:
        return df

    if "price_per_unit" not in df.columns:
        return df

    return df[df["price_per_unit"] <= budget].copy()


def apply_sort(df: pd.DataFrame, sort: str) -> pd.DataFrame:
    if df.empty:
        return df

    if "score_per_price" not in df.columns:
        df["score_per_price"] = df["nutrition_score"] / (df["price_per_unit"] + 1)

    if sort == "price_asc":
        return df.sort_values("price_per_unit", ascending=True)
    if sort == "price_desc":
        return df.sort_values("price_per_unit", ascending=False)
    if sort == "value_desc":
        return df.sort_values("score_per_price", ascending=False)

    return df.sort_values("nutrition_score", ascending=False)

def serialize_product(row: pd.Series) -> dict:
    eval_data = row.get("eval", {}) or {}

    product_id = str(row.get("stable_id", row.name))

    return {
        "id": product_id,
        "reportNumber": str(row.get("품목제조보고번호", "")),
        "brand": str(row.get("제조사명", "")),
        "name": str(row.get("품목명", "")),
        "foodType": str(row.get("식품유형", "")),
        "price": int(_safe_number(row.get("price", row.get("가격", 0)), 0)),
        "pricePerUnit": int(_safe_number(row.get("price_per_unit", 0), 0)),
        "servingG": float(_safe_number(row.get("serving_g", 0), 0)),
        "nutritionScore": float(_safe_number(row.get("nutrition_score", 0), 0)),
        "scorePerPrice": float(_safe_number(row.get("score_per_price", 0), 0)),
        "tasteTags": row.get("taste_tags", []) if isinstance(row.get("taste_tags", []), list) else [],
        "safeFor": eval_data.get("safe_for", []),
        "warnFor": eval_data.get("warn_for", []),
        "warnIngredients": eval_data.get("warn_ingredients", {}),
        "nutrition": {
            "caloriesKcal": float(_safe_number(row.get("에너지(kcal)", row.get("열량(kcal)", 0)), 0)),
            "carbsG": float(_safe_number(row.get("탄수화물(g)", 0), 0)),
            "sugarG": float(_safe_number(row.get("당류(g)", 0), 0)),
            "proteinG": float(_safe_number(row.get("단백질(g)", 0), 0)),
            "fatG": float(_safe_number(row.get("지방(g)", 0), 0)),
            "saturatedFatG": float(_safe_number(row.get("포화지방산(g)", 0), 0)),
            "transFatG": float(_safe_number(row.get("트랜스지방(g)", row.get("트랜스지방산(g)", 0)), 0)),
            "cholesterolMg": float(_safe_number(row.get("콜레스테롤(mg)", 0), 0)),
            "sodiumMg": float(_safe_number(row.get("나트륨(mg)", 0), 0)),
            "calciumMg": float(_safe_number(row.get("칼슘(mg)", 0), 0)),
            "ironMg": float(_safe_number(row.get("철(mg)", 0), 0)),
            "fiberG": float(_safe_number(row.get("식이섬유(g)", 0), 0)),
        },
        "ingredientsRaw": str(row.get("원재료명", "")),
        "imageUrl": str(row.get("image_url", "")).strip() or None,
        "recommendationReason": str(row.get("recommendation_reason", "")),
    }


def get_products(
    conditions: list[str],
    tastes: list[str],
    budget: int,
    query: str,
    sort: str,
    page: int,
    per_page: int,
) -> dict:
    df = get_base_df().copy()

    normalized_conditions = normalize_conditions(conditions)

    if normalized_conditions:
        df = filter_safe_products(df, normalized_conditions)

    df = compute_nutrition_score(df)

    if "score_per_price" not in df.columns:
        df["score_per_price"] = df["nutrition_score"] / (df["price_per_unit"] + 1)

    df = apply_query_filter(df, query)
    df = apply_taste_filter(df, tastes)
    df = apply_budget_filter(df, budget)
    df = apply_sort(df, sort)

    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    paged_df = df.iloc[start:end].copy()

    products = [serialize_product(row) for _, row in paged_df.iterrows()]

    return {
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if per_page > 0 else 1,
        "products": products,
    }

def get_product_detail(product_id: str) -> Optional[dict]:
    df = get_base_df().copy()
    df = compute_nutrition_score(df)

    if "score_per_price" not in df.columns:
        df["score_per_price"] = df["nutrition_score"] / (df["price_per_unit"] + 1)

    def _id_of_row(row):
        return str(row.get("stable_id", row.name))

    matched = df[df.apply(lambda row: _id_of_row(row) == product_id, axis=1)]

    if matched.empty:
        return None

    row = matched.iloc[0].copy()

    # 상세에서는 전체 8개 질환 기준으로 판정
    all_conditions = [
        "알레르기",
        "아토피",
        "천식",
        "유당불내증",
        "아나필락시스",
        "소아비만",
        "소아당뇨",
        "카페인주의",
    ]
    row["eval"] = evaluate_product(row, all_conditions)

    # taste_tags 없으면 생성
    if "taste_tags" not in row or not isinstance(row.get("taste_tags"), list):
        row["taste_tags"] = tag_taste(
            str(row.get("원재료명", "")),
            str(row.get("품목명", "")),
        )

    return serialize_product(row)

def get_stats() -> dict:
    df = get_base_df()
    return {
        "totalProducts": int(len(df)),
        "totalConditions": 8,
        "totalTasteCategories": 30,
    }