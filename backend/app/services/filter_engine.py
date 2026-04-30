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
        "유함유가공품", "유당"
    ],
    "알레르기_고등어": ["고등어"],
    "알레르기_게": ["게", "크랩"],
    "알레르기_조개": ["조개", "홍합", "전복", "굴"],
    "알레르기_새우": ["새우", "냉동새우", "새우엑기스", "새우맛씨즈닝"],
    "알레르기_오징어": ["오징어", "오징어페이스트", "오징어엑기스"],
    "알레르기_땅콩": ["땅콩", "피넛", "peanut", "땅콩분말", "볶음땅콩", "볶음땅콩분태", "꿀땅콩", "땅콩버터"],
    "알레르기_호두": ["호두", "walnut", "호두견과분말", "호두분태"],
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


CONDITION_RULE_MAP = {
    "알레르기": [
        "알레르기_밀", "알레르기_메밀", "알레르기_대두", "알레르기_복숭아",
        "알레르기_귤오렌지", "알레르기_토마토", "알레르기_돼지고기",
        "알레르기_닭고기", "알레르기_계란", "알레르기_우유",
        "알레르기_고등어", "알레르기_게", "알레르기_조개", "알레르기_새우",
        "알레르기_오징어", "알레르기_땅콩", "알레르기_호두", "알레르기_잣",
        "알레르기_아황산",
    ],
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

    for cond in conditions:
        risk_keys = CONDITION_RULE_MAP.get(cond, [])
        found = detect_risks(ing, risk_keys)

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
def compute_nutrition_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    0~100 범위 점수로 정규화
    기본 50점에서 좋은 성분은 가산, 나쁜 성분은 감점
    """
    good = ["단백질(g)", "식이섬유(g)", "칼슘(mg)", "철(mg)"]
    bad = ["당류(g)", "포화지방산(g)", "나트륨(mg)", "트랜스지방산(g)", "콜레스테롤(mg)"]

    score = pd.Series(50.0, index=df.index)

    for col in good:
        if col in df.columns:
            vals = df[col].fillna(0)
            max_val = vals.max()
            if max_val > 0:
                score += (vals / max_val) * 12.5   # good 4개면 최대 +50

    for col in bad:
        if col in df.columns:
            vals = df[col].fillna(0)
            max_val = vals.max()
            if max_val > 0:
                score -= (vals / max_val) * 10.0   # bad 5개면 최대 -50

    df = df.copy()
    df["nutrition_score"] = score.clip(lower=0, upper=100).round(2)
    
    return df


# ─────────────────────────────────────────────
# 6. 맛 태그
# ─────────────────────────────────────────────

TASTE_KEYWORDS = {
    "달달": ["설탕", "백설탕", "갈색설탕", "흑설탕", "물엿", "올리고당", "꿀", "벌꿀", "허니", "달콤", "달고나", "단밤", "바닐라", "바닐린", "카스타드", "크림", "생크림"],
    "카라멜": ["카라멜", "캐러멜", "골든시럽", "단풍당시럽", "당밀시럽"],
    "초코": ["초콜릿", "초코", "카카오", "코코아", "코코아매스", "다크초콜릿", "밀크초콜릿", "화이트초콜릿", "준초콜릿", "초코칩", "코코아분말"],
    "말차": ["말차", "녹차", "녹차가루", "그린티"],
    "커피": ["커피", "카푸치노", "모카", "커피향", "라떼"],

    "짭짤": ["소금", "정제소금", "식염", "천일염", "재제소금", "맛소금", "가공소금", "솔트", "소금빵"],
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
    "옥수수": ["옥수수", "옥수수가루", "옥수수전분", "팝콘", "강냉이"],
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
    "매콤": ["매콤", "매운", "핫", "청양", "스리라차", "칠리", "불닭", "짜장", "짬뽕", "비빔", "辛"],
    "바베큐": ["바베큐", "바비큐", "숯불"],
    "양파": ["양파", "어니언"],
    "와사비": ["와사비"],
    "오징어": ["오징어"],
    "게": ["게", "대게", "꽃게"],
    "김": ["김"],
    "누룽지": ["누룽지"],
    "요거트": ["요거트"],
    "달달": ["꿀", "허니", "달콤", "달고나", "카스타드"],
    "짭짤": ["소금", "솔트", "소금빵", "오리지널", "오리지날", "나쵸"],
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