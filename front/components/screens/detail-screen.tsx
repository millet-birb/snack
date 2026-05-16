'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import type { Product, Condition } from '@/lib/types';
import { cn } from '@/lib/utils';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const ALL_CONDITIONS: Condition[] = [
  '알레르기',
  '아토피',
  '소아천식',
  '유당불내증',
  '아나필락시스',
  '소아비만',
  '소아당뇨',
  '카페인',
];

export function DetailScreen() {
  const { selectedProduct, setCurrentView } = useFilterStore();

  const [detail, setDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProduct?.id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${BACKEND_URL}/api/products/${selectedProduct.id}`);
        if (!res.ok) {
          throw new Error(`상세 조회 실패: ${res.status}`);
        }

        const data = await res.json();
        setDetail(data);
      } catch (err) {
        console.error(err);
        setError('제품 상세 정보를 불러오지 못했습니다.');
        setDetail(selectedProduct);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedProduct]);

  const product = detail ?? selectedProduct;

  if (!product) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <button
          type="button"
          onClick={() => setCurrentView('results')}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <div className="mt-6 rounded-3xl bg-surface p-6 shadow-sm">
          선택된 제품이 없습니다.
        </div>
      </div>
    );
  }

  const safeSet = new Set(product.safeFor ?? []);
  const warnSet = new Set(product.warnFor ?? []);
  const warnIngredients = product.warnIngredients ?? {};

  const conditionLabelMap: Record<Condition, string> = {
    알레르기: '알레르기',
    아토피: '아토피',
    소아천식: '천식',
    유당불내증: '유당불내증',
    아나필락시스: '아나필락시스',
    소아비만: '소아비만',
    소아당뇨: '소아당뇨',
    카페인: '카페인',
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setCurrentView('results')}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <div className="mt-4 rounded-[32px] bg-surface p-5 shadow-sm">
          <div className="text-[12px] uppercase tracking-wide text-text-3">
            {product.brand}
          </div>

          <div className="mt-4 flex justify-center">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-36 w-36 rounded-[26px] object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-[26px] bg-bg-warm text-6xl">
                🍪
              </div>
            )}
          </div>

          <h1 className="mt-4 text-[28px] font-bold leading-tight text-text">
            {product.name}
          </h1>

          <div className="mt-4 text-[44px] font-semibold leading-none text-primary">
            {product.price}원
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">질환별 안전 여부</h2>
            <div className="mt-3 space-y-2">
              {ALL_CONDITIONS.map((condition) => {
                const isSafe = safeSet.has(condition);
                const isWarn = warnSet.has(condition);

                if (!isSafe && !isWarn) return null;

                return (
                  <div
                    key={condition}
                    className={cn(
                      'rounded-2xl px-4 py-3',
                      isSafe ? 'bg-safe-lt' : 'bg-warn-lt'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isSafe ? (
                          <CheckCircle2 className="h-5 w-5 text-safe" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-warn" />
                        )}
                      </div>

                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isSafe ? 'text-safe' : 'text-warn'
                          )}
                        >
                          {conditionLabelMap[condition]} - {isSafe ? '안전' : '주의'}
                        </div>

                        <div className="mt-1 text-xs text-text-2">
                          {isSafe
                            ? '관련 위험 성분 미검출'
                            : (warnIngredients[condition] ?? []).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">맛 태그</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(product.tasteTags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#FFF3E0] px-3 py-1 text-sm text-[#C56B0E]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">영양 성분</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['칼로리', `${product.nutrition?.caloriesKcal ?? 0} kcal`],
                ['당류', `${product.nutrition?.sugarG ?? 0} g`],
                ['지방', `${product.nutrition?.fatG ?? 0} g`],
                ['단백질', `${product.nutrition?.proteinG ?? 0} g`],
                ['나트륨', `${product.nutrition?.sodiumMg ?? 0} mg`],
                ['칼슘', `${product.nutrition?.calciumMg ?? 0} mg`],
                ['포화지방', `${product.nutrition?.saturatedFatG ?? 0} g`],
                ['트랜스지방', `${product.nutrition?.transFatG ?? 0} g`],
                ['콜레스테롤', `${product.nutrition?.cholesterolMg ?? 0} mg`],
                ['식이섬유', `${product.nutrition?.fiberG ?? 0} g`],
                ['철', `${product.nutrition?.ironMg ?? 0} mg`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-bg-warm p-3 text-center">
                  <div className="text-[11px] text-text-3">{label}</div>
                  <div className="mt-1 text-sm font-semibold text-text">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">원재료명</h2>
            <div className="mt-3 rounded-2xl bg-bg-warm p-4 text-sm leading-7 text-text-2">
              {product.ingredientsRaw || '원재료 정보 없음'}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border-l-4 border-primary bg-[#FFF8F5] px-4 py-4">
            <div className="text-sm font-semibold text-primary">
              💡 이 과자를 추천하는 이유
            </div>
            <p className="mt-2 text-sm leading-6 text-text-2">
              {product.recommendationReason?.trim()
                ? product.recommendationReason
                : '현재 선택한 조건을 기준으로 확인했을 때 비교적 무난하게 선택할 수 있는 과자예요. 원재료와 영양 정보를 함께 확인하면서 고르면 더 좋아요.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => alert('쿠팡 연동 준비 중이에요 🏪')}
            className="mt-6 w-full rounded-[24px] bg-primary px-4 py-4 text-base font-semibold text-white shadow-sm"
          >
            🛒 쿠팡에서 구매하기
          </button>

          {loading && (
            <p className="mt-3 text-xs text-text-3">상세 정보를 불러오는 중...</p>
          )}
          {error && (
            <p className="mt-3 text-xs text-warn">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}