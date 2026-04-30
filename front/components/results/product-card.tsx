'use client';

import { useFilterStore } from '@/lib/filter-store';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { setSelectedProduct, setCurrentView, conditions } = useFilterStore();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const selectedConditionsArray = Array.from(conditions);
  const hasWarnings = selectedConditionsArray.some((c) => product.warnFor.includes(c));
  const isSafe = selectedConditionsArray.length > 0 && !hasWarnings;

  const handleClick = () => {
    setSelectedProduct(product);
    setCurrentView('detail');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex flex-col bg-card rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all text-left animate-slide-up',
        'border border-border-soft hover:border-primary/30'
      )}
      style={{ animationDelay: `${0.03 * index}s` }}
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl opacity-60" role="img" aria-label="snack">
            🍪
          </span>
        )}

        {conditions.size > 0 && (
          <div
            className={cn(
              'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
              isSafe ? 'bg-safe' : 'bg-warn'
            )}
          >
            {isSafe ? '✓' : '!'}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-text-3 font-medium">
          {product.brand}
        </span>

        <h3 className="text-[13px] font-semibold text-text mt-0.5 line-clamp-2 leading-tight min-h-[36px]">
          {product.name}
        </h3>

        <div className="font-serif-display text-[24px] text-primary mt-3">
          {formatPrice(product.price)}원
        </div>
      </div>
    </button>
  );
}