'use client';

import { ArrowRight } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';

export function CTAButton() {
  const { query, conditions, tastes, setCurrentView } = useFilterStore();

  const conditionCount = conditions.size;
  const tasteCount = tastes.size;

  const handleClick = () => {
    console.log('안심 과자 찾아보기 클릭');
    console.log('선택 조건:', Array.from(conditions));
    console.log('선택 맛:', Array.from(tastes));
    console.log('CTA 클릭 query:', query);
    setCurrentView('results');
  };

  return (
    <section className="px-4 pt-6 pb-28">
      <button
        type="button"
        onClick={handleClick}
        className="w-full rounded-[32px] bg-primary px-6 py-5 text-white shadow-md transition hover:opacity-95"
      >
        <div className="flex items-center justify-center gap-3 text-xl font-bold">
          <span>안심 과자 찾아보기</span>
          <ArrowRight className="h-6 w-6" />
        </div>
      </button>

      <p className="mt-4 text-center text-sm text-text-2">
        {conditionCount}개 질환 · {tasteCount}개 맛 조건으로 검색합니다
      </p>
    </section>
  );
}