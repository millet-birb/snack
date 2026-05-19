'use client';

import { useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

type Mode = 'A' | 'B' | 'C' | null;

const ALL_CONDITIONS = [
  '알레르기', '아토피', '천식', '유당불내증',
  '아나필락시스', '소아비만', '소아당뇨', '카페인주의',
] as const;

type Condition = typeof ALL_CONDITIONS[number];

interface DiseaseGroups {
  [key: string]: number;
}

interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  subtotal: number;
  groupLabel: string;
  imageUrl?: string;
}

interface Warning {
  type: string;
  message?: string;
  productName?: string;
  warnFor?: string[];
  warnIngredients?: Record<string, string[]>;
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

export function GroupPurchaseScreen() {
  const { setCurrentView } = useFilterStore();

  // STEP 1 상태
  const [totalPeople, setTotalPeople] = useState<number>(0);
  const [diseaseGroups, setDiseaseGroups] = useState<DiseaseGroups>({});
  const [budget, setBudget] = useState<number>(0);

  // STEP 2 상태
  const [mode, setMode] = useState<Mode>(null);

  // 결과 상태
  const [products, setProducts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [budgetExceeded, setBudgetExceeded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [relaxed, setRelaxed] = useState<boolean>(false);

  // C모드 추가 상태
  const [perPerson, setPerPerson] = useState<number>(1);

  // 정상 인원 계산
  const normalCount = Math.max(
    0,
    totalPeople - Object.values(diseaseGroups).reduce((a, b) => a + b, 0)
  );

  const handleDiseaseChange = (condition: Condition, value: number) => {
    setDiseaseGroups((prev) => ({ ...prev, [condition]: value }));
  };

  // ── API 호출 ──

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const callModeA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/group/mode-a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupInfo: { totalPeople, diseaseGroups },
          tastes: [],
          budget,
        }),
      });
      const data = await res.json();
      setProducts(data.products || []);
      setRelaxed(data.relaxed || false);
    } finally {
      setLoading(false);
    }
  };

  const callModeB = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/group/mode-b`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupInfo: { totalPeople, diseaseGroups },
          tastes: [],
          budget,
        }),
      });
      const data = await res.json();
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  };

  const callModeC = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/group/mode-c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupInfo: { totalPeople, diseaseGroups },
          tastes: [],
          budget,
          perPerson,
          pinnedIds: [],
        }),
      });
      const data = await res.json();
      setCart(data.cart || []);
      setWarnings(data.warnings || []);
      setTotalPrice(data.totalPrice || 0);
      setRemainingBudget(data.remainingBudget || 0);
      setBudgetExceeded(data.budgetExceeded || false);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = (selected: Mode) => {
    setMode(selected);
    setProducts([]);
    setGroups([]);
    setCart([]);
    setWarnings([]);
    if (selected === 'A') callModeA();
    if (selected === 'B') callModeB();
    if (selected === 'C') callModeC();
  };

  // A/B 모드 장바구니에 담기
  const addToCart = (product: any, quantity: number, groupLabel: string) => {
    const existing = cart.find((c) => c.id === product.id && c.groupLabel === groupLabel);
    if (existing) return;

    const item: CartItem = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
      groupLabel,
      imageUrl: product.imageUrl,
    };
    const newCart = [...cart, item];
    setCart(newCart);
    const newTotal = newCart.reduce((sum, c) => sum + c.subtotal, 0);
    setTotalPrice(newTotal);
    setRemainingBudget(budget - newTotal);
    setBudgetExceeded(newTotal > budget);
  };

  const removeFromCart = (id: string, groupLabel: string) => {
    const newCart = cart.filter((c) => !(c.id === id && c.groupLabel === groupLabel));
    setCart(newCart);
    const newTotal = newCart.reduce((sum, c) => sum + c.subtotal, 0);
    setTotalPrice(newTotal);
    setRemainingBudget(budget - newTotal);
    setBudgetExceeded(newTotal > budget);
  };

  // ─────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FFF8F3] px-4 py-6">

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setCurrentView('home')}
          className="text-sm text-gray-500"
        >
          ← 홈
        </button>
        <h1 className="text-xl font-bold text-[#D9472E]">🛒 우리 반 간식 고르기</h1>
      </div>

      {/* ── STEP 1. 그룹 설정 ── */}
      <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-base mb-4">STEP 1. 그룹 설정</h2>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-1 block">총 아동 수</label>
          <input
            type="number"
            min={1}
            value={totalPeople || ''}
            onChange={(e) => setTotalPeople(Number(e.target.value))}
            placeholder="예) 20"
            className="border rounded-lg px-3 py-2 w-full text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            질환별 아동 수 <span className="text-xs text-gray-400">(입력 안 하면 질환 없음으로 처리)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_CONDITIONS.map((cond) => (
              <div key={cond} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20 shrink-0">{cond}</span>
                <input
                  type="number"
                  min={0}
                  value={diseaseGroups[cond] || ''}
                  onChange={(e) => handleDiseaseChange(cond, Number(e.target.value))}
                  placeholder="0"
                  className="border rounded-lg px-2 py-1 w-full text-sm"
                />
                <span className="text-xs text-gray-400">명</span>
              </div>
            ))}
          </div>
          {totalPeople > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              질환 없음: {normalCount}명 자동 계산
            </p>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">총 예산</label>
          <input
            type="number"
            min={0}
            value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="예) 50000"
            className="border rounded-lg px-3 py-2 w-full text-sm"
          />
        </div>
      </section>

      {/* ── STEP 2. 구매 방식 선택 ── */}
      {totalPeople > 0 && budget > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-4">STEP 2. 구매 방식 선택</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'A', label: '전원 함께', desc: '모두 먹을 수 있는 과자' },
              { id: 'B', label: '질환별 따로', desc: '그룹별 다른 과자' },
              { id: 'C', label: '자동 추천', desc: '예산 맞춰 자동으로' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeSelect(m.id as Mode)}
                className={`rounded-xl p-3 text-left border-2 transition-all ${
                  mode === m.id
                    ? 'border-[#D9472E] bg-[#FFF0ED]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="font-bold text-sm">{m.label}</div>
                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* C모드 추가 입력 */}
          {mode === 'C' && (
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-gray-600">1인당 과자 수</label>
              <input
                type="number"
                min={1}
                value={perPerson}
                onChange={(e) => setPerPerson(Number(e.target.value))}
                className="border rounded-lg px-2 py-1 w-16 text-sm"
              />
              <span className="text-sm text-gray-400">개</span>
              <button
                onClick={callModeC}
                className="ml-auto bg-[#D9472E] text-white rounded-lg px-3 py-1 text-sm"
              >
                다시 추천
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">추천 중...</div>
      )}

      {/* ── A모드 과자 리스트 ── */}
      {!loading && mode === 'A' && products.length > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-1">전원이 먹을 수 있는 과자</h2>
          {relaxed && (
            <p className="text-xs text-orange-500 mb-3">
              ⚠️ 조건에 맞는 과자가 없어 맛 조건을 완화했어요
            </p>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.brand} · {p.price?.toLocaleString()}원</div>
                </div>
                <button
                  onClick={() => addToCart(p, totalPeople, '전원')}
                  className="text-xs bg-[#D9472E] text-white rounded-lg px-3 py-1"
                >
                  담기
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── B모드 그룹별 리스트 ── */}
      {!loading && mode === 'B' && groups.length > 0 && (
        <section className="space-y-3 mb-4">
          {groups.map((group) => (
            <div key={group.groupId} className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-2">👥 {group.label}</h3>
              {group.noResult ? (
                <p className="text-xs text-orange-500">
                  ⚠️ 조건에 맞는 과자가 없어요. 조건을 완화하시겠어요?
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {group.products.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.brand} · {p.price?.toLocaleString()}원</div>
                      </div>
                      <button
                        onClick={() => addToCart(p, group.count, group.label)}
                        className="text-xs bg-[#D9472E] text-white rounded-lg px-3 py-1"
                      >
                        담기
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ── C모드 자동 장바구니 ── */}
      {!loading && mode === 'C' && cart.length > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-3">🤖 자동 추천 장바구니</h2>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.groupLabel} · {item.quantity}개 · {item.subtotal?.toLocaleString()}원
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 장바구니 (A/B 모드) ── */}
      {(mode === 'A' || mode === 'B') && cart.length > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-3">🛒 장바구니</h2>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.groupLabel} · {item.quantity}개 · {item.subtotal?.toLocaleString()}원
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id, item.groupLabel)}
                  className="text-xs text-red-400"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 경고 ── */}
      {warnings.length > 0 && (
        <section className="bg-orange-50 rounded-2xl p-4 mb-4">
          {warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-orange-600 mb-1">
              ⚠️ {w.message || `${w.productName}이 일부 아동에게 주의가 필요해요 (${w.warnFor?.join(', ')})`}
            </p>
          ))}
        </section>
      )}

      {/* ── 견적 ── */}
      {(cart.length > 0 || (mode === 'C' && totalPrice > 0)) && (
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-base mb-4">💰 예상 견적</h2>

          {/* 예산 게이지 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>예산 사용</span>
              <span className={budgetExceeded ? 'text-red-500 font-bold' : ''}>
                {totalPrice.toLocaleString()}원 / {budget.toLocaleString()}원
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  budgetExceeded ? 'bg-red-500' : 'bg-[#D9472E]'
                }`}
                style={{ width: `${Math.min((totalPrice / budget) * 100, 100)}%` }}
              />
            </div>
            {budgetExceeded && (
              <p className="text-xs text-red-500 mt-1">⚠️ 예산을 초과했어요!</p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">총 상품 금액</span>
              <span className="font-medium">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">잔여 예산</span>
              <span className={`font-medium ${remainingBudget < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {remainingBudget.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>배송비</span>
              <span>별도</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
