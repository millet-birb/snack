'use client';

import { CONDITIONS } from '@/lib/constants';
import type { Product, Condition } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SafetyListProps {
  product: Product;
}

export function SafetyList({ product }: SafetyListProps) {
  return (
    <div className="px-4 py-4">
      <h3 className="font-display text-base text-text mb-3">질환별 안전 여부</h3>
      <div className="space-y-2">
        {CONDITIONS.map((condition) => {
          const isSafe = product.safeFor.includes(condition.id);
          const isWarn = product.warnFor.includes(condition.id);
          const warnIngredients = product.warnIngredients[condition.id] || [];

          if (!isSafe && !isWarn) return null;

          return (
            <div
              key={condition.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                isSafe ? "bg-safe-lt" : "bg-warn-lt"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                isSafe ? "bg-safe" : "bg-warn"
              )}>
                {isSafe ? '✓' : '!'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{condition.icon}</span>
                  <span className="font-medium text-sm text-text">{condition.label}</span>
                </div>
                <p className={cn(
                  "text-xs mt-1",
                  isSafe ? "text-safe" : "text-warn"
                )}>
                  {isSafe 
                    ? '관련 위험 성분 미검출' 
                    : `주의 성분: ${warnIngredients.join(', ')}`
                  }
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
