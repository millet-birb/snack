'use client';

import type { Product } from '@/lib/types';

interface NutritionGridProps {
  product: Product;
}

export function NutritionGrid({ product }: NutritionGridProps) {
  const { nutrition, servingG } = product;

  const items = [
    { label: '열량', value: nutrition.caloriesKcal, unit: 'kcal' },
    { label: '당류', value: nutrition.sugarG, unit: 'g' },
    { label: '지방', value: nutrition.fatG, unit: 'g' },
    { label: '단백질', value: nutrition.proteinG, unit: 'g' },
    { label: '나트륨', value: nutrition.sodiumMg, unit: 'mg' },
    { label: '칼슘', value: nutrition.calciumMg, unit: 'mg' },
    { label: '포화지방산', value: nutrition.saturatedFatG, unit: 'g' },
    { label: '트랜스지방', value: nutrition.transFatG, unit: 'g' },
    { label: '콜레스테롤', value: nutrition.cholesterolMg, unit: 'mg' },
    { label: '식이섬유', value: nutrition.fiberG, unit: 'g' },
    { label: '탄수화물', value: nutrition.carbsG, unit: 'g' },
    { label: '철', value: nutrition.ironMg, unit: 'mg' },
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base text-text">영양 성분</h3>
        <span className="text-xs text-text-3">1회 제공량 ({servingG}g) 기준</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div 
            key={item.label}
            className="bg-secondary rounded-lg p-3 text-center"
          >
            <div className="text-[10px] text-text-3 mb-1">{item.label}</div>
            <div className="font-serif-display text-lg text-text">
              {item.value}
              <span className="text-xs text-text-2 ml-0.5">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
