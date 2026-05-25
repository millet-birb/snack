"""
group_service.py
단체 구매 추천 서비스 — A/B/C 세 가지 구매 방식 지원
"""

from __future__ import annotations

import math

import pandas as pd

from app.services.filter_engine import (
    evaluate_product,
    filter_safe_products,
    compute_nutrition_score,
    tag_taste,
    match_tastes,
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
    """맛 조건 필터링 — 같은 카테고리는 OR, 다른 카테고리는 AND (match_tastes 참조)"""
    if not tastes:
        return df
    return df[df["taste_tags"].apply(lambda tags: match_tastes(tags, tastes))].copy()


def _filter_by_exclude_tastes(df: pd.DataFrame, exclude_tastes: list[str] | None) -> pd.DataFrame:
    """제외할 맛 태그가 하나라도 붙은 제품을 빼고 반환 (예: '달달','카라멜')."""
    if not exclude_tastes:
        return df
    excl = set(exclude_tastes)
    mask = df["taste_tags"].apply(lambda tags: not (set(tags) & excl))
    return df[mask].copy()


def _get_pack_size(row) -> int:
    """갯수(개) 컬럼 → int. 비어있거나 0/음수면 1로 처리."""
    raw = row.get("갯수(개)", 1)
    try:
        if raw is None or (isinstance(raw, float) and pd.isna(raw)):
            return 1
        n = int(float(raw))
        return n if n > 0 else 1
    except (ValueError, TypeError):
        return 1


def _get_full_price(row) -> float:
    """price 컬럼 → float. NaN/None은 0."""
    raw = row.get("price", 0)
    try:
        if raw is None or (isinstance(raw, float) and pd.isna(raw)):
            return 0.0
        return float(raw)
    except (ValueError, TypeError):
        return 0.0


def _calc_boxes_subtotal(row, pieces_needed: int) -> tuple[int, float]:
    """
    필요 낱개 수 → (구매할 박스 수, 합계 금액).
    한 박스에 갯수(개)개 들어있고, 부분 박스는 올림 처리.
    """
    pack_size = _get_pack_size(row)
    boxes = max(1, math.ceil(pieces_needed / pack_size))
    subtotal = boxes * _get_full_price(row)
    return boxes, subtotal


def _serialize_cart_item(row, boxes: int, group_label: str) -> dict:
    """
    장바구니 아이템 직렬화.
    quantity 필드는 '박스 수' (= 상품 단위) — 멀티팩이면 1박스에 갯수(개)개 들어있음.
    """
    base = serialize_product(row)
    base["quantity"] = boxes
    base["subtotal"] = round(boxes * _get_full_price(row), 0)
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
    allergy_conditions: list[str] = None,
    exclude_tastes: list[str] | None = None,
) -> dict:
    """
    모든 질환 조건을 동시에 통과한 과자 리스트를 반환.
    사용자가 직접 선택 → 장바구니는 프론트에서 관리.
    exclude_tastes 에 든 맛 태그(예: '달달','카라멜')는 결과에서 제외하며,
    맛 완화(relaxed) 분기에서도 항상 적용된다.
    """
    total_people = group_info["totalPeople"]
    conditions = _get_all_conditions(group_info)

    # 알레르기 세부 조건 추가 (합집합)
    if allergy_conditions:
        conditions = [c for c in conditions if c != '알레르기']
        conditions += allergy_conditions

    df = _base_df_with_score()

    # 전체 질환 필터
    filtered = _filter_by_conditions(df, conditions)
    filtered = _filter_by_tastes(filtered, tastes)
    filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)
    filtered = filtered.sort_values("nutrition_score", ascending=False)

    relaxed = False
    if filtered.empty and tastes:
        # 맛 조건만 완화 — exclude_tastes는 사용자의 강한 의도이므로 유지
        filtered = _filter_by_conditions(df, conditions)
        filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)
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
    allergy_conditions: list[str] = None,
    exclude_tastes: list[str] | None = None,
) -> dict:
    """
    그룹별로 분리하여 각 그룹에 맞는 과자 리스트 반환.
    사용자가 각 그룹에서 직접 선택.
    """
    total_people = group_info["totalPeople"]
    disease_groups = group_info.get("diseaseGroups", {})
    normal_count = _calc_normal_count(group_info)

    df = _base_df_with_score()
    groups = []

    # 질환 그룹
    for condition, count in disease_groups.items():
        if count <= 0:
            continue

        # 알레르기 그룹이면 세부 조건으로 필터링
        if condition == '알레르기' and allergy_conditions:
            filter_conditions = allergy_conditions
        else:
            filter_conditions = [condition]

        filtered = _filter_by_conditions(df, filter_conditions)
        filtered = _filter_by_tastes(filtered, tastes)
        filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)
        filtered = filtered.sort_values("nutrition_score", ascending=False)

        relaxed = False
        if filtered.empty and tastes:
            filtered = _filter_by_conditions(df, filter_conditions)
            filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)
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
        filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)
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
    pinned_groups: list[str] = None,
    pinned_group_counts: dict = None,
    allergy_conditions: list[str] = None,
    same_snack: bool = True,
    exclude_tastes: list[str] | None = None,
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
            pieces_needed = total_people * per_person
            boxes, subtotal = _calc_boxes_subtotal(row, pieces_needed)

            pin_warnings = _evaluate_warnings(row, all_conditions)
            if pin_warnings["warnFor"]:
                warnings.append({
                    "productName": str(row.get("품목명", "")),
                    "type": "pin_danger",
                    "warnFor": pin_warnings["warnFor"],
                    "warnIngredients": pin_warnings["warnIngredients"],
                })

            cart.append(_serialize_cart_item(row, boxes, "고정 핀 (전원)"))
            remaining_budget -= subtotal

    pinned_product_ids = [item["id"] for item in cart if "id" in item]
    # 핀된 그룹라벨에서 질환명 추출 (예: "알레르기 2명" → "알레르기")
    skipped_conditions = set()
    for label in (pinned_groups or []):
        for cond in disease_groups.keys():
            if label.startswith(cond):
                skipped_conditions.add(cond)
    # 질환없음도 체크
    if any(label.startswith("질환없음") for label in (pinned_groups or [])):
        skipped_conditions.add("질환없음")

    if same_snack:
        # ── 같은 걸 먹을래요: 질환별 그룹 내에서 같은 과자 1종 ──
        for condition, count in disease_groups.items():
            if count <= 0:
                continue
            if condition in skipped_conditions:
                continue

            # 알레르기 그룹이면 세부 조건으로 필터링
            if condition == '알레르기' and allergy_conditions:
                filter_conds = allergy_conditions
            else:
                filter_conds = [condition]

            filtered = _filter_by_conditions(df, filter_conds)
            filtered = filtered[~filtered["stable_id"].isin(pinned_product_ids)]
            filtered = _filter_by_tastes(filtered, tastes)
            filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)

            if filtered.empty:
                warnings.append({
                    "type": "no_result",
                    "condition": condition,
                    "message": f"{condition} 조건에 맞는 과자가 없어요.",
                })
                continue

            top = filtered.sort_values("nutrition_score", ascending=False).head(20)
            chosen_row = top.sample(1).iloc[0]
            pieces_needed = count * per_person
            boxes, subtotal = _calc_boxes_subtotal(chosen_row, pieces_needed)

            if remaining_budget < subtotal:
                warnings.append({
                    "type": "budget_shortage",
                    "condition": condition,
                    "message": f"예산이 부족해요. {condition} 아이 과자를 담지 못했어요.",
                })
                continue

            cart.append(_serialize_cart_item(chosen_row, boxes, f"{condition} {count}명"))
            remaining_budget -= subtotal

        # 일반 아이 (같은걸먹을래요)
        if normal_count > 0 and remaining_budget > 0 and "질환없음" not in skipped_conditions:
            # same_snack은 그룹별 과자가 달라야 할 이유 없으므로 pinned 제외 안 함
            filtered = df.copy()
            filtered = _filter_by_tastes(filtered, tastes)
            filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)

            if not filtered.empty:
                top = filtered.sort_values("nutrition_score", ascending=False).head(20)
                chosen_row = top.sample(1).iloc[0]
                pieces_needed = normal_count * per_person
                boxes, subtotal = _calc_boxes_subtotal(chosen_row, pieces_needed)

                if remaining_budget >= subtotal:
                    cart.append(_serialize_cart_item(chosen_row, boxes, f"질환없음 {normal_count}명"))
                    remaining_budget -= subtotal
                else:
                    warnings.append({
                        "type": "budget_shortage",
                        "message": "남은 예산이 부족해 일반 아이 과자를 담지 못했어요.",
                    })

    else:
        # ── 다른 걸 먹을래요: 같은 질환 내에서도 인원수만큼 각각 다른 과자 ──

        # 질환별 핀된 개수 (그룹라벨에서 질환명 추출해서 계산)
        pinned_group_counts_map = {}
        for label, cnt in (pinned_group_counts or {}).items():
            for cond in disease_groups.keys():
                if label.startswith(cond):
                    pinned_group_counts_map[cond] = pinned_group_counts_map.get(cond, 0) + cnt

        # 질환 아이 먼저
        for condition, count in disease_groups.items():
            if count <= 0:
                continue

            # 이미 핀된 개수 제외하고 남은 인원만 담기
            already_pinned = pinned_group_counts_map.get(condition, 0)
            remaining_count = count - already_pinned
            if remaining_count <= 0:
                continue

            filtered = _filter_by_conditions(df,
                allergy_conditions if condition == '알레르기' and allergy_conditions else [condition])
            filtered = filtered[~filtered["stable_id"].isin(pinned_product_ids)]
            filtered = _filter_by_tastes(filtered, tastes)
            filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)

            if filtered.empty:
                warnings.append({
                    "type": "no_result",
                    "condition": condition,
                    "message": f"{condition} 조건에 맞는 과자가 없어요.",
                })
                continue

            top = filtered.sort_values("nutrition_score", ascending=False).head(40)
            available = list(top.iterrows())

            import random
            random.shuffle(available)

            # 과자 수보다 인원이 많으면 중복 허용
            if len(available) < remaining_count:
                warnings.append({
                    "type": "duplicate_snack",
                    "condition": condition,
                    "message": f"{condition} 조건을 통과한 과자가 {len(available)}종뿐이에요. 일부 아이에게 같은 과자가 배정될 수 있어요.",
                })
                # 중복 허용: 인원수만큼 순환하며 담기
                for i in range(remaining_count):
                    chosen_row = available[i % len(available)][1]
                    pieces_needed = per_person
                    boxes, subtotal = _calc_boxes_subtotal(chosen_row, pieces_needed)

                    if remaining_budget < subtotal:
                        break

                    cart.append(_serialize_cart_item(chosen_row, boxes, f"{condition} {count}명"))
                    remaining_budget -= subtotal
            else:
                for i in range(remaining_count):
                    _, chosen_row = available[i]
                    pieces_needed = per_person
                    boxes, subtotal = _calc_boxes_subtotal(chosen_row, pieces_needed)

                    if remaining_budget < subtotal:
                        warnings.append({
                            "type": "budget_shortage",
                            "condition": condition,
                            "message": f"예산이 부족해요. {condition} 아이 일부 과자를 담지 못했어요.",
                        })
                        break

                    used_id = str(chosen_row.get("stable_id", ""))
                    if used_id:
                        pinned_product_ids.append(used_id)

                    cart.append(_serialize_cart_item(chosen_row, boxes, f"{condition} {count}명"))
                    remaining_budget -= subtotal

        # 일반 아이 (다른걸먹을래요) - 인원수만큼 각각 다른 과자
        # 이미 핀된 질환없음 개수 계산
        already_pinned_normal = sum(
            cnt for label, cnt in (pinned_group_counts or {}).items()
            if label.startswith("질환없음")
        )
        remaining_normal = normal_count - already_pinned_normal

        if normal_count > 0 and remaining_budget > 0 and remaining_normal > 0:
            filtered = df[~df["stable_id"].isin(pinned_product_ids)]
            filtered = _filter_by_tastes(filtered, tastes)
            filtered = _filter_by_exclude_tastes(filtered, exclude_tastes)

            if not filtered.empty:
                top = filtered.sort_values("nutrition_score", ascending=False).head(40)
                available = list(top.iterrows())

                import random
                random.shuffle(available)

                if len(available) < remaining_normal:
                    warnings.append({
                        "type": "duplicate_snack",
                        "condition": "질환없음",
                        "message": f"질환없음 조건을 통과한 과자가 {len(available)}종뿐이에요. 일부 아이에게 같은 과자가 배정될 수 있어요.",
                    })

                for i in range(remaining_normal):
                    chosen_row = available[i % len(available)][1] if i >= len(available) else available[i][1]
                    pieces_needed = per_person
                    boxes, subtotal = _calc_boxes_subtotal(chosen_row, pieces_needed)

                    if remaining_budget < subtotal:
                        warnings.append({
                            "type": "budget_shortage",
                            "message": "남은 예산이 부족해 일반 아이 과자를 담지 못했어요.",
                        })
                        break

                    used_id = str(chosen_row.get("stable_id", ""))
                    if used_id and i < len(available):
                        pinned_product_ids.append(used_id)

                    cart.append(_serialize_cart_item(chosen_row, boxes, f"질환없음 {normal_count}명"))
                    remaining_budget -= subtotal

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
        boxes = int(item.get("quantity", 1) or 1)  # 프론트가 보내는 quantity는 박스 수
        group_label = item.get("groupLabel", "")

        matched = df[df["stable_id"] == str(product_id)]
        if matched.empty:
            continue

        row = matched.iloc[0]
        subtotal = boxes * _get_full_price(row)
        total_price += subtotal

        # 질환 경고 확인
        pin_warnings = _evaluate_warnings(row, all_conditions)
        if pin_warnings["warnFor"]:
            warnings.append({
                "productName": str(row.get("품목명", "")),
                "warnFor": pin_warnings["warnFor"],
                "warnIngredients": pin_warnings["warnIngredients"],
            })

        cart_item = _serialize_cart_item(row, boxes, group_label)
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
