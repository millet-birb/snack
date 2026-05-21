# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Three loosely-coupled subprojects share this repo, each with its own toolchain:

- `src/collector/` — Python batch collector for the 식품안전나라 OpenAPI (service `C002`, snack 원재료 data). Managed by **uv** (top-level `pyproject.toml`, Python ≥3.12, only depends on `python-dotenv`). Reads `food_api_key` from `.env`.
- `backend/app/` — **FastAPI** server (`uvicorn`, `pandas`) that serves preprocessed CSVs to the frontend. Managed by plain `requirements.txt`. **Separate Python environment from the collector.**
- `front/` — **Next.js 16 + React 19 + Tailwind v4 + shadcn/ui** (New York style, base color `neutral`, alias `@/*`). State via **Zustand**. Package manager is **pnpm** (`pnpm-lock.yaml`).

`main.py` and `data/` at the repo root belong to the collector. The frontend's `data/` and `public/product-images/` are unrelated to the backend's `backend/app/data/`.

## Commands

```powershell
# Collector (from repo root) — writes data/<category>_raw.json
uv run python -m src.collector.food_collector

# Backend (from backend/) — FastAPI on :8000
pip install -r requirements.txt
uvicorn app.main:app --reload   # module path is app.main, not backend.app.main

# Frontend (from front/)
pnpm install
pnpm dev      # next dev
pnpm build    # next build
pnpm lint     # eslint .
```

There is no test suite in any of the three subprojects.

## Architecture notes that span multiple files

### Backend request pipeline
All product reads funnel through one cached DataFrame:

`product_repository.get_base_df()` (`@lru_cache(maxsize=1)`) calls `filter_engine.load_data()` on `backend/app/data/최종데이터 전처리_final.csv`, then left-joins `product_images_final.csv` on `(품목명, 제조사명)`, deduplicates by `stable_id`, and precomputes `taste_tags`. **`get_base_df()` is the canonical source — never re-read the CSVs directly.** The cache is intentionally hot for the life of the process; restart `uvicorn` after editing the CSVs.

`product_service.get_products()` then chains, in order: `normalize_conditions` → `filter_safe_products` → `compute_nutrition_score` → `apply_query_filter` → `apply_taste_filter` → `apply_budget_filter` → `apply_sort` → paginate → `serialize_product`. `get_product_detail()` always re-evaluates against **all 8 conditions** regardless of the request (the list endpoint only evaluates the requested ones).

`load_data()` also synthesizes derived columns the rest of the code depends on: `serving_g`, `<nutrient>_1회` (per-serving scaled), `price_per_unit` (`price / 갯수(개)`), and `stable_id` (a string of the post-load index — the product ID exposed in the API). Don't bypass `load_data()` or these columns will be missing.

### Condition vocabulary mismatch (frontend ↔ backend)
The frontend uses `소아천식` and `카페인`; the backend's `filter_engine.CONDITION_RULE_MAP` keys them as `천식` and `카페인주의`. `product_filters.normalize_conditions()` is the single translation layer — anything that constructs condition lists for `filter_engine` must go through it. If you add a new condition, update **both** `front/lib/constants.ts` (`CONDITIONS`, `RISK_KEYWORDS`) **and** `CONDITION_MAP` + `CONDITION_RULE_MAP` + `RISK_KEYWORDS` on the backend.

### Risk / score / taste rules live in `filter_engine.py`
- `RISK_KEYWORDS` is the per-rule keyword dictionary; `CONDITION_RULE_MAP` composes rules into conditions. Substring match against `원재료명`.
- `is_high_calorie_low_nutrition()` adds an extra rule that flags `소아비만`/`소아당뇨` on top of the keyword check.
- `compute_nutrition_score()` produces `nutrition_score` (0–100, baseline 50) from good/bad nutrient lists normalized against the column max — scores are **relative to the current DataFrame**, so filtering before scoring shifts the absolute values.
- `tag_taste()` is keyword-based with two dictionaries: `TASTE_KEYWORDS` (against ingredients) and `NAME_TASTE_KEYWORDS` (against product name). Both must be updated when adding a taste.

### Frontend has no real routes — navigation is Zustand state
`front/app/page.tsx` renders one component (`SnackApp`) that switches between `HomeScreen` / `ResultsScreen` / `DetailScreen` based on `useFilterStore().currentView`. The only real Next.js routes are `/` and the stub API routes under `front/app/api/*`.

**The stub API routes (`front/app/api/products`, `/stats`) use `MOCK_PRODUCTS` from `lib/mock-data.ts` and are not the production data path.** Production requests go directly from `ResultsScreen` / `DetailScreen` to `NEXT_PUBLIC_BACKEND_URL` (default `http://127.0.0.1:8000`). Don't add features to `front/app/api/*` — change the FastAPI backend instead.

The filter store (`lib/filter-store.ts`) holds `Set<Condition>` / `Set<TasteTag>`, so anything reading them in a React effect must convert to arrays via `useMemo` (see `ResultsScreen`) — `Set` identity changes break dependency arrays.

### Backend CORS and data files
`backend/app/main.py` sets `allow_origins=["*"]` with a "개발 단계에서만" comment — tighten before deploying. The two CSVs under `backend/app/data/` are the product database; they are not regenerated by the collector (the collector only fetches raw API data into `data/<category>_raw.json` at the repo root) and there is no documented preprocessing script in the repo.

### TypeScript build errors are ignored
`front/next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`. `pnpm build` will succeed even with type errors — `pnpm lint` is the only check that runs.

## Collector specifics (see `src/collector/README.md` for full detail)

- ThreadPoolExecutor with `os.cpu_count() // 2` workers, 1,000-record batches, `REQUEST_DELAY = 0.5s` stagger between workers, 3 retries with linear backoff, then a sequential retry pass over still-failed batches.
- API response codes: `INFO-000` = ok, `INFO-200` = empty, `ERROR-336` = exceeded 1,000/request, `INFO-300` = daily quota.
- Default category is `"과자"`; output goes to `<repo>/data/{category}_raw.json`.
