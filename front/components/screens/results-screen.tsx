'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import type { Product } from '@/lib/types';
import { ResultsHeader } from '@/components/results/results-header';
import { FilterTagBar } from '@/components/results/filter-tag-bar';
import { ProductCard } from '@/components/results/product-card';
import { EmptyState } from '@/components/results/empty-state';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export function ResultsScreen() {
  const { conditions, tastes, budget, query, sort } = useFilterStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const conditionList = useMemo(() => Array.from(conditions ?? []), [conditions]);
  const tasteList = useMemo(() => Array.from(tastes ?? []), [tastes]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          conditions: conditionList.join(','),
          tastes: tasteList.join(','),
          budget: String(budget ?? 20000),
          query: query ?? '',
          sort: sort ?? 'score_desc',
          page: '1',
          per_page: '20',
        });

        const res = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`API 요청 실패: ${res.status}`);
        }

        const data = await res.json();
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error(err);
        setError('제품 목록을 불러오지 못했습니다.');
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [conditionList, tasteList, budget, query, sort]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <ResultsHeader totalCount={total} />
      <FilterTagBar />

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-text-2">
          제품 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-red-500">
          {error}
        </div>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}