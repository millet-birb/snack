"""
routers/group.py
단체 구매 API 엔드포인트
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from app.services.group_service import (
    recommend_mode_a,
    recommend_mode_b,
    recommend_mode_c,
    calculate_cart,
)

router = APIRouter(prefix="/api/group", tags=["group"])


# 모든 상한선은 DoS 방지 목적.
# 어린이집/학교 단위 단체 구매를 가정한 현실적인 상한이다.
MAX_PEOPLE = 1000
MAX_DISEASE_GROUPS = 50
MAX_BUDGET = 100_000_000          # 1억 원
MAX_PER_PERSON = 100
MAX_LIST = 100
MAX_QUANTITY = 10_000
MAX_STR = 200


class GroupInfo(BaseModel):
    totalPeople: int = Field(..., ge=1, le=MAX_PEOPLE)
    diseaseGroups: dict[str, int] = Field(default_factory=dict, max_length=MAX_DISEASE_GROUPS)

    @field_validator("diseaseGroups")
    @classmethod
    def _check_disease_group_values(cls, v: dict[str, int]) -> dict[str, int]:
        # dict 내부 각 값에도 상한이 필요하다 (pandas 연산이 곱셈으로 폭증).
        for key, count in v.items():
            if len(key) > MAX_STR:
                raise ValueError("diseaseGroups key too long")
            if count < 0 or count > MAX_PEOPLE:
                raise ValueError("diseaseGroups count out of range")
        return v


class ModeARequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    budget: int = Field(..., ge=0, le=MAX_BUDGET)
    allergyConditions: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    excludeTastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)


class ModeBRequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    budget: int = Field(..., ge=0, le=MAX_BUDGET)
    allergyConditions: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    excludeTastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)


class ModeCRequest(BaseModel):
    groupInfo: GroupInfo
    tastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    budget: int = Field(..., ge=0, le=MAX_BUDGET)
    perPerson: int = Field(default=1, ge=1, le=MAX_PER_PERSON)
    pinnedIds: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    pinnedGroups: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    pinnedGroupCounts: dict[str, int] = Field(default_factory=dict, max_length=MAX_DISEASE_GROUPS)
    allergyConditions: list[str] = Field(default_factory=list, max_length=MAX_LIST)
    sameSnack: bool = True
    excludeTastes: list[str] = Field(default_factory=list, max_length=MAX_LIST)


class CartItem(BaseModel):
    productId: str = Field(..., min_length=1, max_length=MAX_STR)
    quantity: int = Field(..., ge=0, le=MAX_QUANTITY)
    groupLabel: str = Field(default="", max_length=MAX_STR)


class CartRequest(BaseModel):
    groupInfo: GroupInfo
    cartItems: list[CartItem] = Field(..., max_length=500)
    budget: int = Field(..., ge=0, le=MAX_BUDGET)


@router.post("/mode-a")
def group_mode_a(req: ModeARequest):
    return recommend_mode_a(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
        allergy_conditions=req.allergyConditions,
        exclude_tastes=req.excludeTastes,
    )


@router.post("/mode-b")
def group_mode_b(req: ModeBRequest):
    return recommend_mode_b(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
        allergy_conditions=req.allergyConditions,
        exclude_tastes=req.excludeTastes,
    )


@router.post("/mode-c")
def group_mode_c(req: ModeCRequest):
    return recommend_mode_c(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
        per_person=req.perPerson,
        pinned_ids=req.pinnedIds,
        pinned_groups=req.pinnedGroups,
        pinned_group_counts=req.pinnedGroupCounts,
        allergy_conditions=req.allergyConditions,
        same_snack=req.sameSnack,
        exclude_tastes=req.excludeTastes,
    )


@router.post("/cart")
def group_cart(req: CartRequest):
    return calculate_cart(
        cart_items=[item.model_dump() for item in req.cartItems],
        budget=req.budget,
        group_info=req.groupInfo.model_dump(),
    )
