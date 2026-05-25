from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from typing import Optional

import pandas as pd

from app.services.filter_engine import (
    load_data,
    filter_safe_products,
    compute_nutrition_score,
    compute_safe_snack_score,
    tag_taste,
    evaluate_product,
)
from app.services.product_repository import get_base_df
from app.services.product_filters import (
    normalize_conditions,
    apply_query_filter,
    apply_taste_filter,
    apply_budget_filter,
    apply_sort,
)
from app.services.product_serializer import serialize_product
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "최종데이터 전처리_final.csv"
IMAGE_CSV_PATH = BASE_DIR / "data" / "product_images_final.csv"
DEFAULT_IMAGE_URL = "/product-images/과자.png"



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
    df = compute_safe_snack_score(df, selected_tastes=tastes or None)

    df = apply_query_filter(df, query)
    df = apply_taste_filter(df, tastes)
    df = apply_budget_filter(df, budget)
    df = apply_sort(df, sort or "price_asc")

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

def get_product_detail(
    product_id: str,
    selected_tastes: Optional[list[str]] = None,
) -> Optional[dict]:
    df = get_base_df().copy()
    df = compute_nutrition_score(df)

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
        "소아천식",
        "유당불내증",
        "아나필락시스",
        "소아비만",
        "소아당뇨",
        "카페인",
    ]
    row["eval"] = evaluate_product(row, all_conditions)

    # taste_tags 없으면 생성
    if "taste_tags" not in row or not isinstance(row.get("taste_tags"), list):
        row["taste_tags"] = tag_taste(
            str(row.get("원재료명", "")),
            str(row.get("품목명", "")),
        )

    # 안심간식 종합 점수 (단일 행 DataFrame으로 계산)
    single_df = pd.DataFrame([row])
    single_df = compute_safe_snack_score(single_df, selected_tastes=selected_tastes)
    row = single_df.iloc[0]

    return serialize_product(row)

def get_stats() -> dict:
    df = get_base_df().copy()

    if "stable_id" in df.columns:
        total_products = df["stable_id"].nunique()
    else:
        total_products = len(
            df.drop_duplicates(subset=["품목명", "제조사명", "price"])
        )

    return {
        "totalProducts": int(total_products),
        "totalConditions": 8,
        "totalTasteCategories": 30,
    }
