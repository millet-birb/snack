'use client';

import type { Product, Condition } from '@/lib/types';
import { RISK_KEYWORDS } from '@/lib/constants';
import { useFilterStore } from '@/lib/filter-store';
import { useMemo } from 'react';

interface IngredientsSectionProps {
  product: Product;
}

export function IngredientsSection({ product }: IngredientsSectionProps) {
  const { conditions } = useFilterStore();

  // Find all risk keywords for selected conditions
  const riskKeywords = useMemo(() => {
    const keywords = new Set<string>();
    conditions.forEach((condition) => {
      const risks = RISK_KEYWORDS[condition] || [];
      risks.forEach((keyword) => keywords.add(keyword));
    });
    return keywords;
  }, [conditions]);

  // Highlight risk ingredients in the text
  const highlightedIngredients = useMemo(() => {
    if (riskKeywords.size === 0) {
      return product.ingredientsRaw;
    }

    let text = product.ingredientsRaw;
    const keywordsArray = Array.from(riskKeywords);
    
    // Sort by length (longest first) to avoid partial replacements
    keywordsArray.sort((a, b) => b.length - a.length);
    
    keywordsArray.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      text = text.replace(regex, `<mark class="hl">$1</mark>`);
    });

    return text;
  }, [product.ingredientsRaw, riskKeywords]);

  return (
    <div className="px-4 py-4">
      <h3 className="font-display text-base text-text mb-3">원재료명</h3>
      <div className="bg-secondary rounded-lg p-4">
        <p 
          className="text-sm text-text-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedIngredients }}
        />
      </div>
      {riskKeywords.size > 0 && (
        <p className="text-xs text-text-3 mt-2">
          * 선택한 질환의 위험 성분은 <span className="hl">하이라이트</span>로 표시됩니다
        </p>
      )}
    </div>
  );
}
