from fastapi import APIRouter, HTTPException, Query

from app.services.product_service import (
    get_product_detail,
    get_products,
    get_stats,
)

router = APIRouter()


@router.get("/stats")
def stats():
    return get_stats()


@router.get("/products")
def products(
    conditions: str = Query(default=""),
    tastes: str = Query(default=""),
    budget: int = Query(default=20000),
    query: str = Query(default=""),
    sort: str = Query(default="score_desc"),
    page: int = Query(default=1),
    per_page: int = Query(default=20),
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


@router.get("/products/{product_id}")
def product_detail(product_id: str):
    product = get_product_detail(product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "product_not_found",
                "message": "해당 제품을 찾을 수 없습니다."
            }
        )
    return product