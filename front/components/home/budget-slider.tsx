'use client';

import { useFilterStore } from '@/lib/filter-store';
import { BUDGET_MIN, BUDGET_MAX, BUDGET_STEP } from '@/lib/constants';
import { Slider } from '@/components/ui/slider';

export function BudgetSlider() {
  const { budget, setBudget } = useFilterStore();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <section className="px-4 py-6">
      <h3 className="font-display text-lg text-text mb-4">
        예산을 설정하세요
      </h3>

      <div className="bg-card rounded-xl p-5 shadow-xs">
        {/* Price display */}
        <div className="text-center mb-6">
          <span className="font-serif-display text-[42px] text-primary leading-none">
            {formatPrice(budget)}
          </span>
          <span className="text-lg text-text ml-1">원 이하</span>
        </div>

        {/* Slider */}
        <div className="px-2">
          <Slider
            value={[budget]}
            onValueChange={(values) => setBudget(values[0])}
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            className="w-full"
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between mt-3 text-xs text-text-3">
          <span>{formatPrice(BUDGET_MIN)}원</span>
          <span>{formatPrice(BUDGET_MAX)}원</span>
        </div>
      </div>
    </section>
  );
}
