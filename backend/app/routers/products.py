from fastapi import APIRouter, HTTPException, Query

from app.services.product_service import (
    get_product_detail,
    get_products,
    get_stats,
)
from app.services.similarity_service import find_similar

# 모든 상한선은 DoS 방지 목적.
# 클라이언트가 per_page=99999999 같은 값으로 메모리/CPU 폭주를 일으키지 못하게 한다.
MAX_PAGE = 10_000
MAX_PER_PAGE = 100
MAX_BUDGET = 100_000_000          # 1억 원
MAX_QUERY_LEN = 200
MAX_FILTER_LEN = 500              # conditions/tastes 콤마 구분 문자열 전체 길이
MAX_SIMILAR_TOP_K = 20

router = APIRouter()


@router.get("/stats")
def stats():
    return get_stats()


@router.get("/products")
def products(
    conditions: str = Query(default="", max_length=MAX_FILTER_LEN),
    tastes: str = Query(default="", max_length=MAX_FILTER_LEN),
    budget: int = Query(default=20000, ge=0, le=MAX_BUDGET),
    query: str = Query(default="", max_length=MAX_QUERY_LEN),
    sort: str = Query(default="score_desc", max_length=50),
    page: int = Query(default=1, ge=1, le=MAX_PAGE),
    per_page: int = Query(default=20, ge=1, le=MAX_PER_PAGE),
):
    condition_list = [c.strip() for c in conditions.split(",") if c.strip()]
    taste_list = [t.strip() for t in tastes.split(",") if t.strip()]

    return get_products(
        conditions=condition_list,
        tastes=taste_list,
        budget=budget,
        query=query,
        sort=sort,
        page=page,
        per_page=per_page,
    )


@router.get("/products/{product_id}/similar")
def product_similar(
    product_id: str,
    conditions: str = Query(default="", max_length=MAX_FILTER_LEN),
    top_k: int = Query(default=5, ge=1, le=MAX_SIMILAR_TOP_K),
):
    if len(product_id) > 200:
        raise HTTPException(status_code=400, detail="invalid product id")

    condition_list = [c.strip() for c in conditions.split(",") if c.strip()]
    return {
        "products": find_similar(
            product_id,
            conditions=condition_list,
            top_k=top_k,
        )
    }


@router.get("/products/{product_id}")
def product_detail(product_id: str, tastes: str = ""):
    # 경로 파라미터에도 길이 제한 — 비정상적으로 긴 ID 가 흘러들지 못하게.
    if len(product_id) > 200:
        raise HTTPException(status_code=400, detail="invalid product id")

    selected_tastes = [t.strip() for t in tastes.split(",") if t.strip()] or None

    product = get_product_detail(product_id, selected_tastes=selected_tastes)
    if not product:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "product_not_found",
                "message": "해당 제품을 찾을 수 없습니다."
            }
        )
    return product