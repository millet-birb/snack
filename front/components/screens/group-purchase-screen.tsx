'use client';

import { useState, useCallback } from 'react';
import { useFilterStore } from '@/lib/filter-store';

type Mode = 'A' | 'B' | 'C' | null;

const ALL_CONDITIONS = [
  { id: '아토피',      label: '아토피 피부염', emoji: '🌿', bgColor: '#FFF5E0' },
  { id: '천식',        label: '소아천식',      emoji: '💨', bgColor: '#E8F3FF' },
  { id: '유당불내증',  label: '유당불내증',    emoji: '🥛', bgColor: '#EEFFF0' },
  { id: '아나필락시스',label: '아나필락시스',  emoji: '⚠️', bgColor: '#FFE8F0' },
  { id: '소아비만',    label: '소아비만',      emoji: '⚖️', bgColor: '#F0F5FF' },
  { id: '소아당뇨',    label: '소아당뇨',      emoji: '🩸', bgColor: '#FFFAE5' },
  { id: '카페인주의',  label: '카페인 과민',   emoji: '☕', bgColor: '#F5EEFF' },
] as const;

type Condition = typeof ALL_CONDITIONS[number]['id'];

// 알레르기 세부 항목 19종
const ALLERGY_SUB_CONDITIONS = [
  { id: '알레르기_밀',       label: '밀/글루텐', emoji: '🌾' },
  { id: '알레르기_메밀',     label: '메밀',      emoji: '🌿' },
  { id: '알레르기_대두',     label: '대두/콩',   emoji: '🫘' },
  { id: '알레르기_복숭아',   label: '복숭아',    emoji: '🍑' },
  { id: '알레르기_귤오렌지', label: '귤/오렌지', emoji: '🍊' },
  { id: '알레르기_토마토',   label: '토마토',    emoji: '🍅' },
  { id: '알레르기_돼지고기', label: '돼지고기',  emoji: '🥩' },
  { id: '알레르기_닭고기',   label: '닭고기',    emoji: '🍗' },
  { id: '알레르기_계란',     label: '계란',      emoji: '🥚' },
  { id: '알레르기_우유',     label: '유제품',    emoji: '🥛' },
  { id: '알레르기_고등어',   label: '고등어',    emoji: '🐟' },
  { id: '알레르기_게',       label: '게',        emoji: '🦀' },
  { id: '알레르기_조개',     label: '조개류',    emoji: '🦪' },
  { id: '알레르기_새우',     label: '새우',      emoji: '🦐' },
  { id: '알레르기_오징어',   label: '오징어',    emoji: '🦑' },
  { id: '알레르기_땅콩',     label: '땅콩',      emoji: '🥜' },
  { id: '알레르기_호두',     label: '호두',      emoji: '🌰' },
  { id: '알레르기_잣',       label: '잣',        emoji: '🫙' },
  { id: '알레르기_아황산',   label: '아황산류',  emoji: '💨' },
] as const;

interface DiseaseGroups {
  [key: string]: number;
}

interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;       // 박스(상품) 수
  itemCount?: number | null;  // 한 박스 안 낱개 수 (멀티팩이면 30 등)
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

export function GroupPurchaseScreen() {
  const { setCurrentView } = useFilterStore();

  const [totalPeople, setTotalPeople] = useState<number>(0);
  const [diseaseGroups, setDiseaseGroups] = useState<DiseaseGroups>({});
  const [budget, setBudget] = useState<number>(0);
  const [mode, setMode] = useState<Mode>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [budgetExceeded, setBudgetExceeded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [relaxed, setRelaxed] = useState<boolean>(false);

  const [perPerson, setPerPerson] = useState<number>(1);
  const [cModeOption, setCModeOption] = useState<'same' | 'different'>('same');
  const [pinnedItems, setPinnedItems] = useState<CartItem[]>([]);

  // 알레르기 관련 상태
  const [allergyCount, setAllergyCount] = useState<number>(0);
  const [allergyExpanded, setAllergyExpanded] = useState<boolean>(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  const normalCount = Math.max(
    0,
    totalPeople - Object.values(diseaseGroups).reduce((a, b) => a + b, 0) - allergyCount
  );

  // 백엔드로 넘길 diseaseGroups 생성
  const buildDiseaseGroups = () => {
    const result: DiseaseGroups = { ...diseaseGroups };
    // 알레르기는 allergyCount 하나로 묶어서 넘김
    // 세부 알레르기는 별도 파라미터로 넘김
    if (allergyCount > 0) {
      result['알레르기'] = allergyCount;
    }
    return result;
  };

  const handleDiseaseChange = (condition: Condition, value: number) => {
    setDiseaseGroups((prev) => ({ ...prev, [condition]: value }));
  };

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

  const recalcCart = (newCart: CartItem[]) => {
    const newTotal = newCart.reduce((sum, c) => sum + c.subtotal, 0);
    setCart(newCart);
    setTotalPrice(newTotal);
    setRemainingBudget(budget - newTotal);
    setBudgetExceeded(newTotal > budget);
  };

  const callModeA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/group/mode-a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupInfo: { totalPeople, diseaseGroups: buildDiseaseGroups() }, tastes: [], budget, allergyConditions: selectedAllergies }),
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
        body: JSON.stringify({ groupInfo: { totalPeople, diseaseGroups: buildDiseaseGroups() }, tastes: [], budget, allergyConditions: selectedAllergies }),
      });
      const data = await res.json();
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  };

  const callModeC = async (currentPinnedItems?: CartItem[], currentSameSnack?: boolean) => {
    const pinned = currentPinnedItems ?? pinnedItems;
    const sameSnack = currentSameSnack !== undefined ? currentSameSnack : cModeOption === 'same';
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/group/mode-c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupInfo: { totalPeople, diseaseGroups: buildDiseaseGroups() },
          tastes: [],
          budget,
          perPerson,
          allergyConditions: selectedAllergies,
          pinnedIds: pinned.map((item) => item.id),
          pinnedGroups: [...new Set(pinned.map((item) => item.groupLabel))],  // 전체 groupLabel 넘기기
          pinnedGroupCounts: pinned.reduce((acc: Record<string, number>, item) => {
            acc[item.groupLabel] = (acc[item.groupLabel] || 0) + 1;
            return acc;
          }, {}),  // 그룹별 핀된 개수
          sameSnack: sameSnack,
        }),
      });
      const data = await res.json();
      const backendItems = (data.cart || []).filter(
        (c: CartItem) => !pinned.find((p) => p.id === c.id)
      );
      const merged = [...pinned, ...backendItems];
      recalcCart(merged);
      setWarnings(data.warnings || []);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = (selected: Mode) => {
    // 모드 바꾸면 핀 초기화 먼저
    setPinnedItems([]);
    setMode(selected);
    setProducts([]);
    setGroups([]);
    setCart([]);
    setWarnings([]);
    setTotalPrice(0);
    setRemainingBudget(0);
    setBudgetExceeded(false);

    if (selected === 'A') callModeA();
    if (selected === 'B') callModeB();
    if (selected === 'C') callModeC([]);  // 빈 핀으로 시작
  };

  const updateQuantity = (id: string, groupLabel: string, delta: number) => {
    const newCart = cart.map((c) => {
      if (c.id === id && c.groupLabel === groupLabel) {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty, subtotal: c.price * newQty };
      }
      return c;
    });
    recalcCart(newCart);
  };

  const setQuantityDirect = (id: string, groupLabel: string, value: number) => {
    const newQty = Math.max(1, value);
    const newCart = cart.map((c) => {
      if (c.id === id && c.groupLabel === groupLabel) {
        return { ...c, quantity: newQty, subtotal: c.price * newQty };
      }
      return c;
    });
    recalcCart(newCart);
  };

  const addToCart = (product: any, quantity: number, groupLabel: string) => {
    const existing = cart.find((c) => c.id === product.id && c.groupLabel === groupLabel);
    if (existing) return;
    const item: CartItem = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      quantity,
      itemCount: product.itemCount,
      subtotal: product.price * quantity,
      groupLabel,
      imageUrl: product.imageUrl,
    };
    recalcCart([...cart, item]);
  };

  const removeFromCart = (id: string, groupLabel: string) => {
    recalcCart(cart.filter((c) => !(c.id === id && c.groupLabel === groupLabel)));
  };

  const togglePin = (item: CartItem) => {
    const isPinned = pinnedItems.some((p) => p.id === item.id);
    if (isPinned) {
      setPinnedItems(pinnedItems.filter((p) => p.id !== item.id));
    } else {
      setPinnedItems([...pinnedItems, item]);
    }
  };

  const QuantityControl = ({ item }: { item: CartItem }) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => updateQuantity(item.id, item.groupLabel, -1)}
        className="w-6 h-6 rounded-full border text-sm flex items-center justify-center"
      >－</button>
      <input
        type="number" min={1} value={item.quantity}
        onChange={(e) => setQuantityDirect(item.id, item.groupLabel, Number(e.target.value))}
        className="w-10 text-center text-sm border rounded-lg py-0.5"
      />
      <button
        onClick={() => updateQuantity(item.id, item.groupLabel, 1)}
        className="w-6 h-6 rounded-full border text-sm flex items-center justify-center"
      >＋</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8F3] px-4 py-6">

      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setCurrentView('home')} className="text-sm text-gray-500">← 홈</button>
        <h1 className="text-xl font-bold text-[#D9472E]">🛒 우리 반 간식 고르기</h1>
      </div>

      {/* STEP 1 */}
      <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-base mb-4">STEP 1. 그룹 설정</h2>
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-1 block">총 아동 수</label>
          <input
            type="number" min={1} value={totalPeople || ''}
            onChange={(e) => setTotalPeople(Number(e.target.value))}
            placeholder="예) 20" className="border rounded-lg px-3 py-2 w-full text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">💡 최대 1,000명까지 입력 가능해요</p>
        </div>
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            질환별 아동 수 <span className="text-xs text-gray-400">(입력 안 하면 질환 없음으로 처리)</span>
          </label>

          {/* 알레르기 별도 섹션 */}
          <div className="mb-3 border rounded-xl overflow-hidden">
            <button
              onClick={() => setAllergyExpanded(!allergyExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 shrink-0 w-20 break-keep">🤧 알레르기</span>
                {selectedAllergies.length > 0 && (
                  <span className="text-xs text-[#D9472E]">{selectedAllergies.length}종 선택</span>
                )}
              </div>
              <span className="text-gray-400 text-xs">{allergyExpanded ? '▲' : '▼'}</span>
            </button>

            {allergyExpanded && (
              <div className="px-3 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-gray-600">알레르기 아동 수</label>
                  <input
                    type="number" min={0} value={allergyCount || ''}
                    onChange={(e) => setAllergyCount(Number(e.target.value))}
                    placeholder="0"
                    className="border rounded-lg px-2 py-1 w-16 text-sm"
                  />
                  <span className="text-xs text-gray-400">명</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">피해야 할 알레르기 선택 (다중 선택 가능)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ALLERGY_SUB_CONDITIONS.map((sub) => {
                    const isSelected = selectedAllergies.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAllergies(selectedAllergies.filter((id) => id !== sub.id));
                          } else {
                            setSelectedAllergies([...selectedAllergies, sub.id]);
                          }
                        }}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-center transition-all ${
                          isSelected ? 'border-[#D9472E] bg-[#FFF0ED]' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{sub.emoji}</span>
                        <span className="text-[9px] text-gray-600 leading-tight">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setSelectedAllergies(ALLERGY_SUB_CONDITIONS.map((s) => s.id))}
                    className="flex-1 text-xs py-1 rounded-lg bg-[#D9472E] text-white"
                  >전체 선택</button>
                  <button
                    onClick={() => setSelectedAllergies([])}
                    className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500"
                  >전체 해제</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ALL_CONDITIONS.map((cond) => (
              <div
                key={cond.id}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: cond.bgColor }}
              >
                <span className="text-lg">{cond.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 shrink-0 w-20 break-keep">{cond.label}</span>
                <input
                  type="number" min={0} value={diseaseGroups[cond.id] || ''}
                  onChange={(e) => handleDiseaseChange(cond.id, Number(e.target.value))}
                  placeholder="0" className="border rounded-lg px-2 py-1 w-full text-sm bg-white"
                />
                <span className="text-xs text-gray-400">명</span>
              </div>
            ))}
          </div>
          {totalPeople > 0 && (
            <p className="text-xs text-gray-400 mt-2">질환 없음: {normalCount}명 자동 계산</p>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">총 예산</label>
          <input
            type="number" min={0} value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="예) 50,000" className="border rounded-lg px-3 py-2 w-full text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">💡 최대 500만원까지 입력 가능해요</p>
        </div>
      </section>

      {/* STEP 2 */}
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
                  mode === m.id ? 'border-[#D9472E] bg-[#FFF0ED]' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="font-bold text-sm">{m.label}</div>
                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          {mode === 'C' && (
            <div className="mt-4 space-y-3">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  onClick={() => {
                    setCModeOption('same');
                    setPinnedItems([]);
                    callModeC([], true);
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    cModeOption === 'same' ? 'bg-[#D9472E] text-white' : 'bg-white text-gray-500'
                  }`}
                >
                  같은 걸 먹을래요
                </button>
                <button
                  onClick={() => {
                    setCModeOption('different');
                    setPinnedItems([]);
                    callModeC([], false);
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    cModeOption === 'different' ? 'bg-[#D9472E] text-white' : 'bg-white text-gray-500'
                  }`}
                >
                  다른 걸 먹을래요
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => callModeC()}
                  className="ml-auto bg-[#D9472E] text-white rounded-lg px-3 py-1 text-sm"
                >
                  다시 추천
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {loading && <div className="text-center py-8 text-gray-400 text-sm">추천 중...</div>}

      {/* A모드 과자 리스트 */}
      {!loading && mode === 'A' && products.length > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-1">전원이 먹을 수 있는 과자</h2>
          {relaxed && <p className="text-xs text-orange-500 mb-3">⚠️ 조건에 맞는 과자가 없어 맛 조건을 완화했어요</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((p) => {
              const inCart = cart.find((c) => c.id === p.id && c.groupLabel === '전원');
              return (
                <div key={p.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.brand} · {p.price?.toLocaleString()}원</div>
                  </div>
                  {inCart ? (
                    <QuantityControl item={inCart} />
                  ) : (
                    <button
                      onClick={() => addToCart(p, 1, '전원')}
                      className="text-xs bg-[#D9472E] text-white rounded-lg px-3 py-1"
                    >
                      담기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* B모드 그룹별 리스트 */}
      {!loading && mode === 'B' && groups.length > 0 && (
        <section className="space-y-3 mb-4">
          {groups.map((group) => (
            <div key={group.groupId} className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-2">👥 {group.label}</h3>
              {group.noResult ? (
                <p className="text-xs text-orange-500">⚠️ 조건에 맞는 과자가 없어요.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {group.products.map((p: any) => {
                    const inCart = cart.find((c) => c.id === p.id && c.groupLabel === group.label);
                    return (
                      <div key={p.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.brand} · {p.price?.toLocaleString()}원</div>
                        </div>
                        {inCart ? (
                          <QuantityControl item={inCart} />
                        ) : (
                          <button
                            onClick={() => addToCart(p, 1, group.label)}
                            className="text-xs bg-[#D9472E] text-white rounded-lg px-3 py-1"
                          >
                            담기
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* C모드 자동 장바구니 */}
      {!loading && mode === 'C' && cart.length > 0 && (
        <section className="space-y-3 mb-4">
          <div className="bg-white rounded-2xl px-5 pt-4 pb-2 shadow-sm">
            <h2 className="font-bold text-base mb-1">🤖 자동 추천 장바구니</h2>
            <p className="text-xs text-gray-400 mb-3">📌 누르면 다시 추천해도 고정돼요!</p>
            {/* 중복 배정 경고만 표시 */}
            {warnings.filter((w) => w.type === 'duplicate_snack').map((w, idx) => (
              <p key={idx} className="text-xs text-orange-500 mb-2">⚠️ {w.message}</p>
            ))}
          </div>
          {/* 그룹별로 묶어서 표시 */}
          {Array.from(new Set(cart.map((item) => item.groupLabel))).map((label) => {
            const groupItems = cart.filter((item) => item.groupLabel === label);
            return (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-[#D9472E] mb-2">👥 {label}</h3>
                <div className="space-y-2">
                  {groupItems.map((item, idx) => {
                    const isPinned = pinnedItems.some((p) => p.id === item.id);
                    return (
                      <div key={`${item.id}-${idx}`} className="flex items-center justify-between border rounded-xl px-3 py-2">
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-gray-400">
                            {item.itemCount && item.itemCount > 1
                              ? `${item.quantity}세트 × ${item.itemCount}개`
                              : `${item.quantity}개`}
                            {' · '}
                            {item.subtotal?.toLocaleString()}원
                          </div>
                        </div>
                        <button
                          onClick={() => togglePin(item)}
                          className={`text-lg transition-all ${isPinned ? 'opacity-100' : 'opacity-30'}`}
                        >
                          📌
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 장바구니 (A/B) */}
      {(mode === 'A' || mode === 'B') && cart.length > 0 && (
        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-base mb-3">🛒 장바구니</h2>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {mode === 'A' ? (
                      <>
                        {item.quantity}개
                        {item.itemCount && item.itemCount > 1
                          ? ` × ${item.itemCount}개입`
                          : ''}
                        {' · '}
                        {item.subtotal?.toLocaleString()}원
                      </>
                    ) : (
                      <>
                        {item.groupLabel}
                        {item.itemCount && item.itemCount > 1
                          ? ` · 1박스당 ${item.itemCount}개`
                          : ''}
                        {' · '}
                        {item.subtotal?.toLocaleString()}원
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <QuantityControl item={item} />
                  <button onClick={() => removeFromCart(item.id, item.groupLabel)} className="text-xs text-red-400 ml-1">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 견적 */}
      {(cart.length > 0 || (mode === 'C' && totalPrice > 0)) && (
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-base mb-4">💰 예상 견적</h2>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>예산 사용</span>
              <span className={budgetExceeded ? 'text-red-500 font-bold' : ''}>
                {totalPrice.toLocaleString()}원 / {budget.toLocaleString()}원
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${budgetExceeded ? 'bg-red-500' : 'bg-[#D9472E]'}`}
                style={{ width: `${Math.min((totalPrice / budget) * 100, 100)}%` }}
              />
            </div>
            {budgetExceeded && <p className="text-xs text-red-500 mt-1">⚠️ 예산을 초과했어요!</p>}
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
