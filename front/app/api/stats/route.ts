import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { CONDITIONS, TASTE_TAGS } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({
    totalProducts: MOCK_PRODUCTS.length,
    totalConditions: CONDITIONS.length,
    totalTasteCategories: TASTE_TAGS.length,
    conditionList: CONDITIONS.map(c => c.id),
    tasteList: TASTE_TAGS.map(t => t.id),
  });
}
