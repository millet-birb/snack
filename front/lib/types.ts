// Condition types for filtering
export type Condition = 
  | '알레르기' 
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
  nutritionScore: number;
  scorePerPrice: number;
  tasteTags: TasteTag[];
  safeFor: Condition[];
  warnFor: Condition[];
  warnIngredients: Record<Condition, string[]>;
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
