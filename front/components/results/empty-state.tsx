'use client';

import { useFilterStore } from '@/lib/filter-store';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  const { clearFilters, goBack } = useFilterStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-6xl mb-4" role="img" aria-label="sad face">
        {"😔"}
      </span>
      <h3 className="font-display text-xl text-text mb-2">
        조건에 맞는 과자가 없어요
      </h3>
      <p className="text-sm text-text-2 mb-6 max-w-[240px]">
        조건을 줄이거나 예산을 늘려보세요
      </p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={goBack}
          className="rounded-full"
        >
          조건 수정하기
        </Button>
        <Button
          onClick={clearFilters}
          className="rounded-full bg-primary hover:bg-primary-dk"
        >
          필터 초기화
        </Button>
      </div>
    </div>
  );
}
