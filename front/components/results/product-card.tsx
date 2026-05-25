'use client';

import { useFilterStore } from '@/lib/filter-store';
import type { Product } from '@/lib/types';
import { scoreToGrade } from '@/lib/grade';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { setSelectedProduct, setCurrentView } = useFilterStore();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const gradeScore = product.safeSnackScore ?? product.nutritionScore;
  const grade = scoreToGrade(gradeScore);

  const handleClick = () => {
    setSelectedProduct(product);
    setCurrentView('detail');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex flex-col w-full bg-card rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all text-left animate-slide-up',
        'border border-border-soft hover:border-primary/30'
      )}
      style={{ animationDelay: `${0.03 * index}s` }}
    >
      <div className="relative aspect-[4/3] bg-secondary flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl opacity-60" role="img" aria-label="snack">
            🍪
          </span>
        )}

        <div
          className={cn(
            'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm',
            grade.bgClass
          )}
        >
          ✓
        </div>
      </div>

      <div className="p-2 flex-1 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-text-3 font-medium">
          {product.brand}
        </span>

        <h3 className="text-[13px] font-semibold text-text mt-0.5 line-clamp-2 leading-tight min-h-[30px]">
          {product.name}
        </h3>

        <div className={cn('text-[11px] font-medium mt-1', grade.accentClass)}>
          {grade.label} ({grade.description})
        </div>

        <div className="font-serif-display text-[22px] text-primary mt-1">
          {formatPrice(product.price)}원
        </div>
      </div>
    </button>
  );
}
