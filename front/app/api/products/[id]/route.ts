import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const product = MOCK_PRODUCTS.find(p => p.id === id);

  if (!product) {
    return NextResponse.json(
      { error: 'product_not_found', message: '해당 제품을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  return NextResponse.json(product);
}
