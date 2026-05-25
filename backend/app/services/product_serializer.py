import pandas as pd


def _safe_number(value, default=0):
    if pd.isna(value):
        return default
    return value


def _safe_str(value) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def _to_int_or_none(value):
    s = _safe_str(value)
    if not s:
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def _per_serving_number(row: pd.Series, *source_columns: str) -> float:
    """Return a nutrient amount normalized to the product's serving size."""
    for column in source_columns:
        per_serving = row.get(f"{column}_1회")
        if not pd.isna(per_serving):
            return round(float(per_serving), 2)

    serving_g = float(_safe_number(row.get("serving_g", 0), 0))
    for column in source_columns:
        value = row.get(column)
        if not pd.isna(value):
            return round(float(value) * serving_g / 100, 2)

    return 0.0


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
        "foodWeight": _safe_str(row.get("식품중량")),
        "weightG": _to_int_or_none(row.get("중량(g)")),
        "itemCount": _to_int_or_none(row.get("갯수(개)")),
        "nutritionScore": float(_safe_number(row.get("nutrition_score", 0), 0)),
        "scorePerPrice": float(_safe_number(row.get("score_per_price", 0), 0)),
        # 안심간식 종합 점수 — 상세 페이지에서만 채워짐 (compute_safe_snack_score 호출 시)
        "safeSnackScore": _to_int_or_none(row.get("safe_snack_score")),
        "nutritionRiskScore": _to_int_or_none(row.get("nutrition_risk_score")),
        "publicPolicyScore": _to_int_or_none(row.get("public_policy_score")),
        "preferenceScore": _to_int_or_none(row.get("preference_score")),
        "tasteTags": row.get("taste_tags", []) if isinstance(row.get("taste_tags", []), list) else [],
        "safeFor": eval_data.get("safe_for", []),
        "warnFor": eval_data.get("warn_for", []),
        "warnIngredients": eval_data.get("warn_ingredients", {}),
        "nutrition": {
            "caloriesKcal": _per_serving_number(row, "에너지(kcal)", "열량(kcal)"),
            "carbsG": _per_serving_number(row, "탄수화물(g)"),
            "sugarG": _per_serving_number(row, "당류(g)"),
            "proteinG": _per_serving_number(row, "단백질(g)"),
            "fatG": _per_serving_number(row, "지방(g)"),
            "saturatedFatG": _per_serving_number(row, "포화지방산(g)"),
            "transFatG": _per_serving_number(row, "트랜스지방산(g)", "트랜스지방(g)"),
            "cholesterolMg": _per_serving_number(row, "콜레스테롤(mg)"),
            "sodiumMg": _per_serving_number(row, "나트륨(mg)"),
            "calciumMg": _per_serving_number(row, "칼슘(mg)"),
            "ironMg": _per_serving_number(row, "철(mg)"),
            "fiberG": _per_serving_number(row, "식이섬유(g)"),
        },
        "ingredientsRaw": str(row.get("원재료명", "")),
        "imageUrl": str(row.get("image_url", "")).strip() or None,
        "recommendationReason": str(row.get("recommendation_reason", "")),
    }
