'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { CONDITIONS, ALLERGY_SUB_CONDITIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function ConditionGrid() {
  const { conditions, toggleCondition } = useFilterStore();
  const [allergyExpanded, setAllergyExpanded] = useState(false);

  // 선택된 알레르기 세부 항목 수
  const selectedAllergyCount = ALLERGY_SUB_CONDITIONS.filter(
    (sub) => conditions.has(sub.id as any)
  ).length;

  return (
    <section className="px-4 py-6">
      <h3 className="font-display text-lg text-text mb-4">
        아이의 질환을 선택하세요
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {CONDITIONS.map((condition, index) => {
          const isSelected = conditions.has(condition.id);
          const isAllergy = condition.id === '알레르기';

          return (
            <div key={condition.id} className={isAllergy ? 'col-span-2' : ''}>
              {/* 메인 카드 */}
              <button
                onClick={() => {
                  if (isAllergy) {
                    setAllergyExpanded((prev) => !prev);
                  } else {
                    toggleCondition(condition.id);
                  }
                }}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left animate-slide-up w-full',
                  isAllergy
                    ? selectedAllergyCount > 0
                      ? 'border-primary bg-primary-lt shadow-sm'
                      : 'border-transparent bg-card shadow-xs hover:shadow-sm'
                    : isSelected
                    ? 'border-primary bg-primary-lt shadow-sm'
                    : 'border-transparent bg-card shadow-xs hover:shadow-sm'
                )}
                style={{
                  animationDelay: `${0.05 * (index + 1)}s`,
                  backgroundColor:
                    (isAllergy && selectedAllergyCount > 0) || (!isAllergy && isSelected)
                      ? undefined
                      : condition.bgColor,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={condition.label}>
                      {condition.icon}
                    </span>
                    <div>
                      <span className="font-semibold text-[13px] text-text block">
                        {condition.label}
                      </span>
                      <span className="text-[10px] text-text-2 leading-tight">
                        {isAllergy && selectedAllergyCount > 0
                          ? `${selectedAllergyCount}개 선택됨`
                          : condition.description}
                      </span>
                    </div>
                  </div>

                  {isAllergy && (
                    <div className="text-text-3">
                      {allergyExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>

                {/* 알레르기 아닌 카드 체크 표시 */}
                {!isAllergy && isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              {/* 알레르기 세부 항목 펼치기 */}
              {isAllergy && allergyExpanded && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-border-soft shadow-xs">
                  <p className="text-xs text-text-2 mb-3">해당되는 알레르기를 선택하세요 (중복 선택 가능)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ALLERGY_SUB_CONDITIONS.map((sub) => {
                      const isSubSelected = conditions.has(sub.id as any);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => toggleCondition(sub.id as any)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center',
                            isSubSelected
                              ? 'border-primary bg-primary-lt'
                              : 'border-transparent bg-gray-50 hover:bg-gray-100'
                          )}
                        >
                          <span className="text-lg">{sub.emoji}</span>
                          <span className="text-[10px] text-text font-medium leading-tight">
                            {sub.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 전체 선택 / 전체 해제 */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => ALLERGY_SUB_CONDITIONS.forEach((sub) => {
                        if (!conditions.has(sub.id as any)) toggleCondition(sub.id as any);
                      })}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-white"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={() => ALLERGY_SUB_CONDITIONS.forEach((sub) => {
                        if (conditions.has(sub.id as any)) toggleCondition(sub.id as any);
                      })}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-border-soft text-text-2"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
