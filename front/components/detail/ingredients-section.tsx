'use client';

import type { Product, Condition } from '@/lib/types';
import { RISK_KEYWORDS } from '@/lib/constants';
import { useFilterStore } from '@/lib/filter-store';
import { Fragment, useMemo } from 'react';

interface IngredientsSectionProps {
  product: Product;
}

// 정규식에 그대로 넣었을 때 의미를 갖는 문자를 escape.
// 키워드에 '(', '[', '.' 등이 들어와도 정확히 그 글자만 매칭하도록 보장한다.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function IngredientsSection({ product }: IngredientsSectionProps) {
  const { conditions } = useFilterStore();

  const riskKeywords = useMemo(() => {
    const keywords = new Set<string>();
    conditions.forEach((condition: Condition) => {
      const risks = RISK_KEYWORDS[condition] || [];
      risks.forEach((keyword) => keywords.add(keyword));
    });
    return keywords;
  }, [conditions]);

  // 원재료명 문자열을 React 노드 배열로 변환한다.
  // dangerouslySetInnerHTML 을 쓰면 백엔드/CSV 의 데이터에 HTML 태그가 들어왔을 때
  // 그대로 실행되어 XSS 위험. React 가 자동 escape 하도록 split 으로 잘라 렌더한다.
  const ingredientNodes = useMemo(() => {
    const text = product.ingredientsRaw ?? '';
    if (riskKeywords.size === 0 || text.length === 0) {
      return [text];
    }

    const pattern = Array.from(riskKeywords)
      .sort((a, b) => b.length - a.length) // 긴 키워드를 우선 매칭
      .map(escapeRegExp)
      .join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    // split 의 캡처 그룹은 결과 배열의 홀수 인덱스에 매치된 텍스트로 들어온다.
    const parts = text.split(regex);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="hl">{part}</mark>
        : <Fragment key={i}>{part}</Fragment>
    );
  }, [product.ingredientsRaw, riskKeywords]);

  return (
    <div className="px-4 py-4">
      <h3 className="font-display text-base text-text mb-3">원재료명</h3>
      <div className="bg-secondary rounded-lg p-4">
        <p className="text-sm text-text-2 leading-relaxed">
          {ingredientNodes}
        </p>
      </div>
      {riskKeywords.size > 0 && (
        <p className="text-xs text-text-3 mt-2">
          * 선택한 질환의 위험 성분은 <span className="hl">하이라이트</span>로 표시됩니다
        </p>
      )}
    </div>
  );
}
