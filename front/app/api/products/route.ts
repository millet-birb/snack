import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PRODUCTS, filterProducts, sortProducts } from '@/lib/mock-data';
import type { Condition, TasteTag, SortOption } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const conditionsParam = searchParams.get('conditions') || '';
  const tastesParam = searchParams.get('tastes') || '';
  const budgetParam = searchParams.get('budget') || '20000';
  const queryParam = searchParams.get('query') || '';
  const sortParam = (searchParams.get('sort') || 'score_desc') as SortOption;
  const pageParam = searchParams.get('page') || '1';
  const perPageParam = searchParams.get('per_page') || '20';

  // Parse conditions and tastes
  const conditions = new Set<Condition>(
    conditionsParam ? (conditionsParam.split(',') as Condition[]) : []
  );
  const tastes = new Set<TasteTag>(
    tastesParam ? (tastesParam.split(',') as TasteTag[]) : []
  );
  const budget = parseInt(budgetParam, 10);
  const page = parseInt(pageParam, 10);
  const perPage = Math.min(parseInt(perPageParam, 10), 50);

  // Filter and sort products
  const filtered = filterProducts(MOCK_PRODUCTS, conditions, tastes, budget, queryParam);
  const sorted = sortProducts(filtered, sortParam);

  // Paginate
  const startIndex = (page - 1) * perPage;
  const paginatedProducts = sorted.slice(startIndex, startIndex + perPage);

  return NextResponse.json({
    total: sorted.length,
    page,
    perPage,
    totalPages: Math.ceil(sorted.length / perPage),
    products: paginatedProducts,
  });
}
