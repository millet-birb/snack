'use client';

import { useFilterStore } from '@/lib/filter-store';
import { CONDITIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function ConditionGrid() {
  const { conditions, toggleCondition } = useFilterStore();

  return (
    <section className="px-4 py-6">
      <h3 className="font-display text-lg text-text mb-4">
        아이의 질환을 선택하세요
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {CONDITIONS.map((condition, index) => {
          const isSelected = conditions.has(condition.id);
          return (
            <button
              key={condition.id}
              onClick={() => toggleCondition(condition.id)}
              className={cn(
                "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left animate-slide-up",
                isSelected 
                  ? "border-primary bg-primary-lt shadow-sm" 
                  : "border-transparent bg-card shadow-xs hover:shadow-sm"
              )}
              style={{ 
                animationDelay: `${0.05 * (index + 1)}s`,
                backgroundColor: isSelected ? undefined : condition.bgColor 
              }}
            >
              <span className="text-2xl mb-2" role="img" aria-label={condition.label}>
                {condition.icon}
              </span>
              <span className="font-semibold text-[13px] text-text mb-0.5">
                {condition.label}
              </span>
              <span className="text-[10px] text-text-2 leading-tight">
                {condition.description}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
