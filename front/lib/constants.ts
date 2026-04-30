import type { Condition, TasteTag, ConditionMeta, TasteMeta } from './types';

// Condition metadata with icons and colors
export const CONDITIONS: ConditionMeta[] = [
  { id: '알레르기', label: '알레르기', icon: '🤧', bgColor: '#FFEDE7', description: '22개 알레르겐 제거' },
  { id: '아토피', label: '아토피 피부염', icon: '🌿', bgColor: '#FFF5E0', description: '피부 자극 성분 필터' },
  { id: '소아천식', label: '소아천식', icon: '💨', bgColor: '#E8F3FF', description: '호흡기 자극 성분 필터' },
  { id: '유당불내증', label: '유당불내증', icon: '🥛', bgColor: '#EEFFF0', description: '유제품 성분 제거' },
  { id: '아나필락시스', label: '아나필락시스', icon: '⚠️', bgColor: '#FFE8F0', description: '강성 알레르겐 완전 제거' },
  { id: '소아비만', label: '소아비만', icon: '⚖️', bgColor: '#F0F5FF', description: '고칼로리·지방 필터' },
  { id: '소아당뇨', label: '소아당뇨', icon: '🩸', bgColor: '#FFFAE5', description: '당류·GI 기준 필터' },
  { id: '카페인', label: '카페인 과민', icon: '☕', bgColor: '#F5EEFF', description: '카페인 성분 완전 제거' },
];

// All taste tags with categories
export const TASTE_TAGS: TasteMeta[] = [
  // Sweet
  { id: '달달', label: '달달', category: 'sweet' },
  { id: '카라멜', label: '카라멜', category: 'sweet' },
  { id: '초코', label: '초코', category: 'sweet' },
  { id: '딸기', label: '딸기', category: 'sweet' },
  { id: '바나나', label: '바나나', category: 'sweet' },
  { id: '복숭아', label: '복숭아', category: 'sweet' },
  { id: '사과', label: '사과', category: 'sweet' },
  { id: '파인애플', label: '파인애플', category: 'sweet' },
  { id: '멜론', label: '멜론', category: 'sweet' },
  { id: '블루베리', label: '블루베리', category: 'sweet' },
  { id: '귤감귤', label: '귤/감귤', category: 'sweet' },
  // Savory
  { id: '짭짤', label: '짭짤', category: 'savory' },
  { id: '버터갈릭', label: '버터갈릭', category: 'savory' },
  { id: '치즈', label: '치즈', category: 'savory' },
  { id: '매콤', label: '매콤', category: 'savory' },
  { id: '바베큐', label: '바베큐', category: 'savory' },
  { id: '양파', label: '양파', category: 'savory' },
  { id: '와사비', label: '와사비', category: 'savory' },
  { id: '새우', label: '새우', category: 'savory' },
  { id: '오징어', label: '오징어', category: 'savory' },
  { id: '게', label: '게', category: 'savory' },
  // Nutty
  { id: '고소', label: '고소', category: 'nutty' },
  { id: '감자', label: '감자', category: 'nutty' },
  { id: '고구마', label: '고구마', category: 'nutty' },
  { id: '옥수수', label: '옥수수', category: 'nutty' },
  { id: '김', label: '김', category: 'nutty' },
  { id: '누룽지', label: '누룽지', category: 'nutty' },
  // Other
  { id: '말차', label: '말차', category: 'other' },
  { id: '커피', label: '커피', category: 'other' },
  { id: '요거트', label: '요거트', category: 'other' },
];

// Risk keywords for each condition
export const RISK_KEYWORDS: Record<Condition, string[]> = {
  '알레르기': [
    '밀', '메밀', '대두', '복숭아', '귤', '토마토',
    '돼지고기', '닭고기', '계란', '달걀', '난황', '난백',
    '우유', '고등어', '게', '조개', '새우', '오징어',
    '땅콩', '호두', '잣', '아황산'
  ],
  '아토피': [
    '밀', '메밀', '대두', '복숭아', '귤', '토마토',
    '돼지고기', '닭고기', '계란', '달걀', '난황', '난백',
    '우유', '고등어', '게', '조개', '새우', '오징어',
    '땅콩', '호두', '잣', '아황산',
    '메틸파라벤', '에틸파라벤', '프로필파라벤', '부틸파라벤'
  ],
  '소아천식': [
    '아황산', '이산화황', '메타중아황산나트륨',
    '아황산나트륨', '산성아황산나트륨'
  ],
  '유당불내증': [
    '유당', '우유', '유청', '카제인', '카제인나트륨',
    '탈지분유', '전지분유', '분유', '혼합분유',
    '농축우유', '크림', '버터', '치즈', '요구르트',
    '유크림', '연유', '가공유', '산양유'
  ],
  '아나필락시스': [
    '계란', '달걀', '난황', '난백', '난분',
    '땅콩', '새우', '게', '조개', '홍합',
    '오징어', '고등어', '복숭아', '귤', '오렌지'
  ],
  '소아비만': [
    '정제탄수화물', '액상과당', '물엿', '팜유',
    '쇼트닝', '마가린'
  ],
  '소아당뇨': [
    '정제탄수화물', '액상과당', '물엿', '팜유',
    '쇼트닝', '마가린'
  ],
  '카페인': [
    '카페인', '커피', '녹차', '홍차', '콜라추출물'
  ]
};

// Sort options
export const SORT_OPTIONS = [
  { value: 'score_desc' as const, label: '점수순' },
  { value: 'price_asc' as const, label: '가격 낮은순' },
  { value: 'price_desc' as const, label: '가격 높은순' },
  { value: 'value_desc' as const, label: '가성비순' },
];

// Budget range
export const BUDGET_MIN = 500;
export const BUDGET_MAX = 20000;
export const BUDGET_STEP = 500;
export const BUDGET_DEFAULT = 5000;
