import pandas as pd


CONDITION_MAP = {
    "알레르기":      "알레르기",
    "아토피":        "아토피",
    "소아천식":      "천식",
    "유당불내증":    "유당불내증",
    "아나필락시스":  "아나필락시스",
    "소아비만":      "소아비만",
    "소아당뇨":      "소아당뇨",
    "카페인":        "카페인주의",
    # 개별 알레르기 항목 (그대로 통과)
    "알레르기_밀":       "알레르기_밀",
    "알레르기_메밀":     "알레르기_메밀",
    "알레르기_대두":     "알레르기_대두",
    "알레르기_복숭아":   "알레르기_복숭아",
    "알레르기_귤오렌지": "알레르기_귤오렌지",
    "알레르기_토마토":   "알레르기_토마토",
    "알레르기_돼지고기": "알레르기_돼지고기",
    "알레르기_닭고기":   "알레르기_닭고기",
    "알레르기_계란":     "알레르기_계란",
    "알레르기_우유":     "알레르기_우유",
    "알레르기_고등어":   "알레르기_고등어",
    "알레르기_게":       "알레르기_게",
    "알레르기_조개":     "알레르기_조개",
    "알레르기_새우":     "알레르기_새우",
    "알레르기_오징어":   "알레르기_오징어",
    "알레르기_땅콩":     "알레르기_땅콩",
    "알레르기_호두":     "알레르기_호두",
    "알레르기_잣":       "알레르기_잣",
    "알레르기_아황산":   "알레르기_아황산",
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

    q = str(query).strip().lower()
    if not q:
        return df

    def _match(row) -> bool:
        name = str(row.get("품목명", "")).strip().lower()
        brand = str(row.get("제조사명", "")).strip().lower()
        ingredients = str(row.get("원재료명", "")).strip().lower()
        return q in name or q in brand or q in ingredients

    mask = df.apply(_match, axis=1)
    return df[mask].copy()


def apply_taste_filter(df: pd.DataFrame, tastes: list[str]) -> pd.DataFrame:
    if not tastes:
        return df

    def _has_taste(tags):
        if not isinstance(tags, list):
            return False
        return all(taste in tags for taste in tastes)

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

    sort = (sort or "price_asc").strip()

    if sort == "price_desc":
        return temp.sort_values(
            by=["price", "nutrition_score"],
            ascending=[False, False]
        ).copy()

    if sort == "score_desc":
        return temp.sort_values(
            by=["nutrition_score", "price"],
            ascending=[False, True]
        ).copy()

    return temp.sort_values(
        by=["price", "nutrition_score"],
        ascending=[True, False]
    ).copy()