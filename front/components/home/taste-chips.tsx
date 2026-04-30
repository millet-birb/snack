'use client';

import { useFilterStore } from '@/lib/filter-store';
import { TASTE_TAGS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function TasteChips() {
  const { tastes, toggleTaste } = useFilterStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Group by category
  const tastesByCategory = {
    sweet: TASTE_TAGS.filter(t => t.category === 'sweet'),
    savory: TASTE_TAGS.filter(t => t.category === 'savory'),
    nutty: TASTE_TAGS.filter(t => t.category === 'nutty'),
    other: TASTE_TAGS.filter(t => t.category === 'other'),
  };

  const categoryLabels = {
    sweet: '달콤 계열',
    savory: '짭짤/매콤 계열',
    nutty: '고소 계열',
    other: '기타',
  };

  const displayedTastes = isExpanded 
    ? TASTE_TAGS 
    : TASTE_TAGS.slice(0, 12);

  return (
    <section className="px-4 py-6 bg-secondary/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-text">
          선호하는 맛을 선택하세요
        </h3>
        <span className="text-xs text-text-3">다중 선택 가능</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayedTastes.map((taste) => {
          const isSelected = tastes.has(taste.id);
          return (
            <button
              key={taste.id}
              onClick={() => toggleTaste(taste.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-text-2 border border-border-soft hover:border-primary/30"
              )}
            >
              {taste.label}
            </button>
          );
        })}
      </div>

      {TASTE_TAGS.length > 12 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mx-auto mt-4 text-xs text-text-2 hover:text-primary transition-colors"
        >
          {isExpanded ? (
            <>
              접기 <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              더보기 ({TASTE_TAGS.length - 12}개) <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {tastes.size > 0 && (
        <div className="mt-4 pt-3 border-t border-border-soft">
          <p className="text-xs text-text-3">
            선택된 맛: <span className="text-primary font-medium">{Array.from(tastes).join(', ')}</span>
          </p>
        </div>
      )}
    </section>
  );
}
