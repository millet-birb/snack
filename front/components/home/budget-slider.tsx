'use client';

import { Minus, Plus } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import {
  BUDGET_MIN,
  BUDGET_MAX,
  BUDGET_STEP,
  BUDGET_FINE_STEP,
} from '@/lib/constants';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

export function BudgetSlider() {
  const { budget, setBudget } = useFilterStore();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const clamp = (value: number) =>
    Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, value));

  const adjust = (delta: number) => setBudget(clamp(budget + delta));

  return (
    <section className="px-4 py-6">
      <h3 className="font-display text-lg text-text mb-4">
        예산을 설정하세요
      </h3>

      <div className="bg-card rounded-xl p-5 shadow-xs">
        {/* Price display with fine-tune buttons */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => adjust(-BUDGET_FINE_STEP)}
            disabled={budget <= BUDGET_MIN}
            aria-label={`예산 ${BUDGET_FINE_STEP}원 감소`}
            className="rounded-full"
          >
            <Minus />
          </Button>

          <div className="text-center">
            <span className="font-serif-display text-[42px] text-primary leading-none">
              {formatPrice(budget)}
            </span>
            <span className="text-lg text-text ml-1">원 이하</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => adjust(BUDGET_FINE_STEP)}
            disabled={budget >= BUDGET_MAX}
            aria-label={`예산 ${BUDGET_FINE_STEP}원 증가`}
            className="rounded-full"
          >
            <Plus />
          </Button>
        </div>

        {/* Slider (snaps to BUDGET_STEP) */}
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
