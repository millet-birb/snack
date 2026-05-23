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


class GroupInfo(BaseModel):
    totalPeople: int = Field(..., ge=1)
    diseaseGroups: dict[str, int] = Field(default_factory=dict)


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
    perPerson: int = Field(default=1, ge=1)
    pinnedIds: list[str] = Field(default_factory=list)
    sameSnack: bool = True  # 같은 걸 먹을래요(True) / 다른 걸 먹을래요(False)


class CartItem(BaseModel):
    productId: str
    quantity: int
    groupLabel: str = ""


class CartRequest(BaseModel):
    groupInfo: GroupInfo
    cartItems: list[CartItem]
    budget: int


@router.post("/mode-a")
def group_mode_a(req: ModeARequest):
    return recommend_mode_a(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
    )


@router.post("/mode-b")
def group_mode_b(req: ModeBRequest):
    return recommend_mode_b(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
    )


@router.post("/mode-c")
def group_mode_c(req: ModeCRequest):
    return recommend_mode_c(
        group_info=req.groupInfo.model_dump(),
        tastes=req.tastes,
        budget=req.budget,
        per_person=req.perPerson,
        pinned_ids=req.pinnedIds,
        same_snack=req.sameSnack,
    )


@router.post("/cart")
def group_cart(req: CartRequest):
    return calculate_cart(
        cart_items=[item.model_dump() for item in req.cartItems],
        budget=req.budget,
        group_info=req.groupInfo.model_dump(),
    )
