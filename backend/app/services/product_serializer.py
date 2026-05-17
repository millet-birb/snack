import pandas as pd


def _safe_number(value, default=0):
    if pd.isna(value):
        return default
    return value


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