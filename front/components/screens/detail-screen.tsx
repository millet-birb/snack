'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import type { Product, Condition } from '@/lib/types';
import { scoreToGrade } from '@/lib/grade';
import { cn } from '@/lib/utils';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const ALL_CONDITIONS = [
  '알레르기',
  '아토피',
  '소아천식',
  '유당불내증',
  '아나필락시스',
  '소아비만',
  '소아당뇨',
  '카페인',
] as const satisfies readonly Condition[];

type DetailCondition = (typeof ALL_CONDITIONS)[number];

export function DetailScreen() {
  const { selectedProduct, setCurrentView, setSelectedProduct, conditions, tastes } = useFilterStore();

  const [detail, setDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Set identity가 매번 바뀌므로 배열로 메모해 의존성 배열에 안전하게 넣음
  const tasteList = useMemo(() => Array.from(tastes ?? []), [tastes]);
  const conditionList = useMemo(() => Array.from(conditions ?? []), [conditions]);

  useEffect(() => {
    if (!selectedProduct?.id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (tasteList.length > 0) {
          params.set('tastes', tasteList.join(','));
        }
        const queryString = params.toString();
        const url = `${BACKEND_URL}/api/products/${selectedProduct.id}${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url);
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
  }, [selectedProduct, tasteList]);

  useEffect(() => {
    if (!selectedProduct?.id) {
      setSimilar([]);
      return;
    }

    const fetchSimilar = async () => {
      try {
        setSimilarLoading(true);
        const params = new URLSearchParams({ top_k: '5' });
        if (conditionList.length > 0) {
          params.set('conditions', conditionList.join(','));
        }
        if (tasteList.length > 0) {
          params.set('tastes', tasteList.join(','));
        }
        const res = await fetch(
          `${BACKEND_URL}/api/products/${selectedProduct.id}/similar?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error(`유사 상품 조회 실패: ${res.status}`);
        }
        const data = await res.json();
        setSimilar(Array.isArray(data?.products) ? data.products : []);
      } catch (err) {
        console.error(err);
        setSimilar([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchSimilar();
  }, [selectedProduct?.id, conditionList, tasteList]);

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

  const sizeInfoParts: string[] = [];
  //if (product.foodWeight) sizeInfoParts.push(`식품중량 ${product.foodWeight}`);
  if (product.weightG != null) sizeInfoParts.push(`중량 ${product.weightG}g`);
  if (product.itemCount != null) sizeInfoParts.push(`갯수 ${product.itemCount}개`);

  const safeSet = new Set(product.safeFor ?? []);
  const warnSet = new Set(product.warnFor ?? []);
  const warnIngredients = product.warnIngredients ?? {};
  const selectedEvaluation = selectedProduct ?? product;
  const selectedSafeSet = new Set(selectedEvaluation.safeFor ?? []);
  const selectedConditions = Array.from(conditions);
  const selectedSafeConditions = selectedConditions.filter((condition) =>
    selectedSafeSet.has(condition)
  );
  const matchedTastes = Array.from(tastes).filter((taste) =>
    (product.tasteTags ?? []).includes(taste)
  );

  // 등급은 safeSnackScore 우선, 없으면 nutritionScore로 폴백
  const gradeScore = product.safeSnackScore ?? product.nutritionScore ?? 0;
  const grade = scoreToGrade(gradeScore);

  // 추천 이유 카테고리: 안전성 / 영양 평가 / 영양 보너스 / 맛 매칭
  // 영양 임계값은 백엔드 bad_rules와 동일
  const nutrientLevel = (
    value: number,
    lowMax: number,
    highMin: number,
  ): '낮음' | '보통' | '높음' => {
    if (value <= lowMax) return '낮음';
    if (value >= highMin) return '높음';
    return '보통';
  };

  const sugarG = product.nutrition?.sugarG ?? 0;
  const sodiumMg = product.nutrition?.sodiumMg ?? 0;
  const proteinG = product.nutrition?.proteinG ?? 0;
  const fiberG = product.nutrition?.fiberG ?? 0;

  const reasonLines: string[] = [];
  if (selectedSafeConditions.length > 0) {
    reasonLines.push(`선택한 ${selectedSafeConditions.join('·')} 조건 통과`);
  }
  reasonLines.push(
    `당류 ${sugarG}g (${nutrientLevel(sugarG, 3, 12)}) · 나트륨 ${sodiumMg}mg (${nutrientLevel(sodiumMg, 100, 350)})`,
  );
  const bonuses: string[] = [];
  if (proteinG >= 5) bonuses.push(`단백질 ${proteinG}g 함유`);
  if (fiberG >= 3) bonuses.push(`식이섬유 ${fiberG}g 함유`);
  if (bonuses.length > 0) reasonLines.push(bonuses.join(' · '));
  if (matchedTastes.length > 0) {
    reasonLines.push(`선택한 맛 '${matchedTastes.join(', ')}' 일치`);
  }

  const conditionLabelMap: Record<DetailCondition, string> = {
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

          {sizeInfoParts.length > 0 && (
            <div className="mt-2 text-[11px] text-text-3">
              {sizeInfoParts.join(' · ')}
            </div>
          )}

          <div className="mt-3 text-[44px] font-semibold leading-none text-primary">
            {product.price}원
          </div>

          <div className="mt-6 rounded-2xl border-l-4 border-primary bg-[#FFF8F5] px-4 py-4">
            <div className="flex items-start gap-1.5">
              <span className="text-sm leading-[1.4]">💡</span>
              <div className="flex-1">
                <div className={cn('text-sm font-semibold', grade.accentClass)}>
                  {grade.label} · {grade.description}
                </div>
                <div className="mt-2 space-y-1 text-sm leading-6 text-text-2">
                  {reasonLines.map((line, idx) => (
                    <p key={idx}>✓ {line}</p>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-text-3">
                  본 평가는 자체 기준에 따른 것이며, 의학적 권고가 아닙니다.
                </p>
              </div>
            </div>
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
                ['1회 제공량', `${product.servingG} g`],
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

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">
              비슷한 안전 대안
              {conditionList.length > 0 && (
                <span className="ml-2 text-[11px] font-normal text-text-3">
                  · 선택한 조건 통과
                </span>
              )}
            </h2>
            {similarLoading ? (
              <p className="mt-3 text-xs text-text-3">유사 상품을 불러오는 중...</p>
            ) : similar.length === 0 ? (
              <p className="mt-3 text-xs text-text-3">
                유사한 대안을 찾지 못했어요.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {similar.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDetail(null);
                      setSelectedProduct(item);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-2xl bg-bg-warm p-3 text-left transition-shadow hover:shadow-sm"
                  >
                    <div className="flex justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface text-3xl">
                          🍪
                        </div>
                      )}
                    </div>
                    <div className="mt-2 truncate text-[11px] text-text-3">
                      {item.brand}
                    </div>
                    <div className="line-clamp-2 text-xs font-semibold text-text">
                      {item.name}
                    </div>
                    <div className="mt-1 text-xs text-primary">{item.price}원</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => alert('네이버 스토어 연동 준비 중이에요 🏪')}
            className="mt-6 w-full rounded-[24px] bg-primary px-4 py-4 text-base font-semibold text-white shadow-sm"
          >
            🛒 네이버 스토어에서 구매하기
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
