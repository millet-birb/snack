"""
'비슷한 안전 대안' 추천 서비스.

순서가 중요:
  1) 사용자 조건으로 안전 후보만 남기고 (filter_safe_products)
  2) 그 안에서 코사인 유사도 top-K
역으로 하면 비슷하지만 못 먹는 상품이 추천되어 기획 의도와 어긋난다.

조건 어휘는 product_service.get_products와 동일하게 normalize_conditions를 거친다.
임베딩은 L2 정규화되어 있으므로 dot product == 코사인 유사도.
"""
from __future__ import annotations

from typing import Optional

import numpy as np

from app.services.filter_engine import (
    compute_nutrition_score,
    compute_safe_snack_score,
    filter_safe_products,
)
from app.services.product_filters import normalize_conditions
from app.services.product_repository import get_base_df
from app.services.product_serializer import serialize_product
from app.services.similarity_repository import get_embeddings


def _grade_rank(score: float) -> int:
    """Return a lower rank for a better displayed grade (A=0 .. D=3)."""
    if score >= 85:
        return 0
    if score >= 70:
        return 1
    if score >= 55:
        return 2
    return 3


def _is_better_alternative(query_grade_rank: int, candidate_grade_rank: int) -> bool:
    """Allow same-grade alternatives only when the selected product is already A."""
    if query_grade_rank == 0:
        return candidate_grade_rank == 0
    return candidate_grade_rank < query_grade_rank


def find_similar(
    product_id: str,
    conditions: Optional[list[str]] = None,
    selected_tastes: Optional[list[str]] = None,
    top_k: int = 5,
) -> list[dict]:
    bundle = get_embeddings()
    if bundle is None:
        return []

    matrix, id_to_index = bundle

    query_index = id_to_index.get(str(product_id))
    if query_index is None:
        return []

    df = get_base_df().copy()
    df = compute_nutrition_score(df)
    df = compute_safe_snack_score(df, selected_tastes=selected_tastes)

    query_rows = df[df["stable_id"].astype(str) == str(product_id)]
    if query_rows.empty:
        return []
    query_grade_rank = _grade_rank(float(query_rows.iloc[0]["safe_snack_score"]))

    normalized = normalize_conditions(conditions or [])
    if normalized:
        df = filter_safe_products(df, normalized)

    if df.empty:
        return []

    candidate_emb_indices: list[int] = []
    candidate_df_positions: list[int] = []
    for df_pos, sid in enumerate(df["stable_id"].astype(str).tolist()):
        emb_idx = id_to_index.get(sid)
        if emb_idx is None or emb_idx == query_index:
            continue
        candidate_grade_rank = _grade_rank(float(df.iloc[df_pos]["safe_snack_score"]))
        if not _is_better_alternative(query_grade_rank, candidate_grade_rank):
            continue
        candidate_emb_indices.append(emb_idx)
        candidate_df_positions.append(df_pos)

    if not candidate_emb_indices:
        return []

    candidate_matrix = matrix[candidate_emb_indices]
    scores = candidate_matrix @ matrix[query_index]

    k = min(top_k, len(scores))
    top_partition = np.argpartition(-scores, k - 1)[:k]
    top_sorted = top_partition[np.argsort(-scores[top_partition])]

    results: list[dict] = []
    for local_idx in top_sorted:
        df_pos = candidate_df_positions[int(local_idx)]
        serialized = serialize_product(df.iloc[df_pos])
        serialized["similarityScore"] = round(float(scores[int(local_idx)]), 4)
        results.append(serialized)

    return results
