'use client';

import { X } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { cn } from '@/lib/utils';

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
            {condition}
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