'use client';

import { X } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { cn } from '@/lib/utils';

// 알레르기 세부 항목 라벨 변환
const ALLERGY_LABELS: Record<string, string> = {
  '알레르기_밀':       '밀/글루텐',
  '알레르기_메밀':     '메밀',
  '알레르기_대두':     '대두/콩',
  '알레르기_복숭아':   '복숭아',
  '알레르기_귤오렌지': '귤/오렌지',
  '알레르기_토마토':   '토마토',
  '알레르기_돼지고기': '돼지고기',
  '알레르기_닭고기':   '닭고기',
  '알레르기_계란':     '계란',
  '알레르기_우유':     '유제품',
  '알레르기_고등어':   '고등어',
  '알레르기_게':       '게',
  '알레르기_조개':     '조개류',
  '알레르기_새우':     '새우',
  '알레르기_오징어':   '오징어',
  '알레르기_땅콩':     '땅콩',
  '알레르기_호두':     '호두',
  '알레르기_잣':       '잣',
  '알레르기_아황산':   '아황산류',
};

const getConditionLabel = (condition: string): string => {
  return ALLERGY_LABELS[condition] || condition;
};

export function FilterTagBar() {
  const { conditions, tastes, budget, toggleCondition, toggleTaste } = useFilterStore();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const conditionsArray = Array.from(conditions);
  const tastesArray = Array.from(tastes);

  const hasFilters = conditionsArray.length > 0 || tastesArray.length > 0;

  if (!hasFilters && budget >= 20000) return null;

  return (
    <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 min-w-max">
        {conditionsArray.map((condition) => (
          <button
            key={condition}
            onClick={() => toggleCondition(condition)}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
              'bg-primary-lt text-primary border border-primary/20'
            )}
          >
            <span role="img" aria-label="health">🏥</span>
            {getConditionLabel(condition)}
            <X className="w-3 h-3" />
          </button>
        ))}

        {tastesArray.map((taste) => (
          <button
            key={taste}
            onClick={() => toggleTaste(taste)}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
              'bg-warn-lt text-warn border border-warn/20'
            )}
          >
            <span role="img" aria-label="candy">🍬</span>
            {taste}
            <X className="w-3 h-3" />
          </button>
        ))}

        {budget < 20000 && (
          <div
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
              'bg-info-lt text-info border border-info/20'
            )}
          >
            <span role="img" aria-label="money">💰</span>
            {formatPrice(budget)}원 이하
          </div>
        )}
      </div>
    </div>
  );
}