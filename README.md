# SafeSnack (스낵 세이프)

어린이의 질환·알레르기·체질을 고려해 **안전하고 영양가 있는 과자**를 추천해주는 모노레포 프로젝트입니다.
식품안전나라 OpenAPI에서 수집한 원재료 데이터를 기반으로, 8가지 건강 조건에 대한 위험 키워드 매칭과 영양 점수를 계산하여 개인·단체에 맞는 간식을 제안합니다.

---

## 주요 기능

- **단일 추천**: 아이의 질환/알레르기 조건과 맛 취향, 예산을 입력하면 안전한 간식 목록과 영양 점수를 제공합니다.
- **단체 구매(Group Purchase)**: 어린이집·학원 등 여러 아이가 섞인 그룹을 위해 3가지 모드를 제공합니다.
  - **Mode A** — 모두가 함께 먹을 수 있는 공통 추천
  - **Mode B** — 질환 그룹별 분리 추천
  - **Mode C** — 예산에 맞춰 장바구니 자동 구성 (재추첨/고정 지원)
- **AI 챗봇**: OpenAI `gpt-4o-mini` 기반 도구 호출(tool-use)로 자연어 질문에 맞는 간식을 검색합니다.
- **데이터 수집기**: 식품안전나라 OpenAPI(`C002`)에서 과자류 원재료 데이터를 멀티스레드로 배치 수집합니다.

---

## 저장소 구조

```
.
├─ src/collector/          # Python 수집기 (식품안전나라 OpenAPI)
├─ backend/                # FastAPI 서버 (추천 엔진 + 챗봇 API)
│  └─ app/
│     ├─ data/             # CSV + SQLite (snack_products.sqlite3)
│     ├─ routers/          # products / group / chat
│     ├─ services/         # product_service / group_service
│     └─ scripts/          # build_product_db
├─ front/                  # Next.js 16 + React 19 + Tailwind v4
│  ├─ app/                 # 단일 페이지 (Zustand로 뷰 전환)
│  ├─ components/screens/  # Home / Results / Detail / GroupPurchase
│  └─ lib/                 # filter-store, constants, mock-data
├─ data/                   # 수집기가 만든 raw JSON (gitignored)
├─ main.py
└─ pyproject.toml          # 수집기용 uv 프로젝트
```

세 개의 하위 프로젝트는 **각자 별도의 툴체인**을 사용합니다.

| 영역      | 런타임         | 패키지 매니저               |
| --------- | -------------- | --------------------------- |
| collector | Python ≥3.12   | `uv`                        |
| backend   | Python         | `pip` (`requirements.txt`)  |
| front     | Node.js        | `pnpm`                      |

---

## 빠른 시작

### 사전 준비
- Python ≥3.12, [uv](https://github.com/astral-sh/uv)
- Node.js 20+, [pnpm](https://pnpm.io/)
- 식품안전나라 API 키 (수집기 실행 시), OpenAI API 키 (챗봇 실행 시)

### 1) 백엔드

```powershell
cd backend
pip install -r requirements.txt
# backend/.env 에 OPENAI_API_KEY=sk-... 추가
uvicorn app.main:app --reload      # http://127.0.0.1:8000
```

> 모듈 경로는 `app.main`입니다. `backend.app.main`이 아닙니다.

### 2) 프론트엔드

```powershell
cd front
pnpm install
# front/.env.local 에 NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 추가
pnpm dev                           # http://localhost:3000
```

### 3) (선택) 수집기 실행

루트 `.env`에 `food_api_key=...`를 추가한 뒤,

```powershell
uv run python -m src.collector.food_collector
# 결과: data/과자_raw.json
```

### 4) 상품 DB 재빌드

`backend/app/data/` 아래 CSV를 수정했다면:

```powershell
cd backend
python -m app.scripts.build_product_db
```

> CSV만 수정하고 DB를 다시 만들지 않으면 백엔드에 반영되지 않습니다.
> 또한 `uvicorn`은 `get_base_df()`를 캐시하므로 **재시작이 필요**합니다.

---

## 아키텍처 메모

### 백엔드 요청 파이프라인
모든 상품 조회는 `product_repository.get_base_df()` (LRU 캐시)를 통과합니다.
SQLite DB가 있으면 `SELECT * FROM products`, 없으면 CSV를 읽어 dedup + `taste_tags` 보정을 수행합니다.

`product_service.get_products()`는 다음 순서로 체이닝됩니다:

```
normalize_conditions → filter_safe_products → compute_nutrition_score
  → apply_query_filter → apply_taste_filter → apply_budget_filter
  → apply_sort → paginate → serialize_product
```

`load_data()`가 합성해주는 파생 컬럼(`serving_g`, `<nutrient>_1회`, `price_per_unit`, `stable_id`)에 의존하므로 데이터 로딩을 우회하지 마세요.

### 조건 어휘 매핑
프론트(`소아천식`, `카페인`)와 백엔드(`천식`, `카페인주의`)의 조건 키가 다릅니다.
유일한 번역 지점은 `product_filters.normalize_conditions()`이며, `filter_engine`을 직접 호출하는 코드(예: `group_service.py`)는 이미 백엔드 어휘를 사용한다고 가정합니다.

### 프론트 라우팅은 Zustand 상태 기반
실제 Next.js 라우트는 `/`와 stub API뿐이고, `SnackApp`이 `useFilterStore().currentView`(`'home' | 'results' | 'detail' | 'group'`)에 따라 화면을 전환합니다.
프로덕션 데이터는 `NEXT_PUBLIC_BACKEND_URL`로 FastAPI에 직접 요청합니다. (`front/app/api/*`의 stub은 mock 데이터용입니다.)

### 챗봇 (OpenAI tool-use)
`routers/chat.py`는 `search_snacks` 함수 도구를 등록한 뒤 최대 4턴까지 루프를 돕니다.
입력 토큰 절약을 위해 **첫 턴에만 tools 스키마를 전송**하고, `max_tokens=500`, `MAX_HISTORY=6`, 도구 응답은 5개 필드로 트리밍합니다.
응답은 `_RESPONSE_CACHE`(LRU 128)로 메모이즈됩니다 — 워커별/휘발성이며 history는 키에 포함되지 않습니다.

---

## 환경 변수

| 위치             | 변수                       | 설명                                |
| ---------------- | -------------------------- | ----------------------------------- |
| 루트 `.env`      | `food_api_key`             | 식품안전나라 OpenAPI 키 (수집기)    |
| `backend/.env`   | `OPENAI_API_KEY`           | 챗봇 호출용 (없으면 `/api/chat` 500) |
| `front/.env.local` | `NEXT_PUBLIC_BACKEND_URL` | FastAPI 주소 (기본 `http://127.0.0.1:8000`) |

`NEXT_PUBLIC_*`는 **빌드 타임에 인라인**되므로 값이 바뀌면 재배포가 필요합니다.

---

## 배포

- **프론트엔드 → Vercel**: `NEXT_PUBLIC_BACKEND_URL`을 Render 백엔드 URL로 설정.
- **백엔드 → Render (Web Service)**: Root Directory를 `backend`로, Start Command는 비워두면 `backend/Procfile`(`uvicorn app.main:app --host 0.0.0.0 --port $PORT`)을 자동 인식합니다. `OPENAI_API_KEY`는 대시보드에 등록하세요.
- **SQLite DB**(`backend/app/data/snack_products.sqlite3`)는 커밋되어 있으며 런타임에서는 **읽기 전용**입니다. Render에서는 파일시스템이 휘발성이므로 `build_product_db.py`를 실행하지 마세요.
- **CORS**: 현재 `allow_origins=["*"]`로 열려 있어 배포 전 Vercel 오리진으로 좁혀야 합니다 (`backend/app/main.py`).

---

## 개발 시 주의사항

- 테스트 스위트는 아직 없습니다.
- `front/next.config.mjs`는 `typescript.ignoreBuildErrors: true`라 `pnpm build`는 타입 에러가 있어도 통과합니다. `pnpm lint`만이 실질 체크입니다.
- 필터 스토어는 `Set<Condition>` / `Set<TasteTag>`를 사용하므로 React 의존성 배열에 그대로 넣지 말고 `useMemo`로 배열 변환 후 사용하세요.
- 새 조건을 추가하려면 프론트(`front/lib/constants.ts`)와 백엔드(`filter_engine.CONDITION_MAP`, `CONDITION_RULE_MAP`, `RISK_KEYWORDS`)를 **양쪽 모두** 갱신해야 합니다.
- `backend/requirements.txt`에 의존성을 추가할 때는 다른 항목과 동일하게 메이저 범위로 핀(`pkg>=1.x,<2.0`)을 걸어주세요.

---

## 라이선스

내부 프로젝트 — 라이선스 미정.
