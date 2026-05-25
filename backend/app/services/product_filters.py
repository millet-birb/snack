import pandas as pd

from app.services.filter_engine import match_tastes


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


def apply_query_filter(df: pd.DataFrame, query: str) -> pd.DataFrame:
    if not query:
        return df

    raw = str(query).strip().lower()
    if not raw:
        return df

    compact_query = "".join(raw.split())
    tokens = raw.split()

    def _match(row) -> bool:
        name = str(row.get("품목명", "")).lower()
        brand = str(row.get("제조사명", "")).lower()
        ingredients = str(row.get("원재료명", "")).lower()
        blob = f"{name} {brand} {ingredients}"

        if compact_query in "".join(blob.split()):
            return True

        return all(tok in blob for tok in tokens)

    mask = df.apply(_match, axis=1)
    return df[mask].copy()


def apply_taste_filter(df: pd.DataFrame, tastes: list[str]) -> pd.DataFrame:
    if not tastes:
        return df
    return df[df["taste_tags"].apply(lambda tags: match_tastes(tags, tastes))].copy()


def apply_budget_filter(df: pd.DataFrame, budget: int) -> pd.DataFrame:
    if not budget:
        return df

    if "price_per_unit" not in df.columns:
        return df

    return df[df["price_per_unit"] <= budget].copy()


def apply_sort(df: pd.DataFrame, sort: str) -> pd.DataFrame:
    if df.empty:
        return df

    temp = df.copy()

    if "price" in temp.columns:
        temp["price"] = pd.to_numeric(temp["price"], errors="coerce").fillna(0)
    else:
        temp["price"] = 0

    if "price_per_unit" in temp.columns:
        temp["price_per_unit"] = pd.to_numeric(temp["price_per_unit"], errors="coerce").fillna(0)
    else:
        temp["price_per_unit"] = 0

    if "nutrition_score" in temp.columns:
        temp["nutrition_score"] = pd.to_numeric(temp["nutrition_score"], errors="coerce").fillna(0)
    else:
        temp["nutrition_score"] = 0

    if "safe_snack_score" in temp.columns:
        temp["safe_snack_score"] = pd.to_numeric(temp["safe_snack_score"], errors="coerce").fillna(0)
    else:
        temp["safe_snack_score"] = temp["nutrition_score"]

    sort = (sort or "price_asc").strip()

    if sort == "price_desc":
        return temp.sort_values(
            by=["price", "nutrition_score"],
            ascending=[False, False]
        ).copy()

    if sort == "score_desc":
        return temp.sort_values(
            by=["safe_snack_score", "nutrition_score", "price"],
            ascending=[False, False, True]
        ).copy()

    return temp.sort_values(
        by=["price", "nutrition_score"],
        ascending=[True, False]
    ).copy()
