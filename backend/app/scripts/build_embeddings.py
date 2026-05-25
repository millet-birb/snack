"""
원재료 텍스트 임베딩 사전 계산 스크립트 — 로컬에서만 실행한다.

생성물:
  - backend/app/data/snack_embeddings.npy       (N, D) float32, L2 정규화됨
  - backend/app/data/snack_embeddings_ids.npy   (N,)   같은 순서의 stable_id

런타임 API 서버는 sentence-transformers를 import하지 않는다
(numpy dot product만으로 코사인 유사도 계산 → Render 메모리 안전).

사용:
    cd backend
    pip install -r requirements-build.txt
    python -m app.scripts.build_embeddings
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from app.services.product_repository import get_base_df


MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BATCH_SIZE = 64

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
EMB_PATH = DATA_DIR / "snack_embeddings.npy"
IDS_PATH = DATA_DIR / "snack_embeddings_ids.npy"


def _build_text(name: str, ingredients: str) -> str:
    name = (name or "").strip()
    ingredients = (ingredients or "").strip()
    if not ingredients:
        return name
    return f"{name} || {ingredients}"


def main() -> None:
    from sentence_transformers import SentenceTransformer  # 빌드 시에만 import

    print("[1/4] 상품 데이터 로드 중...")
    df = get_base_df()
    print(f"      -> {len(df)}개 상품")

    print("[2/4] 임베딩 입력 텍스트 구성 중...")
    texts = [
        _build_text(str(row.get("품목명", "")), str(row.get("원재료명", "")))
        for _, row in df.iterrows()
    ]
    ids = df["stable_id"].astype(str).to_numpy(dtype=np.str_)

    print(f"[3/4] 모델 로드 및 임베딩 계산 중 ({MODEL_NAME})...")
    model = SentenceTransformer(MODEL_NAME)
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)

    print("[4/4] 저장 중...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    np.save(EMB_PATH, embeddings)
    np.save(IDS_PATH, ids)
    print(f"      -> {EMB_PATH}  shape={embeddings.shape}")
    print(f"      -> {IDS_PATH}  shape={ids.shape}")
    print("완료.")


if __name__ == "__main__":
    main()
