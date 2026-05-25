// Condition types for filtering
export type AllergySubCondition =
  | '알레르기_밀'
  | '알레르기_메밀'
  | '알레르기_대두'
  | '알레르기_복숭아'
  | '알레르기_귤오렌지'
  | '알레르기_토마토'
  | '알레르기_돼지고기'
  | '알레르기_닭고기'
  | '알레르기_계란'
  | '알레르기_우유'
  | '알레르기_고등어'
  | '알레르기_게'
  | '알레르기_조개'
  | '알레르기_새우'
  | '알레르기_오징어'
  | '알레르기_땅콩'
  | '알레르기_호두'
  | '알레르기_잣'
  | '알레르기_아황산';

export type Condition =
  | '알레르기'
  | AllergySubCondition
  | '아토피'
  | '소아천식'
  | '유당불내증'
  | '아나필락시스'
  | '소아비만'
  | '소아당뇨'
  | '카페인';

// Taste categories
export type TasteTag = 
  | '달달' | '카라멜' | '초코' | '말차' | '커피'
  | '짭짤' | '버터갈릭' | '치즈' | '고소' | '매콤'
  | '바베큐' | '양파' | '와사비' | '새우' | '오징어'
  | '감자' | '고구마' | '옥수수' | '김' | '누룽지'
  | '딸기' | '바나나' | '복숭아' | '사과' | '파인애플'
  | '멜론' | '블루베리' | '귤감귤' | '요거트' | '게';

// Product interface
export interface Product {
  id: string;
  brand: string;
  name: string;
  foodType: string;
  price: number;
  pricePerUnit: number;
  servingG: number;
  foodWeight?: string;
  weightG?: number | null;
  itemCount?: number | null;
  nutritionScore: number;
  scorePerPrice: number;
  // 안심간식 종합 점수 — 상세 페이지에서만 존재
  safeSnackScore?: number | null;
  nutritionRiskScore?: number | null;
  publicPolicyScore?: number | null;
  preferenceScore?: number | null;
  tasteTags: TasteTag[];
  safeFor: Condition[];
  warnFor: Condition[];
  warnIngredients: Record<string, string[]>;
  nutrition: {
    caloriesKcal: number;
    carbsG: number;
    sugarG: number;
    proteinG: number;
    fatG: number;
    saturatedFatG: number;
    transFatG: number;
    cholesterolMg: number;
    sodiumMg: number;
    calciumMg: number;
    ironMg: number;
    fiberG: number;
  };
  ingredientsRaw: string;
  imageUrl?: string;
  recommendationReason?: string;
}

// Filter state
export interface FilterState {
  conditions: Set<Condition>;
  tastes: Set<TasteTag>;
  budget: number;
  query: string;
  sort: SortOption;
}

// Sort options
export type SortOption = 'score_desc' | 'price_asc' | 'price_desc' | 'value_desc';

// API Response types
export interface ProductListResponse {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  products: Product[];
}

// Condition metadata
export interface ConditionMeta {
  id: Condition;
  label: string;
  icon: string;
  bgColor: string;
  description: string;
  subConditions?: AllergySubConditionMeta[];  // 알레르기 세부 항목
}

export interface AllergySubConditionMeta {
  id: AllergySubCondition;
  label: string;
  emoji: string;
}

// Taste metadata
export interface TasteMeta {
  id: TasteTag;
  label: string;
  category: 'sweet' | 'savory' | 'nutty' | 'other';
}

// Stats
export interface Stats {
  totalProducts: number;
  totalConditions: number;
  totalTasteCategories: number;
}
