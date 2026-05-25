"""
임베딩 매트릭스 로더.

build_embeddings.py가 생성한 두 개의 .npy 파일을 프로세스 시작 시 1회 로드해 캐시한다.
파일이 없으면 None을 반환 — 호출부는 '유사 추천 미제공'으로 graceful degrade.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
EMB_PATH = DATA_DIR / "snack_embeddings.npy"
IDS_PATH = DATA_DIR / "snack_embeddings_ids.npy"


@lru_cache(maxsize=1)
def get_embeddings() -> tuple[np.ndarray, dict[str, int]] | None:
    if not EMB_PATH.exists() or not IDS_PATH.exists():
        return None

    matrix = np.load(EMB_PATH).astype(np.float32, copy=False)
    ids = np.load(IDS_PATH, allow_pickle=False)

    id_to_index: dict[str, int] = {str(stable_id): i for i, stable_id in enumerate(ids)}
    return matrix, id_to_index
