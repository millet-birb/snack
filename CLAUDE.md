# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Snack Safe** — 어린이 건강 상태(알레르기, 아토피, 천식, 유당불내증, 아나필락시스, 소아비만, 소아당뇨, 카페인주의)에 맞는 안전한 과자를 추천하는 풀스택 웹앱.

- 백엔드: FastAPI + Pandas (식품안전나라 CSV 데이터 기반 필터링)
- 프론트엔드: Next.js 16 + React 19 + Tailwind CSS + Radix UI
- 데이터 수집기: 식품안전나라 OpenAPI 스크래퍼

## Commands

### Backend (루트 디렉토리에서)
```bash
uv run uvicorn backend.app.main:app --reload   # 개발 서버 실행 (포트 8000)
```

### Frontend (`front/` 디렉토리에서)
```bash
npm run dev    # 개발 서버 (포트 3000)
npm run build  # 프로덕션 빌드
npm run lint   # ESLint 검사
```

### 데이터 수집기
```bash
uv run python -m src.collector.food_collector  # 식품안전나라 OpenAPI에서 원시 데이터 수집
```

## Architecture

### Backend (`backend/app/`)

서비스 계층 분리 구조:

- `routers/products.py` — API 엔드포인트 정의 (`/api/stats`, `/api/products`, `/api/products/{id}`)
- `services/product_service.py` — 비즈니스 로직 오케스트레이션
- `services/filter_engine.py` — 핵심 필터링 로직: 150+ 건강조건별 위험 키워드 감지, 영양 점수 계산, 맛 태깅(30개 카테고리)
- `services/product_filters.py` — 쿼리/맛/예산/정렬 필터 적용
- `services/product_repository.py` — CSV 데이터 로딩 (LRU 캐시 적용)
- `services/product_serializer.py` — 응답 포맷팅
- `data/` — `최종데이터 전처리_final.csv` (상품 DB), `product_images_final.csv` (이미지 매핑)

CORS는 모든 출처 허용(개발 모드). 환경변수는 `.env` 파일로 관리.

### Frontend (`front/`)

- `components/snack-app.tsx` — 최상위 앱 컴포넌트, 화면 전환 관리
- `components/screens/` — Home/Results 화면
- `components/home/` — 필터 UI (건강조건 그리드, 맛 칩, 예산 슬라이더)
- `components/results/` — 상품 카드, 필터 태그, 정렬, 페이지네이션
- `components/detail/` — 상품 상세 (영양성분, 원재료 경고, 안전성 평가)
- `components/ui/` — Radix UI 기반 50+ 공통 컴포넌트
- `lib/filter-store.ts` — Zustand 전역 필터 상태
- `lib/types.ts` — TypeScript 인터페이스 (Product, Condition, TasteTag 등)
- `lib/constants.ts` — 건강조건/맛 메타데이터, 위험 키워드, 정렬 옵션
- `app/api/` — Next.js Route Handlers (백엔드 프록시 또는 목업)

### 데이터 수집기 (`src/collector/`)

`food_collector.py`: 식품안전나라 C002 API → ThreadPoolExecutor(배치 1000건, 재시도 3회) → `data/과자_raw.json`

## Environment Variables

- 백엔드: `backend/.env` 또는 루트 `.env`에 `food_api_key` (식품안전나라 OpenAPI 키)
- 프론트엔드: `front/.env.local`

## Key Design Decisions

- 필터 엔진은 Pandas DataFrame 기반으로 동작하며 레포지토리 메서드에 LRU 캐시 적용
- 프론트엔드 이미지 최적화 비활성화(`next.config.mjs`의 `unoptimized: true`)
- 프론트엔드 API Route는 백엔드 연동 전 목업 데이터로 개발 가능
