'use client';

import { useEffect, useState } from 'react';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export interface Stats {
  totalProducts: number;
  totalConditions: number;
  totalTasteCategories: number;
}

// 백엔드 연결 실패 시 보여줄 기본값
const FALLBACK: Stats = {
  totalProducts: 542,
  totalConditions: 8,
  totalTasteCategories: 30,
};

// 모듈 단위 캐시 — 여러 컴포넌트가 호출해도 fetch는 1회만 실행
let cache: Stats | null = null;
let inflight: Promise<Stats> | null = null;

function fetchStats(): Promise<Stats> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(`${BACKEND_URL}/api/stats`)
    .then((res) => {
      if (!res.ok) throw new Error(`stats 요청 실패: ${res.status}`);
      return res.json();
    })
    .then((data: Stats) => (cache = data))
    .catch((err) => {
      console.error(err);
      return FALLBACK;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useStats(): Stats {
  const [stats, setStats] = useState<Stats>(cache ?? FALLBACK);

  useEffect(() => {
    let active = true;
    fetchStats().then((data) => active && setStats(data));
    return () => {
      active = false;
    };
  }, []);

  return stats;
}
