'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import type { Product } from '@/lib/types';
import { ResultsHeader } from '@/components/results/results-header';
import { FilterTagBar } from '@/components/results/filter-tag-bar';
import { ProductCard } from '@/components/results/product-card';
import { EmptyState } from '@/components/results/empty-state';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export function ResultsScreen() {
  const { conditions, tastes, budget, query, sort, resultsPage: page, setResultsPage: setPage } =
    useFilterStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const didMountCriteria = useRef(false);

  const conditionList = useMemo(() => Array.from(conditions ?? []), [conditions]);
  const tasteList = useMemo(() => Array.from(tastes ?? []), [tastes]);

  useEffect(() => {
    if (!didMountCriteria.current) {
      didMountCriteria.current = true;
      return;
    }

    setPage(1);
  }, [conditionList, tasteList, budget, query, sort, setPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

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
          sort: sort ?? 'price_asc',
          page: String(page),
          per_page: '20',
        });

        const requestUrl = `${BACKEND_URL}/api/products?${params.toString()}`;
        const res = await fetch(requestUrl);

        if (!res.ok) {
          throw new Error(`API 요청 실패: ${res.status}`);
        }

        const data = await res.json();

        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        console.error(err);
        setError('제품 목록을 불러오지 못했습니다.');
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [conditionList, tasteList, budget, query, sort, page]);

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
        <>
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-4 pb-8 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
                className="rounded-full border border-border-soft px-4 py-2 text-sm disabled:opacity-40"
              >
                이전
              </button>

              <span className="text-sm text-text-2">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                className="rounded-full border border-border-soft px-4 py-2 text-sm disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
