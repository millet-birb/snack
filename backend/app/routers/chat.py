"""챗봇 엔드포인트 (레벨 2 — 제품 DB 검색 도구 연결).

사용자 메시지를 OpenAI에 전달하되, OpenAI가 'search_snacks'라는 도구를
호출할 수 있게 한다. 도구가 호출되면 백엔드의 get_products()를 실제로 실행해
그 결과를 다시 OpenAI에 돌려주고, OpenAI가 최종 추천 문장을 작성한다.
"""

import json
import logging
import os
from collections import OrderedDict
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field

from app.services.product_service import get_products
from app.services.product_filters import normalize_conditions
from app.services.group_service import (
    recommend_mode_a,
    recommend_mode_b,
    recommend_mode_c,
)

# backend/.env 를 명시적으로 불러온다.
#   이 파일: backend/app/routers/chat.py  ->  parents[2] = backend/
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

logger = logging.getLogger(__name__)

# gpt-4o-mini: 저렴하고 빠른 모델. 개발/학습 단계에 적합하다.
MODEL = "gpt-4o-mini"

# 챗봇이 검색에 사용할 수 있는 건강 상태 목록 (프론트엔드 조건 키와 동일).
# "알레르기"는 19개 알레르겐 전체를 막는 광범위 옵션이므로,
# 사용자가 특정 알레르기 하나만 말하면 반드시 해당 세부 키(예: "알레르기_새우")를 써야 한다.
CONDITION_OPTIONS = [
    "알레르기",
    "알레르기_밀",
    "알레르기_메밀",
    "알레르기_대두",
    "알레르기_복숭아",
    "알레르기_귤오렌지",
    "알레르기_토마토",
    "알레르기_돼지고기",
    "알레르기_닭고기",
    "알레르기_계란",
    "알레르기_우유",
    "알레르기_고등어",
    "알레르기_게",
    "알레르기_조개",
    "알레르기_새우",
    "알레르기_오징어",
    "알레르기_땅콩",
    "알레르기_호두",
    "알레르기_잣",
    "알레르기_아황산",
    "아토피",
    "소아천식",
    "유당불내증",
    "아나필락시스",
    "소아비만",
    "소아당뇨",
    "카페인",
]

# 단체구매 도구에서 LLM이 고를 수 있는 맛 태그 목록 (filter_engine.TASTE_KEYWORDS / NAME_TASTE_KEYWORDS 기준).
# tastes(포함)와 excludeTastes(제외) 둘 다 이 목록에서 고른다.
TASTE_OPTIONS = [
    "달달", "카라멜", "초코", "말차", "커피",
    "짭짤", "버터갈릭", "치즈", "고소",
    "매콤", "바베큐", "양파", "와사비",
    "새우", "오징어", "감자", "고구마", "옥수수", "김", "누룽지",
    "딸기", "바나나", "복숭아", "사과", "파인애플", "멜론", "블루베리", "귤감귤",
    "요거트",
]

# 챗봇의 성격과 역할을 정해주는 '시스템 프롬프트'.
SYSTEM_PROMPT = (
    "너는 'SafeSnack'이라는 서비스의 친절한 간식 상담 도우미야. "
    "아이의 건강 상태에 맞춰 안전한 간식을 한국어로 따뜻하게 추천해줘.\n"
    "사용자가 한 아이를 위한 간식 추천이나 특정 조건의 제품을 찾으면, "
    "반드시 search_snacks 도구를 사용해 실제 제품을 검색한 뒤 답변해. "
    "도구 결과에 없는 제품을 지어내면 안 돼.\n"
    "알레르기 조건은 가능한 한 좁게 선택해. "
    "예) 사용자가 '새우 알러지'라고 하면 'conditions=[\"알레르기_새우\"]'를, "
    "'땅콩 알러지'라고 하면 'conditions=[\"알레르기_땅콩\"]'를 써. "
    "단순히 '알레르기'만 쓰면 19개 알레르겐을 모두 빼서 결과가 거의 비게 되니, "
    "사용자가 알레르겐을 명시하지 않은 경우에만 'conditions=[\"알레르기\"]'를 사용해.\n"
    "사용자가 '저칼로리', '다이어트', '칼로리 낮은' 같은 요청을 하면 "
    "반드시 sortBy=\"lowCalorie\" 를 사용해. "
    "이 정렬은 '1회 섭취량당 칼로리'(영양 라벨 표준) 기준으로 낮은 순으로 정렬한다. "
    "사용자가 구체적인 상한선을 말하면 maxCaloriesPerServing 도 함께 써.\n"
    "추천할 때는 제품명·브랜드·가격과 함께, "
    "'1회 섭취량(예: 30g) 기준 ~kcal' 처럼 1회 섭취량과 그 칼로리를 같이 알려줘. "
    "왜 추천하는지 한두 문장으로 설명해줘. "
    "의학적 진단은 내리지 말고, 걱정되는 증상이 있으면 전문가 상담을 권해줘.\n"
    "─── 예산/가격 언급 규칙 ───\n"
    "사용자가 예산이나 가격(예: '2만 원 이하', '예산 3만 원', '5천원짜리')을 "
    "말하지 않았다면, 답변에서 '총예산은 ~원입니다', '예산 ~원에 맞춰' 같은 "
    "예산 관련 문구를 절대 만들어 쓰지 마. 도구 호출 시에도 budget 필드를 비워두고 "
    "임의의 기본값(2만원 등)을 끼워넣지 마.\n"
    "─── 단체구매(여러 명) 처리 ───\n"
    "사용자가 '총 N명', '단체', '여러 명', '조합 추천', '예산 N원으로 카트' 같이 "
    "여러 아이를 위한 추천을 원하면 'recommend_group_purchase' 도구를 써. "
    "기본 mode='C'(자동 카트 구성)을 쓰고, 사용자가 '같은 과자 한 종으로'라고 하면 sameSnack=true, "
    "'아이마다 다른 과자'라고 하면 sameSnack=false 로 한다. "
    "diseaseGroups는 질환별 인원수 맵으로 보낸다. 예) 우유 알레르기 2명이면 "
    "diseaseGroups={\"알레르기\":2}, allergyConditions=[\"알레르기_우유\"] 처럼 "
    "묶음 키(\"알레르기\")로 인원을 세고 세부 알레르겐은 allergyConditions에 넣어.\n"
    "맛 처리: '단 거 빼고', '너무 달지 않은', '단맛 제외'는 excludeTastes=[\"달달\",\"카라멜\"] 로 보낸다 "
    "(초코까지 빼고 싶다는 명확한 표현이 있으면 \"초코\"도 추가). "
    "특정 맛을 원한다는 표현('짭짤한', '치즈맛')만 tastes에 넣고, '제외'는 절대 tastes 에 넣지 마. "
    "tastes와 excludeTastes에서 같은 태그를 동시에 쓰지 마."
)

# ---- OpenAI에 알려줄 '도구' 설명 -------------------------------------------
# OpenAI는 이 설명을 보고 "언제 / 어떤 값으로" 도구를 호출할지 스스로 판단한다.
SEARCH_SNACKS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_snacks",
        "description": (
            "SafeSnack 제품 데이터베이스에서 아이에게 안전한 과자/간식을 검색한다. "
            "사용자가 간식 추천을 원하거나 특정 조건의 제품을 찾을 때 사용한다."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "conditions": {
                    "type": "array",
                    "items": {"type": "string", "enum": CONDITION_OPTIONS},
                    "description": "아이가 가진 건강 상태 목록. 해당 없으면 빈 배열 [].",
                },
                "query": {
                    "type": "string",
                    "description": "제품명·브랜드·원재료 검색 키워드. 특별한 키워드가 없으면 빈 문자열.",
                },
                "budget": {
                    "type": "integer",
                    "description": (
                        "1개당 최대 가격(원). 사용자가 '~원 이하', '예산 ~원', "
                        "'~원짜리' 처럼 가격을 명시적으로 말한 경우에만 보낸다. "
                        "언급이 없으면 절대 임의의 기본값을 넣지 말고 필드 자체를 생략해."
                    ),
                },
                "maxCaloriesPerServing": {
                    "type": "integer",
                    "description": "1회 섭취량당 최대 칼로리(kcal). 상한 요구가 없으면 생략. 일반 과자 1회(보통 30g) 기준 보통 100~200 kcal 수준.",
                },
                "sortBy": {
                    "type": "string",
                    "enum": ["nutritionScore", "lowCalorie"],
                    "description": "결과 정렬 기준. 기본값 'nutritionScore'(영양점수 높은 순). '저칼로리' 요청 시에는 'lowCalorie'(1회 섭취량당 칼로리가 낮은 순) 사용.",
                },
            },
            "required": ["conditions"],
        },
    },
}

GROUP_PURCHASE_TOOL = {
    "type": "function",
    "function": {
        "name": "recommend_group_purchase",
        "description": (
            "여러 명을 위한 단체구매 추천. 사용자가 '총 N명', '단체', '여러 명', "
            "'예산 N원으로 조합', '나눠 사' 등을 말하면 사용한다."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "totalPeople": {
                    "type": "integer",
                    "description": "전체 인원 수 (예: '총 10명' → 10).",
                },
                "diseaseGroups": {
                    "type": "object",
                    "description": (
                        "질환별 인원수 맵. 키는 search_snacks의 conditions 와 같은 어휘를 쓰되, "
                        "알레르기는 묶음 키 '알레르기'로 인원수만 센다 (세부 알레르겐은 allergyConditions로)."
                    ),
                    "additionalProperties": {"type": "integer"},
                },
                "allergyConditions": {
                    "type": "array",
                    "items": {"type": "string", "enum": CONDITION_OPTIONS},
                    "description": "구체적인 알레르겐(예: '알레르기_우유'). 일반 알레르기 인원은 diseaseGroups에 두고, 여기엔 세부 알레르겐만.",
                },
                "tastes": {
                    "type": "array",
                    "items": {"type": "string", "enum": TASTE_OPTIONS},
                    "description": "포함하고 싶은 맛 태그. '제외' 의도는 절대 넣지 말 것.",
                },
                "excludeTastes": {
                    "type": "array",
                    "items": {"type": "string", "enum": TASTE_OPTIONS},
                    "description": "제외할 맛 태그. '단 거 빼고' → ['달달','카라멜'] 처럼 변환.",
                },
                "budget": {
                    "type": "integer",
                    "description": "총 예산(원). 예) '3만 원' → 30000.",
                },
                "mode": {
                    "type": "string",
                    "enum": ["A", "B", "C"],
                    "description": (
                        "A=전원 같이 먹을 수 있는 과자 목록만 반환, "
                        "B=질환별 그룹마다 따로 후보 목록, "
                        "C=예산에 맞춰 자동으로 장바구니까지 구성(기본값)."
                    ),
                },
                "perPerson": {
                    "type": "integer",
                    "description": "1인당 받을 낱개 수 (mode=C에서만 사용, 기본 1).",
                },
                "sameSnack": {
                    "type": "boolean",
                    "description": "mode=C에서 그룹 내 모두 같은 과자(True) vs 인원마다 다른 과자(False). 기본 True.",
                },
            },
            "required": ["totalPeople", "budget"],
        },
    },
}

router = APIRouter()


# ---- 동일 질문 응답 캐시 ----------------------------------------------------
# 같은 질문이 반복될 때마다 OpenAI를 다시 호출하면 토큰이 낭비된다.
# 메시지 텍스트(정규화) → 직전 응답을 메모리에 LRU로 보관해 재사용한다.
# 프로세스 재시작 시 사라지는 휘발성 캐시 (Redis 등 외부 저장소 없음).
_RESPONSE_CACHE: "OrderedDict[str, str]" = OrderedDict()
_CACHE_MAX_SIZE = 128


def _cache_key(message: str) -> str:
    return " ".join(message.strip().lower().split())


def _cache_get(key: str) -> str | None:
    if key in _RESPONSE_CACHE:
        _RESPONSE_CACHE.move_to_end(key)
        return _RESPONSE_CACHE[key]
    return None


def _cache_set(key: str, value: str) -> None:
    _RESPONSE_CACHE[key] = value
    _RESPONSE_CACHE.move_to_end(key)
    if len(_RESPONSE_CACHE) > _CACHE_MAX_SIZE:
        _RESPONSE_CACHE.popitem(last=False)


# ---- 요청/응답 형식 정의 ----------------------------------------------------
# role 은 반드시 "user" 또는 "assistant" 만 허용한다.
# "system"/"tool" 을 허용하면 클라이언트가 시스템 프롬프트를 덮어쓰거나
# 가짜 도구 결과를 주입해 안전 가이드(알레르기 규칙 등)를 무력화할 수 있다.
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    # 길이 상한은 OpenAI 토큰 비용 폭주 / DoS 방지용.
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str                         # 챗봇의 답변


# ---- 도구가 실제로 하는 일 --------------------------------------------------
def run_search_snacks(args: dict) -> dict:
    """OpenAI가 search_snacks 도구를 호출하면 이 함수가 실행된다.

    기존 get_products() 검색 함수를 그대로 재사용한 뒤,
    칼로리 필터/정렬은 여기서 후처리한다
    (get_products 자체는 칼로리 기준 정렬을 지원하지 않으므로).

    칼로리는 '1회 섭취량당' 기준으로 다룬다 (영양 라벨 표준).
    """
    conditions = args.get("conditions", []) or []
    query = args.get("query", "") or ""
    # 사용자가 예산을 말한 적이 없으면 budget=0 으로 호출해서
    # apply_budget_filter 가 가격 컷오프 자체를 건너뛰게 한다.
    # (이전에는 20000원을 슬며시 끼워넣어 LLM이 가짜 예산을 답변에 적어버렸음.)
    budget_arg = args.get("budget")
    budget = int(budget_arg) if budget_arg else 0
    max_cal_per_serving = args.get("maxCaloriesPerServing")
    sort_by = args.get("sortBy", "nutritionScore")

    # 칼로리 정렬/필터가 필요한 경우, 후처리할 수 있도록 후보를 더 많이 가져온다.
    needs_post_processing = (max_cal_per_serving is not None) or (sort_by == "lowCalorie")
    per_page = 30 if needs_post_processing else 5

    try:
        result = get_products(
            conditions=conditions,
            tastes=[],
            budget=budget,
            query=query,
            sort="score_desc",   # 일단 영양 점수 높은 순으로 받음
            page=1,
            per_page=per_page,
        )
    except Exception as e:
        return {"error": f"검색 중 오류가 발생했습니다: {e}"}

    candidates = result["products"]

    # 1) 1회 섭취량당 칼로리 상한 필터
    if max_cal_per_serving is not None:
        candidates = [
            p for p in candidates
            if p["nutrition"]["caloriesKcal"] <= max_cal_per_serving
        ]

    # 2) 1회 섭취량당 칼로리 오름차순 정렬
    if sort_by == "lowCalorie":
        candidates.sort(key=lambda p: p["nutrition"]["caloriesKcal"])

    # 3) 상위 5개만 LLM에 전달
    candidates = candidates[:5]

    # OpenAI에 넘길 정보는 핵심만 추려 토큰(=비용)을 아낀다.
    products = []
    for p in candidates:
        products.append({
            "name": p["name"],
            "brand": p["brand"],
            "price": p["price"],
            "servingG": round(p.get("servingG", 0) or 0, 1),
            "caloriesPerServingKcal": round(p["nutrition"]["caloriesKcal"], 1),
        })

    # 후처리한 경우 result["total"] 은 칼로리 필터 전 개수이므로
    # 혼동을 막기 위해 실제 반환 개수로 표기한다.
    total_found = len(products) if needs_post_processing else result["total"]

    return {"totalFound": total_found, "products": products}


def run_group_purchase(args: dict) -> dict:
    """OpenAI가 recommend_group_purchase 도구를 호출하면 실행되는 함수.

    group_service 는 백엔드 어휘(천식, 카페인주의 ...) 를 기대하므로
    diseaseGroups 키는 normalize_conditions 로 한 번 번역해 넘긴다.
    응답은 토큰을 아끼기 위해 cart/groups/products 의 핵심 필드만 남긴다.
    """
    total_people = int(args.get("totalPeople") or 0)
    budget = int(args.get("budget") or 0)
    if total_people <= 0 or budget <= 0:
        return {"error": "totalPeople 과 budget 은 양수여야 해요."}

    raw_groups: dict = args.get("diseaseGroups") or {}
    front_keys = list(raw_groups.keys())
    back_keys = normalize_conditions(front_keys)
    disease_groups = {bk: int(raw_groups[fk] or 0) for fk, bk in zip(front_keys, back_keys)}

    group_info = {"totalPeople": total_people, "diseaseGroups": disease_groups}
    allergy = args.get("allergyConditions") or []
    tastes = args.get("tastes") or []
    exclude_tastes = args.get("excludeTastes") or []
    mode = (args.get("mode") or "C").upper()

    try:
        if mode == "A":
            res = recommend_mode_a(
                group_info=group_info, tastes=tastes, budget=budget,
                allergy_conditions=allergy, exclude_tastes=exclude_tastes,
            )
        elif mode == "B":
            res = recommend_mode_b(
                group_info=group_info, tastes=tastes, budget=budget,
                allergy_conditions=allergy, exclude_tastes=exclude_tastes,
            )
        else:
            res = recommend_mode_c(
                group_info=group_info, tastes=tastes, budget=budget,
                per_person=int(args.get("perPerson") or 1),
                pinned_ids=[], pinned_groups=[], pinned_group_counts={},
                allergy_conditions=allergy,
                same_snack=bool(args.get("sameSnack", True)),
                exclude_tastes=exclude_tastes,
            )
    except Exception as e:
        logger.exception("group recommend failed: %s", e)
        return {"error": "단체구매 추천 중 오류가 발생했어요."}

    # 토큰 절약: LLM 에게는 핵심 필드만.
    if "cart" in res:
        res["cart"] = [
            {
                "name": c.get("name"),
                "brand": c.get("brand", ""),
                "qty": c.get("quantity"),
                "subtotal": c.get("subtotal"),
                "group": c.get("groupLabel", ""),
            }
            for c in res["cart"]
        ]
    if "products" in res:
        res["products"] = [
            {"name": p.get("name"), "brand": p.get("brand", ""), "price": p.get("price")}
            for p in res["products"][:10]
        ]
    if "groups" in res:
        for g in res["groups"]:
            g["products"] = [
                {"name": p.get("name"), "brand": p.get("brand", ""), "price": p.get("price")}
                for p in g.get("products", [])[:5]
            ]
    return res


# ---- 엔드포인트 -------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not OPENAI_API_KEY:
        # 서버 로그에는 자세히, 클라이언트에는 일반 메시지만.
        # 내부 파일 경로(.env 위치)를 외부에 알려주면 공격 표면이 넓어진다.
        logger.error("OPENAI_API_KEY is not set (check backend/.env)")
        raise HTTPException(
            status_code=503,
            detail="챗봇 서비스를 일시적으로 사용할 수 없어요. 잠시 후 다시 시도해주세요.",
        )

    # 동일 질문이면 OpenAI 호출 없이 캐시된 응답을 즉시 돌려준다.
    cache_key = _cache_key(req.message)
    cached_reply = _cache_get(cache_key)
    if cached_reply is not None:
        return ChatResponse(reply=cached_reply)

    client = OpenAI(api_key=OPENAI_API_KEY)

    # OpenAI에 보낼 메시지 목록: 시스템 + 이전 대화(최근 N개만) + 이번 메시지
    # 히스토리를 통째로 보내면 턴마다 토큰이 선형 증가하므로 최근 6개로 자른다.
    MAX_HISTORY = 6
    messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.history[-MAX_HISTORY:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    try:
        # 도구를 쓸 수도 있으므로 최대 4번까지 OpenAI와 주고받는다.
        # (무한 반복을 막기 위한 안전장치)
        for i in range(4):
            kwargs: dict = {
                "model": MODEL,
                "messages": messages,
                "max_tokens": 500,
            }
            # 첫 턴에만 도구 스키마를 보낸다. enum(27개)이 무거워서 매 턴마다
            # 재전송하면 토큰 낭비가 크다. 최종 답변 생성 턴엔 불필요.
            if i == 0:
                kwargs["tools"] = [SEARCH_SNACKS_TOOL, GROUP_PURCHASE_TOOL]
            completion = client.chat.completions.create(**kwargs)
            ai_message = completion.choices[0].message

            # 도구를 호출하지 않았다 = 최종 답변이 완성됨
            if not ai_message.tool_calls:
                reply = ai_message.content or ""
                _cache_set(cache_key, reply)
                return ChatResponse(reply=reply)

            # 도구를 호출했다 = AI의 '도구 호출' 메시지를 기록에 추가
            messages.append(ai_message)

            # 호출된 각 도구를 이름 기준으로 디스패치하고 결과를 기록에 추가
            for tool_call in ai_message.tool_calls:
                fn_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments or "{}")
                if fn_name == "recommend_group_purchase":
                    result = run_group_purchase(args)
                else:
                    result = run_search_snacks(args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
    except Exception as e:
        # 원본 예외 메시지에는 OpenAI 키 일부·조직 ID·내부 경로가 포함될 수 있다.
        # 자세한 내용은 서버 로그에만 남기고, 클라이언트에는 일반 메시지만 돌려준다.
        logger.exception("OpenAI call failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail="챗봇 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.",
        )

    # 4번을 다 쓰도록 답이 안 나온 경우
    return ChatResponse(
        reply="죄송해요, 답변을 정리하지 못했어요. 다시 질문해 주세요."
    )
