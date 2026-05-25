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

# Rebuild the product SQLite DB after editing the data CSVs (from backend/)
python -m app.scripts.build_product_db

# Frontend (from front/)
pnpm install
pnpm dev      # next dev
pnpm build    # next build
pnpm lint     # eslint .
```

There is no test suite in any of the three subprojects.

`backend/requirements.txt` pins each dependency to a major-version range (e.g. `openai>=1.40,<2.0`) — when adding a new dep, pin it the same way to avoid surprise breaks on rebuild.

## Architecture notes that span multiple files

### Backend request pipeline
All product reads funnel through one cached DataFrame:

`product_repository.get_base_df()` (`@lru_cache(maxsize=1)`) loads the product DataFrame, **preferring the prebuilt SQLite DB**: if `backend/app/data/snack_products.sqlite3` exists it reads `SELECT * FROM products`; otherwise it falls back to the CSV path — `filter_engine.load_data()` on `최종데이터 전처리_final.csv` left-joined with `product_images_final.csv` on `(품목명, 제조사명)`. Either way it then dedupes by `stable_id` and ensures `taste_tags` exists. **`get_base_df()` is the canonical source — never re-read the CSVs/DB directly.** The cache is intentionally hot for the life of the process; restart `uvicorn` after changing the data. **Editing the CSVs alone has no effect while the SQLite DB exists** — rerun `build_product_db` (see Commands) to regenerate it.

The DB is built by `app/scripts/build_product_db.py`: it runs `load_data()` on the source CSV, merges `product_images_final.csv` (image URLs) and `가격전처리.csv` (an *inner* join that overwrites `식품중량`/`중량(g)`/`갯수(개)`/`price`), dedupes by `stable_id`, and writes the `products` table with indexes on `stable_id` and `(품목명, 제조사명)`.

`product_service.get_products()` then chains, in order: `normalize_conditions` → `filter_safe_products` → `compute_nutrition_score` → `apply_query_filter` → `apply_taste_filter` → `apply_budget_filter` → `apply_sort` → paginate → `serialize_product`. `get_product_detail()` always re-evaluates against **all 8 conditions** regardless of the request (the list endpoint only evaluates the requested ones), and additionally calls `compute_safe_snack_score(df, selected_tastes=...)` on the single-row DataFrame to attach the composite score columns (`nutrition_risk_score`, `public_policy_score`, `preference_score`, `safe_snack_score`) for the detail screen. The list endpoint does **not** compute `safe_snack_score` — only `nutrition_score`.

`load_data()` also synthesizes derived columns the rest of the code depends on: `serving_g`, `<nutrient>_1회` (per-serving scaled), `price_per_unit` (`price / 갯수(개)`), and `stable_id` (a string of the post-load index — the product ID exposed in the API). Don't bypass `load_data()` or these columns will be missing.

### Group purchase feature (separate from the single-product list)
`routers/group.py` (mounted at `/api/group`, **not** through the `/api` include like `products_router`) and `services/group_service.py` implement bulk-buy recommendations for a mixed group of children. The frontend half is `front/components/screens/group-purchase-screen.tsx`, reached via the `'group'` view.

Three modes, all keyed off a `groupInfo` of `{ totalPeople, diseaseGroups: {<condition>: count} }`:
- **A (`/mode-a`)** — one product list everyone can eat (passes *all* present conditions simultaneously). Relaxes the taste filter if it would empty the result.
- **B (`/mode-b`)** — a separate ranked list per disease group, plus a "질환없음" group for the remainder.
- **C (`/mode-c`)** — auto-fills a cart against `budget`. `sameSnack` toggles one snack for everyone vs. per-group snacks; `pinnedIds` survive re-rolls; picks randomly from the top-20 by `nutrition_score`.

`/cart` re-prices a frontend-assembled cart and re-checks warnings. Group code calls `filter_engine` primitives (`filter_safe_products`, `evaluate_product`, `compute_nutrition_score`, `tag_taste`) **directly** — it does *not* go through `product_service` or `normalize_conditions`, so it expects backend condition keys (the `CONDITION_RULE_MAP` vocabulary) already.

### Condition vocabulary mismatch (frontend ↔ backend)
The frontend uses `소아천식` and `카페인`; the backend's `filter_engine.CONDITION_RULE_MAP` keys them as `천식` and `카페인주의`. `product_filters.normalize_conditions()` is the single translation layer — anything that constructs condition lists for `filter_engine` must go through it. If you add a new condition, update **both** `front/lib/constants.ts` (`CONDITIONS`, `RISK_KEYWORDS`) **and** `CONDITION_MAP` + `CONDITION_RULE_MAP` + `RISK_KEYWORDS` on the backend.

### Risk / score / taste rules live in `filter_engine.py`
- `RISK_KEYWORDS` is the per-rule keyword dictionary; `CONDITION_RULE_MAP` composes rules into conditions. Substring match against `원재료명`. `NAME_RISK_KEYWORDS` + `detect_risks_in_name()` add a second pass against `품목명` so packaging-only allergens (e.g. "새우깡" with an opaque "복합조미식품" ingredient line) still get flagged.
- `is_high_calorie_low_nutrition()` adds an extra rule that flags `소아비만`/`소아당뇨` on top of the keyword check.
- **Scoring (rewritten — no longer DataFrame-relative).** The core function is `compute_nutrition_risk_score()`: starts at **100**, applies per-nutrient **absolute thresholds** (`bad_rules` = sugar/sodium/saturated_fat/trans_fat/calories/cholesterol; `good_rules` = fiber/protein) via `_scale_penalty` / `_scale_bonus`, then clips to 0–100 and rounds to int. Each threshold tuple is `(no_penalty_at, max_penalty_at, max_penalty)` per the 1-회-제공량 (`*_1회`) columns when they exist — values below `no_penalty_at` get no penalty, values above `max_penalty_at` get the full penalty, in between is linear. Missing values get `missing_penalty_ratio × max_penalty` (default 0.35). Because thresholds are absolute, **the score no longer shifts when you filter the DataFrame** — this is the key behavioral change from the old 50-baseline column-max-normalized version.
- `compute_nutrition_score(df)` is now a thin **df → df wrapper** that calls `compute_nutrition_risk_score(df, missing_penalty_ratio=0.15)` (lighter missing penalty to soften the transition from the old logic) and writes the result to the `nutrition_score` column. Existing callers (`product_service.get_products`, `group_service`) work unchanged. **칼슘/철은 `_1회` 컬럼이 없어 100g 기준 값으로 평가**되므로 보너스가 약간 과대평가될 수 있음 — `NUTRIENT_COLS`의 후보 리스트는 `_1회` 컬럼을 우선한다.
- `compute_safe_snack_score(df, selected_tastes=...)` is the new **composite** for the detail screen only. It writes four columns: `nutrition_risk_score` (same as above, default 0.35 missing penalty), `public_policy_score` (100 unless `is_high_calorie_low_nutrition` flags it → 30), `preference_score` (100 if no `selected_tastes`; else `60 + 40 × (matched / len(selected_tastes))` against `taste_tags` — never below 60 once enabled), and the weighted `safe_snack_score = 0.70 × risk + 0.15 × policy + 0.15 × preference`. **It does not overwrite `nutrition_score`** — both columns coexist after the call. Currently only `get_product_detail` invokes it (`get_products` skips it for list-page performance).
- `tag_taste()` is keyword-based with two dictionaries: `TASTE_KEYWORDS` (against ingredients) and `NAME_TASTE_KEYWORDS` (against product name). Both must be updated when adding a taste. `match_tastes()` (and `apply_taste_filter`) treat **`FRUIT_TASTES` as OR** within themselves and AND with everything else — so `바나나+복숭아+매콤` means `(바나나 OR 복숭아) AND 매콤`. New fruit tastes must be added to `FRUIT_TASTES` too.

### Frontend has no real routes — navigation is Zustand state
`front/app/page.tsx` renders one component (`SnackApp`) that switches between `HomeScreen` / `ResultsScreen` / `DetailScreen` / `GroupPurchaseScreen` based on `useFilterStore().currentView` (`'home' | 'results' | 'detail' | 'group'`). `BottomNav` drives view changes. The only real Next.js routes are `/` and the stub API routes under `front/app/api/*`.

**The stub API routes (`front/app/api/products`, `/stats`) use `MOCK_PRODUCTS` from `lib/mock-data.ts` and are not the production data path.** Production requests go directly to the FastAPI backend via the single env var **`NEXT_PUBLIC_BACKEND_URL`** (default `http://127.0.0.1:8000`) from: `ResultsScreen`, `DetailScreen`, `GroupPurchaseScreen`, `ChatWidget`, and the `use-stats` hook. Don't introduce a second env-var name (an earlier `NEXT_PUBLIC_API_BASE_URL` divergence in `GroupPurchaseScreen` silently broke prod) — and don't add features to `front/app/api/*`; change the FastAPI backend instead.

The filter store (`lib/filter-store.ts`) holds `Set<Condition>` / `Set<TasteTag>`, so anything reading them in a React effect must convert to arrays via `useMemo` (see `ResultsScreen`) — `Set` identity changes break dependency arrays.

### Chatbot endpoint (separate from product list / group features)
`routers/chat.py` (mounted at `/api/chat`) wraps the OpenAI Chat Completions API (`gpt-4o-mini`) with **two function tools** — `search_snacks` (single-product recommendations via `product_service.get_products()`) and `recommend_group_purchase` (group-purchase recommendations via `group_service.recommend_mode_a/b/c()`). The router runs a bounded tool-use loop (max 4 turns), but **only the first turn sends the `tools=` schema** — once the model has called a tool, follow-up turns are free of the ~27-entry condition enum + ~29-entry taste enum to save input tokens.

`search_snacks` parameters worth knowing:
- `conditions` (required) — frontend condition keys; passed through `normalize_conditions` inside `get_products`.
- `budget` — **omit if user didn't mention a price**. `run_search_snacks` maps a missing/zero `budget` to `budget=0` in `get_products`, which makes `apply_budget_filter` skip the cutoff entirely. (An earlier version slid in a 20,000원 default and the LLM started inventing "예산 2만 원에 맞춰…" in replies — the SYSTEM_PROMPT now explicitly bans this and the tool description repeats the warning.)
- `maxCaloriesPerServing` and `sortBy` (`"nutritionScore"` default | `"lowCalorie"`) — both are **post-processed in `chat.py`**, not by `get_products` (which doesn't support per-serving calorie sorting). When either is in play, `run_search_snacks` calls `get_products(per_page=30)` instead of 5 to leave room for the filter/sort, then trims to the top 5 before handing to the LLM. `caloriesPerServingKcal` refers to `nutrition.caloriesKcal` on the serialized product — which is **per 1-회 섭취량**, not per 100g.

`recommend_group_purchase` parameters:
- `totalPeople` + `budget` (both required, must be > 0 — the function returns an error dict otherwise).
- `diseaseGroups` (e.g. `{"알레르기": 2, "소아당뇨": 1}`) is a **head-count map** keyed by frontend condition keys. `run_group_purchase` runs each key through `normalize_conditions` before passing to `group_service` (which itself bypasses normalization).
- `allergyConditions` is for the specific allergen sub-keys (`알레르기_우유` etc.); the grouping key `알레르기` goes in `diseaseGroups`.
- `tastes` / `excludeTastes` — both pull from the new `TASTE_OPTIONS` enum (29 tags). SYSTEM_PROMPT instructs the LLM that exclusions like "단 거 빼고" become `excludeTastes=["달달","카라멜"]`, never `tastes`.
- `mode` (`A` | `B` | `C`, default `C`), plus `perPerson` and `sameSnack` for mode C only.

Token / response shape knobs to be aware of when editing `chat.py`:
- `max_tokens=500` caps each OpenAI response.
- `MAX_HISTORY = 6` — only the last 6 client-supplied history messages are forwarded on each request.
- `search_snacks` tool result is trimmed to 5 minimal fields per product (`name`, `brand`, `price`, `servingG`, `caloriesPerServingKcal`).
- `recommend_group_purchase` tool result is trimmed similarly: `cart` keeps `name/brand/qty/subtotal/group`; `products` top-10 with `name/brand/price`; each `groups[*].products` top-5.
- An in-process LRU response cache (`_RESPONSE_CACHE`, max 128 entries) keyed by the normalized user `message` — identical questions skip the OpenAI call entirely. **Volatile** (cleared on `uvicorn` restart) and **per-worker** (not shared across `--workers N`). History is *not* part of the cache key, so a cached reply will be returned even if the prior turns differ — fine for the typical "추천해줘" style prompts, surprising for follow-up questions like "왜?".

Security and input hardening (don't loosen these without a reason):
- `ChatMessage.role` is `Literal["user", "assistant"]` — `system` and `tool` are **rejected at the Pydantic layer**. A client sending `role: "system"` could otherwise overwrite the SafeSnack system prompt (allergy rules, budget rules) or inject fake `role: "tool"` results to fabricate product data.
- `ChatRequest.message` is capped at 2000 chars and `history` at 20 messages to cap OpenAI token cost / DoS surface.
- Error responses are **sanitized**: missing `OPENAI_API_KEY` → 503 generic, OpenAI call failure → 502 generic. Original exceptions are `logger.exception`'d server-side only — they can contain the API key tail / org ID / `.env` path.

Condition vocabulary: `chat.py`'s `CONDITION_OPTIONS` uses the **frontend** keys (e.g. `소아천식`, `카페인`, the 19 sub-allergens), and `run_search_snacks()` passes them through `get_products()` so the standard `normalize_conditions` translation runs (unlike `group_service.py`, which bypasses normalization). The SYSTEM_PROMPT explicitly tells the LLM to prefer narrow keys like `알레르기_새우` over the broad `알레르기` umbrella (which would exclude all 19 allergens at once and almost empty the result).

`backend/.env` must contain `OPENAI_API_KEY` — the router returns **503** if missing (was 500 before the sanitization pass).

### Backend CORS and data files
`backend/app/main.py` sets `allow_origins=["*"]` with a "개발 단계에서만" comment — tighten before deploying. The product database lives in `backend/app/data/` as several CSVs plus the generated `snack_products.sqlite3`. These are **not** regenerated by the collector (the collector only fetches raw API data into `data/<category>_raw.json` at the repo root); the source CSVs are hand-prepared, and `app/scripts/build_product_db.py` is the only script that consumes them (merging into the SQLite DB — see the request-pipeline section). There is no script that produces the source CSVs themselves.

### TypeScript build errors are ignored
`front/next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`. `pnpm build` will succeed even with type errors — `pnpm lint` is the only check that runs.

## Deployment

Target hosting is **Vercel** (frontend) + **Render** (backend, web service).

- **Backend**: `backend/Procfile` declares `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT` — Render auto-detects it when Root Directory is `backend` and the dashboard Start Command is left blank. `--host 0.0.0.0` and `$PORT` are both mandatory on Render; do not edit these out. `OPENAI_API_KEY` must be set in the Render dashboard (the `backend/.env` file is dev-only and gitignored).
- **Frontend**: set `NEXT_PUBLIC_BACKEND_URL=https://<render-app>.onrender.com` in the Vercel dashboard. `NEXT_PUBLIC_*` is inlined at build time — env-var changes require a redeploy.
- **CORS**: `backend/app/main.py` still uses `allow_origins=["*"]` with a "개발 단계에서만" comment. Tighten to the Vercel origin before going live — the chat endpoint has no auth or rate limiting and `*` lets any site burn the OpenAI key.
- The SQLite DB (`backend/app/data/snack_products.sqlite3`) is committed and read-only at runtime. **Never run `build_product_db.py` on Render** — its filesystem is ephemeral and the rebuild would vanish on restart.

## Collector specifics (see `src/collector/README.md` for full detail)

- ThreadPoolExecutor with `os.cpu_count() // 2` workers, 1,000-record batches, `REQUEST_DELAY = 0.5s` stagger between workers, 3 retries with linear backoff, then a sequential retry pass over still-failed batches.
- API response codes: `INFO-000` = ok, `INFO-200` = empty, `ERROR-336` = exceeded 1,000/request, `INFO-300` = daily quota.
- Default category is `"과자"`; output goes to `<repo>/data/{category}_raw.json`.
