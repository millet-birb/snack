'use client';

import { useStats } from '@/hooks/use-stats';

export function StatsStrip() {
  const { totalProducts, totalConditions, totalTasteCategories } = useStats();
  const stats = [
    { value: String(totalProducts), label: '검증된 제품' },
    { value: String(totalConditions), label: '질환 필터' },
    { value: String(totalTasteCategories), label: '맛 카테고리' },
  ];

  return (
    <section className="px-4 py-5 bg-card border-y border-border-soft">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className="text-center animate-slide-up"
            style={{ animationDelay: `${0.05 * (index + 1)}s` }}
          >
            <div className="font-serif-display text-[32px] text-primary leading-none">
              {stat.value}
            </div>
            <div className="text-[11px] text-text-2 mt-1 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
