"""
group_service.py
단체 구매 추천 서비스 — A/B/C 세 가지 구매 방식 지원
"""

from __future__ import annotations

import pandas as pd

from app.services.filter_engine import (
    evaluate_product,
    filter_safe_products,
    compute_nutrition_score,
    tag_taste,
    CONDITION_RULE_MAP,
)
from app.services.product_repository import get_base_df
from app.services.product_serializer import serialize_product

# ─────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────

ALL_CONDITIONS = list(CONDITION_RULE_MAP.keys())

# ─────────────────────────────────────────────
# 공통 유틸
# ─────────────────────────────────────────────

def _base_df_with_score() -> pd.DataFrame:
    df = get_base_df().copy()
    df = compute_nutrition_score(df)
    df["taste_tags"] = df.apply(
        lambda r: tag_taste(str(r.get("원재료명", "")), str(r.get("품목명", ""))),
        axis=1,
    )
    return df


def _filter_by_conditions(df: pd.DataFrame, conditions: list[str]) -> pd.DataFrame:
    """주어진 질환 조건을 모두 통과한 제품만 반환"""
    if not conditions:
        return df.copy()
    return filter_safe_products(df, conditions)


def _filter_by_tastes(df: pd.DataFrame, tastes: list[str]) -> pd.DataFrame:
    """맛 조건 필터링"""
    if not tastes:
        return df
    return df[df["taste_tags"].apply(lambda tags: any(t in tags for t in tastes))].copy()


def _serialize_cart_item(row, quantity: int, group_label: str) -> dict:
    """장바구니 아이템 직렬화"""
    base = serialize_product(row)
    base["quantity"] = quantity
    base["subtotal"] = round(float(row.get("price_per_unit", 0)) * quantity, 0)
    base["groupLabel"] = group_label  # "전원" | "아토피 3명" | "질환없음 16명" 등
    return base


def _evaluate_warnings(row, conditions: list[str]) -> dict:
    """과자 한 개에 대해 질환별 경고 반환"""
    eval_result = evaluate_product(row, conditions)
    return {
        "warnFor": eval_result.get("warn_for", []),
        "warnIngredients": eval_result.get("warn_ingredients", {}),
    }


# ─────────────────────────────────────────────
# A. 전원 함께 먹기
# ─────────────────────────────────────────────

def recommend_mode_a(
    group_info: dict,
    tastes: list[str],
    budget: int,
) -> dict:
    """
    모든 질환 조건을 동시에 통과한 과자 리스트를 반환.
    사용자가 직접 선택 → 장바구니는 프론트에서 관리.
    """
    total_people = group_info["totalPeople"]
    conditions = _get_all_conditions(group_info)

    df = _base_df_with_score()

    # 전체 질환 필터
    filtered = _filter_by_conditions(df, conditions)
    filtered = _filter_by_tastes(filtered, tastes)
    filtered = filtered.sort_values("nutrition_score", ascending=False)

    relaxed = False
    if filtered.empty and tastes:
        # 맛 조건 완화
        filtered = _filter_by_conditions(df, conditions)
        filtered = filtered.sort_values("nutrition_score", ascending=False)
        relaxed = True

    products = [serialize_product(row) for _, row in filtered.head(50).iterrows()]

    return {
        "mode": "A",
        "totalPeople": total_people,
        "budget": budget,
        "conditions": conditions,
        "relaxed": relaxed,  # 맛 조건 완화 여부
        "products": products,
        "totalCount": len(products),
    }


# ─────────────────────────────────────────────
# B. 질환별 따로 구매
# ─────────────────────────────────────────────

def recommend_mode_b(
    group_info: dict,
    tastes: list[str],
    budget: int,
) -> dict:
    """
    그룹별로 분리하여 각 그룹에 맞는 과자 리스트 반환.
    사용자가 각 그룹에서 직접 선택.
    """
    total_people = group_info["totalPeople"]
    disease_groups = group_info.get("diseaseGroups", {})  # {"아토피": 3, "소아당뇨": 1, ...}
    normal_count = _calc_normal_count(group_info)

    df = _base_df_with_score()
    groups = []

    # 질환 그룹
    for condition, count in disease_groups.items():
        if count <= 0:
            continue

        filtered = _filter_by_conditions(df, [condition])
        filtered = _filter_by_tastes(filtered, tastes)
        filtered = filtered.sort_values("nutrition_score", ascending=False)

        relaxed = False
        if filtered.empty and tastes:
            filtered = _filter_by_conditions(df, [condition])
            filtered = filtered.sort_values("nutrition_score", ascending=False)
            relaxed = True

        no_result = filtered.empty

        groups.append({
            "groupId": condition,
            "label": f"{condition} {count}명",
            "condition": condition,
            "count": count,
            "relaxed": relaxed,
            "noResult": no_result,
            "products": [serialize_product(row) for _, row in filtered.head(30).iterrows()],
        })

    # 질환 없음 그룹
    if normal_count > 0:
        filtered = _filter_by_tastes(df, tastes)
        filtered = filtered.sort_values("nutrition_score", ascending=False)

        groups.append({
            "groupId": "질환없음",
            "label": f"질환없음 {normal_count}명",
            "condition": None,
            "count": normal_count,
            "relaxed": False,
            "noResult": filtered.empty,
            "products": [serialize_product(row) for _, row in filtered.head(30).iterrows()],
        })

    return {
        "mode": "B",
        "totalPeople": total_people,
        "budget": budget,
        "groups": groups,
    }


# ─────────────────────────────────────────────
# C. 자동 추천
# ─────────────────────────────────────────────

def recommend_mode_c(
    group_info: dict,
    tastes: list[str],
    budget: int,
    per_person: int,
    pinned_ids: list[str],
    same_snack: bool = True,
) -> dict:
    """
    자동으로 예산에 맞게 장바구니를 구성.
    same_snack=True: 전원 같은 과자
    same_snack=False: 질환별 다른 과자
    pinned_ids: 고정 핀 과자 (다시 추천해도 유지)
    """
    import random

    total_people = group_info["totalPeople"]
    disease_groups = group_info.get("diseaseGroups", {})
    normal_count = _calc_normal_count(group_info)
    all_conditions = _get_all_conditions(group_info)

    df = _base_df_with_score()
    cart = []
    remaining_budget = budget
    warnings = []

    # ── STEP 1. 고정 핀 과자 먼저 담기 (다시 추천해도 유지) ──
    if pinned_ids:
        pinned_df = df[df["stable_id"].isin(pinned_ids)]
        for _, row in pinned_df.iterrows():
            quantity = total_people * per_person
            price = float(row.get("price_per_unit", 0))
            subtotal = price * quantity

            pin_warnings = _evaluate_warnings(row, all_conditions)
            if pin_warnings["warnFor"]:
                warnings.append({
                    "productName": str(row.get("품목명", "")),
                    "type": "pin_danger",
                    "warnFor": pin_warnings["warnFor"],
                    "warnIngredients": pin_warnings["warnIngredients"],
                })

            cart.append(_serialize_cart_item(row, quantity, "고정 핀 (전원)"))
            remaining_budget -= subtotal

    pinned_product_ids = [item["id"] for item in cart if "id" in item]

    if same_snack:
        # ── 같은 걸 먹을래요: 전원 통과 과자 랜덤 1종 ──
        filtered = _filter_by_conditions(df, all_conditions)
        filtered = _filter_by_tastes(filtered, tastes)
        filtered = filtered[~filtered["stable_id"].isin(pinned_product_ids)]

        if filtered.empty and tastes:
            filtered = _filter_by_conditions(df, all_conditions)
            filtered = filtered[~filtered["stable_id"].isin(pinned_product_ids)]

        if not filtered.empty:
            # 상위 20개 중 랜덤 선택
            top = filtered.sort_values("nutrition_score", ascending=False).head(20)
            chosen_row = top.sample(1).iloc[0]
            quantity = total_people * per_person
            price = float(chosen_row.get("price_per_unit", 0))
            subtotal = price * quantity

            if remaining_budget >= subtotal:
                cart.append(_serialize_cart_item(chosen_row, quantity, f"전원 {total_people}명"))
                remaining_budget -= subtotal
            else:
                warnings.append({
                    "type": "budget_shortage",
                    "message": "예산이 부족해요. 예산을 늘리거나 1인당 과자 수를 줄여보세요.",
                })
        else:
            warnings.append({
                "type": "no_result",
                "message": "전원이 먹을 수 있는 과자가 없어요.",
            })

    else:
        # ── 다른 걸 먹을래요: 질환별로 다른 과자 랜덤 선택 ──

        # 질환 아이 먼저
        for condition, count in disease_groups.items():
            if count <= 0:
                continue

            filtered = _filter_by_conditions(df, [condition])
            filtered = filtered[~filtered["stable_id"].isin(pinned_product_ids)]
            filtered = _filter_by_tastes(filtered, tastes)

            if filtered.empty:
                warnings.append({
                    "type": "no_result",
                    "condition": condition,
                    "message": f"{condition} 조건에 맞는 과자가 없어요.",
                })
                continue

            # 상위 20개 중 랜덤
            top = filtered.sort_values("nutrition_score", ascending=False).head(20)
            chosen_row = top.sample(1).iloc[0]
            quantity = count * per_person
            price = float(chosen_row.get("price_per_unit", 0))
            subtotal = price * quantity

            if remaining_budget < subtotal:
                warnings.append({
                    "type": "budget_shortage",
                    "condition": condition,
                    "message": f"예산이 부족해요. {condition} 아이 과자를 담지 못했어요.",
                })
                continue

            used_id = chosen_row.get("stable_id")
            if used_id:
                pinned_product_ids.append(str(used_id))

            cart.append(_serialize_cart_item(chosen_row, quantity, f"{condition} {count}명"))
            remaining_budget -= subtotal

        # 일반 아이
        if normal_count > 0 and remaining_budget > 0:
            filtered = df[~df["stable_id"].isin(pinned_product_ids)]
            filtered = _filter_by_tastes(filtered, tastes)

            if not filtered.empty:
                top = filtered.sort_values("nutrition_score", ascending=False).head(20)
                chosen_row = top.sample(1).iloc[0]
                quantity = normal_count * per_person
                price = float(chosen_row.get("price_per_unit", 0))
                subtotal = price * quantity

                if remaining_budget >= subtotal:
                    cart.append(_serialize_cart_item(chosen_row, quantity, f"질환없음 {normal_count}명"))
                    remaining_budget -= subtotal
                else:
                    warnings.append({
                        "type": "budget_shortage",
                        "message": "남은 예산이 부족해 일반 아이 과자를 담지 못했어요.",
                    })

    total_price = budget - remaining_budget

    return {
        "mode": "C",
        "totalPeople": total_people,
        "budget": budget,
        "cart": cart,
        "totalPrice": round(total_price, 0),
        "remainingBudget": round(remaining_budget, 0),
        "budgetExceeded": total_price > budget,
        "warnings": warnings,
    }


# ─────────────────────────────────────────────
# 장바구니 견적 계산 (A/B 공통)
# ─────────────────────────────────────────────

def calculate_cart(
    cart_items: list[dict],
    budget: int,
    group_info: dict,
) -> dict:
    """
    프론트에서 사용자가 선택한 장바구니 아이템들을 받아
    총 금액 / 잔여 예산 / 경고 계산 후 반환.

    cart_items: [{"productId": "...", "quantity": 20, "groupLabel": "전원"}, ...]
    """
    all_conditions = _get_all_conditions(group_info)
    df = get_base_df().copy()

    cart = []
    total_price = 0.0
    warnings = []

    for item in cart_items:
        product_id = item.get("productId")
        quantity = item.get("quantity", 1)
        group_label = item.get("groupLabel", "")

        matched = df[df["stable_id"] == str(product_id)]
        if matched.empty:
            continue

        row = matched.iloc[0]
        price = float(row.get("price_per_unit", 0))
        subtotal = price * quantity
        total_price += subtotal

        # 질환 경고 확인
        pin_warnings = _evaluate_warnings(row, all_conditions)
        if pin_warnings["warnFor"]:
            warnings.append({
                "productName": str(row.get("품목명", "")),
                "warnFor": pin_warnings["warnFor"],
                "warnIngredients": pin_warnings["warnIngredients"],
            })

        cart_item = _serialize_cart_item(row, quantity, group_label)
        cart.append(cart_item)

    remaining = budget - total_price

    return {
        "cart": cart,
        "totalPrice": round(total_price, 0),
        "remainingBudget": round(remaining, 0),
        "budgetExceeded": total_price > budget,
        "warnings": warnings,
    }


# ─────────────────────────────────────────────
# 내부 유틸
# ─────────────────────────────────────────────

def _get_all_conditions(group_info: dict) -> list[str]:
    """group_info에서 사용된 질환 목록 추출"""
    return [c for c, count in group_info.get("diseaseGroups", {}).items() if count > 0]


def _calc_normal_count(group_info: dict) -> int:
    """질환 없는 인원 계산"""
    total = group_info.get("totalPeople", 0)
    disease_total = sum(group_info.get("diseaseGroups", {}).values())
    return max(0, total - disease_total)
