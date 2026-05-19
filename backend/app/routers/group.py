"""
routers/group.py
단체 구매 API 엔드포인트
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.group_service import (
    recommend_mode_a,
    recommend_mode_b,
    recommend_mode_c,
    calculate_cart,
)

router = APIRouter(prefix="/api/group", tags=["group"])


# ─────────────────────────────────────────────
# Request 모델
# ─────────────────────────────────────────────

class GroupInfo(BaseModel):
    totalPeople: int = Field(..., ge=1, description="총 아동 수")
    diseaseGroups: dict[str, int] = Field(
        default_factory=dict,
        description="질환별 아동 수 예) {'아토피': 3, '소아당뇨': 1}"
    )


class ModeARequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = []
    budget: int = Field(..., ge=0)


class ModeBRequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = []
    budget: int = Field(..., ge=0)


class ModeCRequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = []
    budget: int = Field(..., ge=0)
    perPerson: int = Field(default=1, ge=1, description="1인당 과자 수")
    pinnedIds: list[str] = Field(default_factory=list, description="고정 핀 과자 ID 목록")


class CartItem(BaseModel):
    productId: str
    quantity: int
    groupLabel: str = ""


class CartRequest(BaseModel):
    groupInfo: GroupInfo
    cartItems: list[CartItem]
    budget: int


# ─────────────────────────────────────────────
# 엔드포인트
# ─────────────────────────────────────────────

@router.post("/mode-a")
def group_mode_a(req: ModeARequest):
    """
    A. 전원 함께 먹기
    - 모든 질환 조건을 동시에 통과한 과자 리스트 반환
    - 사용자가 직접 선택
    """
    return recommend_mode_a(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
    )


@router.post("/mode-b")
def group_mode_b(req: ModeBRequest):
    """
    B. 질환별 따로 구매
    - 그룹별로 분리하여 각 그룹에 맞는 과자 리스트 반환
    - 사용자가 각 그룹에서 직접 선택
    """
    return recommend_mode_b(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
    )


@router.post("/mode-c")
def group_mode_c(req: ModeCRequest):
    """
    C. 자동 추천
    - 고정 핀 → 질환 아이 먼저 → 남은 예산으로 일반 아이 순서로 자동 담기
    """
    return recommend_mode_c(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
        per_person=req.perPerson,
        pinned_ids=req.pinnedIds,
    )


@router.post("/cart")
def group_cart(req: CartRequest):
    """
    A/B 모드에서 사용자가 직접 선택한 장바구니 견적 계산
    - 총 금액 / 잔여 예산 / 질환 경고 반환
    """
    return calculate_cart(
        cart_items=[item.model_dump() for item in req.cartItems],
        budget=req.budget,
        group_info=req.groupInfo.model_dump(),
    )
