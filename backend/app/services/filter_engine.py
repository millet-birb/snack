import numpy as np
import pandas as pd


# ─────────────────────────────────────────────
# 0. 데이터 로드 & 기본 전처리
# ─────────────────────────────────────────────

def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"품목제조보고번호": str})

    # 컬럼명 차이 보정
    rename_map = {
        "1회제공량": "1회 섭취참고량",
        "가격": "price",
        "갯수": "갯수(개)",
        "열량(kcal)": "에너지(kcal)",
        "트랜스지방(g)": "트랜스지방산(g)",
    }
    for old, new in rename_map.items():
        if old in df.columns and new not in df.columns:
            df = df.rename(columns={old: new})

    # 영양성분이 모두 100g 기준 → 1회 제공량(g) 기준으로 환산
    def parse_serving(s):
        if pd.isna(s):
            return 30.0
        s = str(s).replace("g", "").strip()
        try:
            return float(s)
        except Exception:
            return 30.0

    if "1회 섭취참고량" in df.columns:
        df["serving_g"] = df["1회 섭취참고량"].apply(parse_serving)
    else:
        df["serving_g"] = 30.0

    nutrition_cols = [
        "에너지(kcal)", "단백질(g)", "지방(g)", "탄수화물(g)",
        "당류(g)", "포화지방산(g)", "트랜스지방산(g)", "나트륨(mg)",
        "콜레스테롤(mg)", "식이섬유(g)"
    ]
    for col in nutrition_cols:
        if col in df.columns:
            df[col + "_1회"] = df[col].fillna(0) * df["serving_g"] / 100

    # 개당 가격
    if "price" not in df.columns:
        df["price"] = 0
    if "갯수(개)" not in df.columns:
        df["갯수(개)"] = 1

    df["갯수(개)"] = df["갯수(개)"].replace(0, 1).fillna(1)
    df["price_per_unit"] = df["price"].fillna(0) / df["갯수(개)"]

    # 텍스트 컬럼 NaN 처리
    if "원재료명" not in df.columns:
        df["원재료명"] = ""
    else:
        df["원재료명"] = df["원재료명"].fillna("")

    if "품목명" not in df.columns:
        df["품목명"] = ""

    if "제조사명" not in df.columns:
        df["제조사명"] = ""

    if "식품유형" not in df.columns:
        df["식품유형"] = ""

    df = df.reset_index(drop=True)
    df["stable_id"] = df.index.astype(str)

    return df


# ─────────────────────────────────────────────
# 1. 질환별 위험 키워드 사전
# ─────────────────────────────────────────────

RISK_KEYWORDS = {
    "알레르기_밀": ["밀", "밀가루", "소맥분", "박력분", "강력분", "중력분", "글루텐", "전분(밀)"],
    "알레르기_메밀": ["메밀"],
    "알레르기_대두": ["대두", "두유", "두부", "콩", "대두분", "대두유", "레시틴(대두)"],
    "알레르기_복숭아": ["복숭아"],
    "알레르기_귤오렌지": ["귤", "오렌지", "감귤"],
    "알레르기_토마토": ["토마토"],
    "알레르기_돼지고기": ["돈육", "돼지고기", "포크"],
    "알레르기_닭고기": ["닭", "닭고기", "치킨"],
    "알레르기_계란": ["계란", "달걀", "난황", "난백", "전란", "전란액", "난분"],
    "알레르기_우유": [
        "우유", "유크림", "카제인", "유청", "탈지분유", "전지분유", "분유",
        "혼합분유", "버터", "치즈", "가공버터", "가공연유", "농후발효유",
        "유함유가공품", "유당",
        # 룰 사각지대 보강 (사전 substring으로 못 잡던 변종)
        "생크림", "가당연유", "발효유", "우유분말", "농축우유", "산양유",
        "분리유단백", "분리유단백분말",
    ],
    "알레르기_고등어": ["고등어"],
    "알레르기_게": ["게", "크랩"],
    "알레르기_조개": ["조개", "홍합", "전복", "굴"],
    "알레르기_새우": ["새우", "냉동새우", "새우엑기스", "새우맛씨즈닝"],
    "알레르기_오징어": ["오징어", "오징어페이스트", "오징어엑기스", "스퀴드"],
    "알레르기_땅콩": ["땅콩", "피넛", "peanut", "땅콩분말", "볶음땅콩", "볶음땅콩분태", "꿀땅콩", "땅콩버터"],
    "알레르기_호두": ["호두", "호도", "호도분말", "walnut", "호두견과분말", "호두분태"],
    "알레르기_잣": ["잣"],
    "알레르기_아황산": ["아황산", "이산화황", "메타중아황산", "차아황산", "산성아황산나트륨"],

    "아토피_방부제": ["메틸파라벤", "파라벤", "에틸파라벤", "프로필파라벤", "부틸파라벤"],

    "천식_아황산염": ["아황산", "이산화황", "메타중아황산나트륨", "아황산나트륨", "산성아황산나트륨"],

    "유당불내증": [
        "유당", "우유", "유청", "카제인", "탈지분유", "전지분유",
        "유크림", "혼합분유", "분유", "농후발효유", "가공연유", "가공버터",
        "가공치즈", "경성가공치즈", "분리유단백", "유청분말", "유청단백분말"
    ],

    "아나필락시스": [
        "계란", "달걀", "전란", "난황", "난백", "난분",
        "땅콩", "피넛", "새우", "게", "조개", "홍합", "오징어",
        "고등어", "복숭아", "귤", "오렌지"
    ],

    "비만당뇨_정제탄수화물": ["밀가루", "박력분", "쌀가루", "말토덱스트린", "소맥분", "정제밀가루"],
    "비만당뇨_당류": ["액상과당", "고과당콘시럽", "말토덱스트린", "포도당", "설탕", "물엿", "옥수수시럽"],
    "비만당뇨_나쁜기름": ["팜유", "가공유지", "식물성유지", "경화유", "부분경화유지"],

    "카페인": ["카페인", "커피", "녹차", "홍차", "콜라추출물", "에너지드링크"],
}


def detect_risks(ingredient_text: str, risk_keys: list) -> list:
    found = []
    ingredient_text = ingredient_text or ""

    for key in risk_keys:
        for kw in RISK_KEYWORDS.get(key, []):
            if kw in ingredient_text and kw not in found:
                found.append(kw)

    return found


# 제품명(품목명)에서 추가로 검사할 알레르겐 키워드.
# 제조사가 원재료명을 "복합조미식품" 같은 묶음명으로만 적어둬서
# 새우깡·왕새우칩 같은 제품이 원재료명 검사만으로는 잡히지 않는 문제 보완용.
# 흔한 글자(밀/게/대두 등)는 오탐(false positive) 우려가 있어 제외.
NAME_RISK_KEYWORDS = {
    "알레르기_새우":     ["새우", "쉬림프"],
    "알레르기_오징어":   ["오징어"],
    "알레르기_게":       ["꽃게", "대게", "킹크랩"],
    "알레르기_땅콩":     ["땅콩", "피넛"],
    "알레르기_호두":     ["호두"],
    "알레르기_잣":       ["잣"],
    "알레르기_계란":     ["계란", "달걀"],
    "알레르기_우유":     ["우유", "치즈", "버터", "요거트"],
    "알레르기_복숭아":   ["복숭아", "피치"],
    "알레르기_고등어":   ["고등어"],
    "알레르기_조개":     ["조개", "홍합", "전복", "굴"],
    "알레르기_귤오렌지": ["귤", "감귤", "오렌지", "유자"],
    "알레르기_토마토":   ["토마토"],
    "알레르기_돼지고기": ["돼지"],
    "알레르기_닭고기":   ["치킨"],
    "알레르기_메밀":     ["메밀"],
}


def detect_risks_in_name(product_name: str, risk_keys: list) -> list:
    found = []
    product_name = product_name or ""

    for key in risk_keys:
        for kw in NAME_RISK_KEYWORDS.get(key, []):
            if kw in product_name and kw not in found:
                found.append(kw)

    return found


CONDITION_RULE_MAP = {
    "알레르기": [
        "알레르기_밀", "알레르기_메밀", "알레르기_대두", "알레르기_복숭아",
        "알레르기_귤오렌지", "알레르기_토마토", "알레르기_돼지고기",
        "알레르기_닭고기", "알레르기_계란", "알레르기_우유",
        "알레르기_고등어", "알레르기_게", "알레르기_조개", "알레르기_새우",
        "알레르기_오징어", "알레르기_땅콩", "알레르기_호두", "알레르기_잣",
        "알레르기_아황산",
    ],
    # 세부 알레르기 19종 — 프론트가 개별 ID로 보낼 수 있도록 각각 자기 키워드만 검사
    "알레르기_밀": ["알레르기_밀"],
    "알레르기_메밀": ["알레르기_메밀"],
    "알레르기_대두": ["알레르기_대두"],
    "알레르기_복숭아": ["알레르기_복숭아"],
    "알레르기_귤오렌지": ["알레르기_귤오렌지"],
    "알레르기_토마토": ["알레르기_토마토"],
    "알레르기_돼지고기": ["알레르기_돼지고기"],
    "알레르기_닭고기": ["알레르기_닭고기"],
    "알레르기_계란": ["알레르기_계란"],
    "알레르기_우유": ["알레르기_우유"],
    "알레르기_고등어": ["알레르기_고등어"],
    "알레르기_게": ["알레르기_게"],
    "알레르기_조개": ["알레르기_조개"],
    "알레르기_새우": ["알레르기_새우"],
    "알레르기_오징어": ["알레르기_오징어"],
    "알레르기_땅콩": ["알레르기_땅콩"],
    "알레르기_호두": ["알레르기_호두"],
    "알레르기_잣": ["알레르기_잣"],
    "알레르기_아황산": ["알레르기_아황산"],
    "아토피": ["알레르기_밀", "알레르기_우유", "알레르기_계란", "아토피_방부제"],
    "천식": ["천식_아황산염"],
    "유당불내증": ["유당불내증"],
    "아나필락시스": ["아나필락시스"],
    "소아비만": ["비만당뇨_정제탄수화물", "비만당뇨_당류", "비만당뇨_나쁜기름"],
    "소아당뇨": ["비만당뇨_정제탄수화물", "비만당뇨_당류", "비만당뇨_나쁜기름"],
    "알레르기비염": [],
    "카페인주의": ["카페인"],
}


# ─────────────────────────────────────────────
# 2. 고열량저영양 판정
# ─────────────────────────────────────────────

def is_high_calorie_low_nutrition(row) -> tuple:
    serving = row.get("serving_g", 30) or 30
    ratio = max(30.0, serving) / serving if serving < 30 else 1.0

    kcal = (row.get("에너지(kcal)", 0) or 0) * serving / 100 * ratio
    sat_fat = (row.get("포화지방산(g)", 0) or 0) * serving / 100 * ratio
    sugar = (row.get("당류(g)", 0) or 0) * serving / 100 * ratio
    protein = (row.get("단백질(g)", 0) or 0) * serving / 100 * ratio

    if protein < 2:
        if kcal > 250 or sat_fat > 4 or sugar > 17:
            return True, f"고열량저영양(단백질부족): kcal={kcal:.0f}, 포화지방={sat_fat:.1f}g, 당류={sugar:.1f}g"

    if kcal > 500 or sat_fat > 8 or sugar > 34:
        return True, f"고열량저영양: kcal={kcal:.0f}, 포화지방={sat_fat:.1f}g, 당류={sugar:.1f}g"

    return False, ""


# ─────────────────────────────────────────────
# 3. 단일 제품 질환 판정
# ─────────────────────────────────────────────

def evaluate_product(row, conditions: list) -> dict:
    result = {
        "safe": True,
        "safe_for": [],
        "warn_for": [],
        "warn_ingredients": {},
        "cautions": [],
    }

    ing = row.get("원재료명", "") or ""
    name = row.get("품목명", "") or ""

    for cond in conditions:
        risk_keys = CONDITION_RULE_MAP.get(cond, [])
        found = detect_risks(ing, risk_keys)
        # 원재료명에 안 잡혔어도 품목명(예: "새우깡")에 알레르겐이 박혀 있으면 위험 처리
        for kw in detect_risks_in_name(name, risk_keys):
            if kw not in found:
                found.append(kw)

        if found:
            result["warn_for"].append(cond)
            result["warn_ingredients"][cond] = found
            result["safe"] = False
        else:
            result["safe_for"].append(cond)

        if cond in ("소아비만", "소아당뇨"):
            flagged, reason = is_high_calorie_low_nutrition(row)
            if flagged:
                if cond in result["safe_for"]:
                    result["safe_for"].remove(cond)
                if cond not in result["warn_for"]:
                    result["warn_for"].append(cond)
                result["warn_ingredients"].setdefault(cond, []).append(reason)
                result["safe"] = False

        if cond == "알레르기비염":
            result["cautions"].append("차가운 음료/얼음류 주의")

    return result


# ─────────────────────────────────────────────
# 4. 전체 데이터셋 필터링
# ─────────────────────────────────────────────

def filter_safe_products(df: pd.DataFrame, conditions: list) -> pd.DataFrame:
    evaluations = [evaluate_product(row, conditions) for _, row in df.iterrows()]
    safe_indices = [i for i, e in enumerate(evaluations) if e["safe"]]
    safe_df = df.iloc[safe_indices].copy()
    safe_df["eval"] = [evaluations[i] for i in safe_indices]
    return safe_df.reset_index(drop=True)


# ─────────────────────────────────────────────
# 5. 영양 점수 계산
# ─────────────────────────────────────────────

# 5.1 컬럼 후보 정의 — load_data()가 만드는 _1회 환산 컬럼 우선
# 칼슘/철은 load_data()의 nutrition_cols에 없어서 _1회 환산이 안 됨 → 100g 기준 컬럼만 존재.
# 임계값(good_rules)이 1회 제공량 기준이라 칼슘/철 보너스는 약간 과대 평가될 수 있음.
NUTRIENT_COLS = {
    "calories":      ["에너지(kcal)_1회", "에너지(kcal)"],
    "sugar":         ["당류(g)_1회", "당류(g)"],
    "sodium":        ["나트륨(mg)_1회", "나트륨(mg)"],
    "saturated_fat": ["포화지방산(g)_1회", "포화지방산(g)"],
    "trans_fat":     ["트랜스지방산(g)_1회", "트랜스지방산(g)"],
    "cholesterol":   ["콜레스테롤(mg)_1회", "콜레스테롤(mg)"],
    "protein":       ["단백질(g)_1회", "단백질(g)"],
    "fiber":         ["식이섬유(g)_1회", "식이섬유(g)"],
    "calcium":       ["칼슘(mg)"],  # _1회 컬럼 없음 — 100g 기준
    "iron":          ["철(mg)"],     # _1회 컬럼 없음 — 100g 기준
}


# 5.2 공통 유틸
def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for col in candidates:
        if col in df.columns:
            return col
    return None


def _get_numeric_series(df: pd.DataFrame, candidates: list[str]) -> pd.Series:
    col = _find_col(df, candidates)
    if col is None:
        return pd.Series(np.nan, index=df.index)
    return pd.to_numeric(df[col], errors="coerce")


def _scale_penalty(
    values: pd.Series,
    no_penalty_at: float,
    max_penalty_at: float,
    max_penalty: float,
    missing_penalty_ratio: float = 0.35,
) -> pd.Series:
    """나쁜 성분 감점. no_penalty_at 이하면 0, max_penalty_at 이상이면 최대감점."""
    penalty = ((values - no_penalty_at) / (max_penalty_at - no_penalty_at)) * max_penalty
    penalty = penalty.clip(lower=0, upper=max_penalty)
    penalty = penalty.fillna(max_penalty * missing_penalty_ratio)
    return penalty


def _scale_bonus(
    values: pd.Series,
    no_bonus_at: float,
    max_bonus_at: float,
    max_bonus: float,
) -> pd.Series:
    """좋은 성분 가산점. 결측은 0."""
    bonus = ((values - no_bonus_at) / (max_bonus_at - no_bonus_at)) * max_bonus
    bonus = bonus.clip(lower=0, upper=max_bonus)
    bonus = bonus.fillna(0)
    return bonus


def _contains_any_tag(value, selected_tags: list[str]) -> int:
    if value is None or (not isinstance(value, list) and pd.isna(value)):
        return 0
    tags_text = " ".join(map(str, value)) if isinstance(value, list) else str(value)
    return sum(1 for tag in selected_tags if tag and tag in tags_text)


# 5.3 영양 위험 점수 — 100점 시작, 위험 성분 감점 + 좋은 성분 가산
def compute_nutrition_risk_score(
    df: pd.DataFrame,
    missing_penalty_ratio: float = 0.35,
) -> pd.Series:
    """
    1회 제공량 기준 임계값. _1회 컬럼이 있으면 자동 사용.
    임계값은 임시 설계값이므로 실제 분포를 보고 조정 필요.
    """
    score = pd.Series(100.0, index=df.index)

    bad_rules = {
        "sugar":         (3,   12,   30),
        "sodium":        (100, 350,  20),
        "saturated_fat": (1,   4,    15),
        "trans_fat":     (0,   0.2,  15),
        "calories":      (100, 250,  10),
        "cholesterol":   (0,   30,   5),
    }
    for key, (low, high, max_penalty) in bad_rules.items():
        values = _get_numeric_series(df, NUTRIENT_COLS[key])
        score -= _scale_penalty(
            values=values,
            no_penalty_at=low,
            max_penalty_at=high,
            max_penalty=max_penalty,
            missing_penalty_ratio=missing_penalty_ratio,
        )

    good_rules = {
        "fiber":   (0, 3, 8),
        "protein": (0, 5, 5),
    }
    for key, (low, high, max_bonus) in good_rules.items():
        values = _get_numeric_series(df, NUTRIENT_COLS[key])
        score += _scale_bonus(
            values=values,
            no_bonus_at=low,
            max_bonus_at=high,
            max_bonus=max_bonus,
        )

    return score.clip(lower=0, upper=100).round().astype(int)


# 5.4 보조 점수들 — compute_safe_snack_score에서만 사용
def compute_public_policy_score(df: pd.DataFrame) -> pd.Series:
    """
    기본 100점. is_high_calorie_low_nutrition() 룰에 걸리면 30점.
    별도 컬럼이 없어 영양성분에서 직접 row 단위로 판정한다.
    """
    flagged = df.apply(lambda row: is_high_calorie_low_nutrition(row)[0], axis=1)
    score = pd.Series(np.where(flagged, 30.0, 100.0), index=df.index)
    return score.clip(lower=0, upper=100).round().astype(int)


def compute_preference_score(
    df: pd.DataFrame,
    selected_tastes: list[str] | None = None,
) -> pd.Series:
    if not selected_tastes:
        return pd.Series(100.0, index=df.index)
    if "taste_tags" not in df.columns:
        return pd.Series(60.0, index=df.index)

    selected_tastes = [str(t).strip() for t in selected_tastes if str(t).strip()]
    if not selected_tastes:
        return pd.Series(100.0, index=df.index)

    matched_counts = df["taste_tags"].apply(
        lambda x: _contains_any_tag(x, selected_tastes)
    )
    match_ratio = matched_counts / len(selected_tastes)

    # 취향은 안전보다 약한 조건 — 미일치도 60점은 부여
    score = 60 + 40 * match_ratio
    return score.clip(lower=0, upper=100).round().astype(int)


# 5.5 기존 시그니처 유지용 wrapper — product_service/group_service가 그대로 사용
def compute_nutrition_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    0~100 영양 점수. 기존 호출부 호환을 위해 df → df 시그니처 유지.

    원래 로직(50점 시작, 컬럼 max 정규화)에서 새 룰(100점 시작, 절대 임계값)로 교체.
    결측은 약한 페널티(0.15)만 부과해 기존 동작과의 충격을 줄임 —
    더 강한 결측 페널티가 필요하면 compute_safe_snack_score를 사용할 것.
    """
    df = df.copy()
    df["nutrition_score"] = compute_nutrition_risk_score(df, missing_penalty_ratio=0.15)
    return df


# 5.6 최종 안심간식 적합도 점수 — 신규 호출자만 사용. nutrition_score를 덮지 않음.
def compute_safe_snack_score(
    df: pd.DataFrame,
    selected_tastes: list[str] | None = None,
) -> pd.DataFrame:
    """
    safe_snack_score =
        nutrition_risk_score    * 0.70
        + public_policy_score   * 0.15
        + preference_score      * 0.15

    기존 nutrition_score 컬럼은 그대로 유지하고, 보조 점수와
    safe_snack_score를 새 컬럼으로 추가만 한다. (의미 충돌 방지)
    """
    df = df.copy()

    df["nutrition_risk_score"] = compute_nutrition_risk_score(df)
    df["public_policy_score"] = compute_public_policy_score(df)
    df["preference_score"] = compute_preference_score(df, selected_tastes=selected_tastes)

    df["safe_snack_score"] = (
        df["nutrition_risk_score"]    * 0.70
        + df["public_policy_score"]   * 0.15
        + df["preference_score"]      * 0.15
    ).clip(lower=0, upper=100).round().astype(int)

    return df


# ─────────────────────────────────────────────
# 6. 맛 태그
# ─────────────────────────────────────────────

# 30% 임계치 + 직관 블랙리스트로 정제 (taste_keywords_analysis.ipynb 참조).
# 매칭률이 30% 이상이거나 직관적으로 첨가물성으로 판단된 키워드는 제거.
TASTE_KEYWORDS = {
    # "설탕"(63.5%) 제거 — 거의 모든 과자 첨가물.
    "달달": ["백설탕", "갈색설탕", "흑설탕", "물엿", "올리고당", "꿀", "벌꿀", "허니", "달콤", "달고나", "단밤", "바닐라", "바닐린", "카스타드", "크림", "생크림"],
    "카라멜": ["카라멜", "캐러멜", "골든시럽", "단풍당시럽", "당밀시럽"],
    "초코": ["초콜릿", "초코", "카카오", "코코아", "코코아매스", "다크초콜릿", "밀크초콜릿", "화이트초콜릿", "준초콜릿", "초코칩", "코코아분말"],
    "말차": ["말차", "녹차", "녹차가루", "그린티"],
    "커피": ["커피", "카푸치노", "모카", "커피향", "라떼"],

    # "짭짤": "소금"(61.5%)·"정제소금"(58.7%)은 자동 제외. "식염"/"천일염"/"가공소금"/"재제소금"/"맛소금"은
    # 첨가물성으로 블랙리스트 제외. 남은 키워드는 데이터에 거의 없지만 미래 표기를 위해 유지.
    "짭짤": ["솔트", "소금빵","소금","정제소금"],
    "버터갈릭": ["버터", "가공버터", "무염버터", "버터향", "갈릭", "마늘", "마늘가루", "마늘페이스트", "건마늘분말"],
    "치즈": ["치즈", "체다치즈", "치즈분말", "가공치즈", "크림치즈", "치즈향", "체다치즈분말"],
    "고소": ["참깨", "볶은참깨", "검은깨", "흑임자", "참기름", "들기름", "볶음땅콩", "아몬드", "호두", "잣", "피스타치오"],

    "매콤": ["고추", "고춧가루", "청양고추", "스리라차", "할라피뇨", "매운", "칠리", "페퍼"],
    "바베큐": ["바베큐", "바비큐", "숯불", "훈제", "스모키"],
    "양파": ["양파", "양파분말", "양파향", "어니언", "볶음양파분말"],
    "와사비": ["와사비", "고추냉이"],

    "새우": ["새우", "냉동새우", "새우분말", "새우엑기스", "새우맛씨즈닝"],
    "오징어": ["오징어", "오징어엑기스", "오징어페이스트", "버터구이오징어"],
    "감자": ["감자", "감자분말", "감자전분", "감자플레이크", "감자그래뉼", "건조감자분말"],
    "고구마": ["고구마", "고구마분말", "고구마향", "자색고구마"],
    # "옥수수": "옥수수"(23.7%)는 임계치 미만이지만 "옥수수전분"/"옥수수가루"까지 부분매칭으로 잡혀
    # 침투 발생. "옥수수전분"·"옥수수가루"는 첨가물성으로 블랙리스트. 결과적으로 원재료 매칭은
    # 거의 무의미해지나 미래 표기를 위해 "팝콘"/"강냉이"만 유지.
    "옥수수": [ "팝콘", "강냉이"],
    "김": ["김", "조미김"],
    "누룽지": ["누룽지", "누룽지분말", "볶은쌀"],

    "딸기": ["딸기", "딸기분말", "딸기향", "가당딸기", "동결건조딸기"],
    "바나나": ["바나나", "바나나향", "바나나분말", "바나나농축분말"],
    "복숭아": ["복숭아"],
    "사과": ["사과", "사과향", "사과농축액"],
    "파인애플": ["파인애플", "파인애플분말", "파인애플향"],
    "멜론": ["멜론", "멜론분말", "멜론향"],
    "블루베리": ["블루베리", "블루베리분말", "동결건조블루베리"],
    "귤감귤": ["귤", "감귤", "오렌지", "레몬", "유자"],

    "요거트": ["요거트", "요구르트", "농후발효유", "발효유", "그릭요거트"],
}

NAME_TASTE_KEYWORDS = {
    "새우": ["새우", "쉬림프"],
    "감자": ["감자"],
    "고구마": ["고구마"],
    "옥수수": ["옥수수", "콘칩", "콘칲", "팝콘", "강냉이", "고래밥", "콘스프", "베이비콘"],
    "초코": ["초코", "초콜릿", "카카오", "코코아"],
    "치즈": ["치즈"],
    "딸기": ["딸기"],
    "바나나": ["바나나"],
    "복숭아": ["복숭아"],
    "사과": ["사과"],
    "파인애플": ["파인애플"],
    "멜론": ["멜론"],
    "블루베리": ["블루베리"],
    "귤감귤": ["유자", "감귤", "귤"],
    "말차": ["말차"],
    "커피": ["커피", "카푸치노", "모카", "라떼"],
    "카라멜": ["카라멜", "캐러멜"],
    "버터갈릭": ["버터", "갈릭", "마늘"],
    "매콤": ["매콤", "매운", "핫", "청양", "스리라차", "칠리", "불닭", "짜장", "짬뽕", "비빔", "辛", "떡볶이"],
    "바베큐": ["바베큐", "바비큐", "숯불"],
    "양파": ["양파", "어니언"],
    "와사비": ["와사비"],
    "오징어": ["오징어"],
    "게": ["게", "대게", "꽃게"],
    "김": ["김"],
    "누룽지": ["누룽지"],
    "요거트": ["요거트"],
    "달달": ["꿀", "허니", "달콤", "달고나", "카스타드"],
    "짭짤": ["소금", "솔트", "솔티", "솔티드", "소금빵", "오리지널", "오리지날", "나쵸","콘"],
    "고소": ["참깨", "땅콩", "아몬드", "호두", "피스타치오", "고소", "포스틱", "인디안"],
}


def tag_taste(ingredient_text: str, product_name: str = "") -> list:
    tags = set()
    ingredient_text = ingredient_text or ""
    product_name = product_name or ""

    for taste, keywords in TASTE_KEYWORDS.items():
        for kw in keywords:
            if kw in ingredient_text:
                tags.add(taste)
                break

    for taste, keywords in NAME_TASTE_KEYWORDS.items():
        for kw in keywords:
            if kw in product_name:
                tags.add(taste)
                break

    return list(tags)


# 과일 계열 맛 태그 — 이들끼리만 OR (합집합)로 묶는다.
# 예: 바나나+복숭아 → 둘 중 하나라도 들어간 과자.
# 새 과일 맛을 추가할 때는 이 집합에도 함께 추가할 것.
FRUIT_TASTES: set[str] = {
    "딸기", "바나나", "복숭아", "사과", "파인애플",
    "멜론", "블루베리", "귤감귤",
}


def match_tastes(product_tags, selected_tastes: list[str]) -> bool:
    """
    선택된 맛 태그들과 상품 태그를 비교한다.
    - 과일 태그(FRUIT_TASTES)끼리는 OR — 예: 바나나+복숭아 → 둘 중 하나
    - 그 외 태그는 모두 AND (각 태그가 전부 매치되어야 함)
      예: 옥수수+매콤 → 매콤한 옥수수
          달달+초코 → 달달한 초코
          바나나+복숭아+매콤 → (바나나 OR 복숭아) AND 매콤
    """
    if not selected_tastes:
        return True
    if not isinstance(product_tags, list):
        return False

    tag_set = set(product_tags)
    fruit_selected = [t for t in selected_tastes if t in FRUIT_TASTES]
    non_fruit_selected = [t for t in selected_tastes if t not in FRUIT_TASTES]

    if fruit_selected and not any(t in tag_set for t in fruit_selected):
        return False
    if not all(t in tag_set for t in non_fruit_selected):
        return False
    return True


# ─────────────────────────────────────────────
# 7. 최적 조합 추천
# ─────────────────────────────────────────────

def recommend_combination(
    safe_df: pd.DataFrame,
    budget: int,
    max_items: int = 5,
    taste_filter: list = None,
) -> pd.DataFrame:
    df = safe_df.copy()

    df["taste_tags"] = df.apply(
        lambda r: tag_taste(str(r.get("원재료명", "")), str(r.get("품목명", ""))),
        axis=1
    )

    if taste_filter:
        df = df[df["taste_tags"].apply(lambda tags: any(t in tags for t in taste_filter))]

    if df.empty:
        return pd.DataFrame()

    df["score_per_price"] = df["nutrition_score"] / (df["price_per_unit"] + 1)
    df = df.sort_values("score_per_price", ascending=False)

    selected = []
    remaining_budget = budget

    for _, row in df.iterrows():
        if len(selected) >= max_items:
            break
        if row["price_per_unit"] <= remaining_budget:
            selected.append(row)
            remaining_budget -= row["price_per_unit"]

    if not selected:
        return pd.DataFrame()

    result = pd.DataFrame(selected)
    result["taste_tags"] = result["taste_tags"].apply(lambda x: ", ".join(x))

    wanted_cols = [
        "품목명", "제조사명", "price_per_unit", "nutrition_score", "taste_tags",
        "에너지(kcal)", "당류(g)", "포화지방산(g)", "단백질(g)"
    ]
    existing_cols = [c for c in wanted_cols if c in result.columns]
    return result[existing_cols]