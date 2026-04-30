import type { Product, Condition, TasteTag } from './types';

// Sample mock products based on PRD specifications
export const MOCK_PRODUCTS: Product[] = [
  {
    id: '20040093001',
    brand: '농심',
    name: '쌀새우깡 미니',
    foodType: '과자',
    price: 800,
    pricePerUnit: 800,
    servingG: 30,
    nutritionScore: 88,
    scorePerPrice: 0.11,
    tasteTags: ['짭짤', '고소', '새우'],
    safeFor: ['아토피', '소아천식', '유당불내증', '카페인'],
    warnFor: ['알레르기', '아나필락시스'],
    warnIngredients: { '알레르기': ['새우'], '아나필락시스': ['새우'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 145,
      carbsG: 18,
      sugarG: 2,
      proteinG: 3,
      fatG: 8,
      saturatedFatG: 3.5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 280,
      calciumMg: 20,
      ironMg: 0.5,
      fiberG: 1
    },
    ingredientsRaw: '쌀(국산), 전분, 새우, 소금, 설탕, 향미증진제',
    recommendationReason: '국산 쌀로 만들어 아토피·천식 아이에게 적합해요. 유제품 성분이 없어 유당불내증 아이도 안심하고 드실 수 있어요.'
  },
  {
    id: '20040093002',
    brand: '풀무원',
    name: '생가득 현미 떡과자',
    foodType: '떡류',
    price: 2200,
    pricePerUnit: 2200,
    servingG: 25,
    nutritionScore: 91,
    scorePerPrice: 0.041,
    tasteTags: ['고소', '달달'],
    safeFor: ['알레르기', '아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: [],
    warnIngredients: {} as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 98,
      carbsG: 22,
      sugarG: 3,
      proteinG: 2,
      fatG: 0.5,
      saturatedFatG: 0.1,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 85,
      calciumMg: 15,
      ironMg: 0.8,
      fiberG: 1.5
    },
    ingredientsRaw: '현미(국산), 찹쌀(국산), 조청, 소금',
    recommendationReason: '국산 현미와 찹쌀로만 만든 건강한 떡과자예요. 알레르기 유발 성분이 없어 모든 아이가 안심하고 먹을 수 있어요.'
  },
  {
    id: '20040093003',
    brand: '오리온',
    name: '고소미 12개입',
    foodType: '과자',
    price: 1800,
    pricePerUnit: 150,
    servingG: 20,
    nutritionScore: 72,
    scorePerPrice: 0.48,
    tasteTags: ['고소', '달달'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유'], '아토피': ['밀', '계란', '우유'], '유당불내증': ['우유', '버터'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 105,
      carbsG: 13,
      sugarG: 5,
      proteinG: 1.5,
      fatG: 5,
      saturatedFatG: 2.5,
      transFatG: 0,
      cholesterolMg: 15,
      sodiumMg: 95,
      calciumMg: 25,
      ironMg: 0.3,
      fiberG: 0.5
    },
    ingredientsRaw: '밀가루, 설탕, 쇼트닝, 버터, 계란, 우유, 소금',
    recommendationReason: '고소한 맛이 일품인 클래식 과자예요. 천식과 카페인 과민 아이에게 안전해요.'
  },
  {
    id: '20040093004',
    brand: '해태',
    name: '구운감자 스낵',
    foodType: '과자',
    price: 1500,
    pricePerUnit: 1500,
    servingG: 45,
    nutritionScore: 85,
    scorePerPrice: 0.057,
    tasteTags: ['감자', '짭짤', '고소'],
    safeFor: ['알레르기', '아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: [],
    warnIngredients: {} as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 220,
      carbsG: 28,
      sugarG: 1,
      proteinG: 3,
      fatG: 10,
      saturatedFatG: 4,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 320,
      calciumMg: 10,
      ironMg: 0.6,
      fiberG: 2
    },
    ingredientsRaw: '감자(국산), 식물성유지, 소금, 양파분말, 설탕',
    recommendationReason: '국산 감자로 구워서 바삭하고 담백해요. 주요 알레르겐이 없어 안심하고 드실 수 있어요.'
  },
  {
    id: '20040093005',
    brand: '롯데',
    name: '빼빼로 아몬드',
    foodType: '과자',
    price: 1700,
    pricePerUnit: 1700,
    servingG: 32,
    nutritionScore: 65,
    scorePerPrice: 0.038,
    tasteTags: ['초코', '고소', '달달'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증', '아나필락시스'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유', '대두', '땅콩'], '아토피': ['밀', '계란', '우유', '대두', '땅콩'], '유당불내증': ['우유'], '아나필락시스': ['계란', '땅콩'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 175,
      carbsG: 20,
      sugarG: 12,
      proteinG: 3,
      fatG: 9,
      saturatedFatG: 5,
      transFatG: 0,
      cholesterolMg: 5,
      sodiumMg: 75,
      calciumMg: 45,
      ironMg: 1,
      fiberG: 1
    },
    ingredientsRaw: '밀가루, 초콜릿, 설탕, 아몬드, 식물성유지, 계란, 우유, 대두레시틴',
    recommendationReason: '초콜릿과 아몬드의 조화가 맛있는 과자예요. 천식과 카페인에 민감한 아이에게 적합해요.'
  },
  {
    id: '20040093006',
    brand: '크라운',
    name: '참크래커',
    foodType: '과자',
    price: 2500,
    pricePerUnit: 125,
    servingG: 25,
    nutritionScore: 78,
    scorePerPrice: 0.62,
    tasteTags: ['고소', '짭짤'],
    safeFor: ['소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '아토피'],
    warnIngredients: { '알레르기': ['밀'], '아토피': ['밀'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 115,
      carbsG: 17,
      sugarG: 2,
      proteinG: 2.5,
      fatG: 4,
      saturatedFatG: 1.5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 190,
      calciumMg: 20,
      ironMg: 0.5,
      fiberG: 1
    },
    ingredientsRaw: '밀가루, 식물성유지, 참깨, 소금, 효모',
    recommendationReason: '참깨가 들어가 고소하고 담백한 크래커예요. 유제품 성분이 없어 유당불내증 아이도 안심이에요.'
  },
  {
    id: '20040093007',
    brand: '농심',
    name: '바나나킥',
    foodType: '과자',
    price: 1200,
    pricePerUnit: 1200,
    servingG: 45,
    nutritionScore: 68,
    scorePerPrice: 0.057,
    tasteTags: ['바나나', '달달'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기'],
    warnIngredients: { '알레르기': ['밀'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 230,
      carbsG: 32,
      sugarG: 10,
      proteinG: 2,
      fatG: 10,
      saturatedFatG: 5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 150,
      calciumMg: 15,
      ironMg: 0.4,
      fiberG: 0.8
    },
    ingredientsRaw: '옥수수분말, 식물성유지, 바나나분말, 설탕, 소금',
    recommendationReason: '바나나 향이 가득한 달콤한 과자예요. 유제품과 계란이 없어 아토피 아이에게 좋아요.'
  },
  {
    id: '20040093008',
    brand: '오뚜기',
    name: '오뜨 고구마맛 쿠키',
    foodType: '쿠키',
    price: 1900,
    pricePerUnit: 1900,
    servingG: 35,
    nutritionScore: 75,
    scorePerPrice: 0.039,
    tasteTags: ['고구마', '달달', '고소'],
    safeFor: ['소아천식', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유'], '아토피': ['밀', '계란', '우유'], '유당불내증': ['우유', '버터'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 165,
      carbsG: 24,
      sugarG: 9,
      proteinG: 2,
      fatG: 7,
      saturatedFatG: 3.5,
      transFatG: 0,
      cholesterolMg: 10,
      sodiumMg: 120,
      calciumMg: 30,
      ironMg: 0.6,
      fiberG: 1.2
    },
    ingredientsRaw: '밀가루, 고구마분말(국산), 설탕, 버터, 계란, 우유',
    recommendationReason: '국산 고구마로 만든 달콤한 쿠키예요. 천식 아이에게 안전해요.'
  },
  {
    id: '20040093009',
    brand: '삼양',
    name: '짱구 초코맛',
    foodType: '과자',
    price: 1000,
    pricePerUnit: 1000,
    servingG: 40,
    nutritionScore: 62,
    scorePerPrice: 0.062,
    tasteTags: ['초코', '달달'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증'],
    warnIngredients: { '알레르기': ['밀', '대두', '우유'], '아토피': ['밀', '대두', '우유'], '유당불내증': ['우유'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 195,
      carbsG: 26,
      sugarG: 11,
      proteinG: 2.5,
      fatG: 9,
      saturatedFatG: 4.5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 135,
      calciumMg: 35,
      ironMg: 0.8,
      fiberG: 1
    },
    ingredientsRaw: '밀가루, 코코아분말, 설탕, 식물성유지, 대두레시틴, 분유',
    recommendationReason: '아이들이 좋아하는 초콜릿 맛 과자예요. 천식과 카페인에 민감한 아이에게 안전해요.'
  },
  {
    id: '20040093010',
    brand: '동서',
    name: '마이쮸 딸기맛',
    foodType: '캔디',
    price: 500,
    pricePerUnit: 500,
    servingG: 15,
    nutritionScore: 55,
    scorePerPrice: 0.11,
    tasteTags: ['딸기', '달달'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '소아비만', '소아당뇨'],
    warnIngredients: { '알레르기': ['대두'], '소아비만': ['물엿', '설탕'], '소아당뇨': ['물엿', '설탕'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 60,
      carbsG: 14,
      sugarG: 10,
      proteinG: 0,
      fatG: 0.5,
      saturatedFatG: 0.2,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 15,
      calciumMg: 5,
      ironMg: 0.1,
      fiberG: 0
    },
    ingredientsRaw: '물엿, 설탕, 딸기농축액, 대두레시틴, 산미료',
    recommendationReason: '상큼한 딸기맛 캔디예요. 아토피와 천식 아이에게 적합해요.'
  },
  {
    id: '20040093011',
    brand: '해태',
    name: '오예스',
    foodType: '케이크',
    price: 2800,
    pricePerUnit: 350,
    servingG: 38,
    nutritionScore: 58,
    scorePerPrice: 0.166,
    tasteTags: ['초코', '달달'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증', '소아비만', '소아당뇨'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유', '대두'], '아토피': ['밀', '계란', '우유', '대두'], '유당불내증': ['우유', '크림'], '소아비만': ['설탕', '물엿'], '소아당뇨': ['설탕', '물엿'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 155,
      carbsG: 22,
      sugarG: 14,
      proteinG: 2,
      fatG: 7,
      saturatedFatG: 4,
      transFatG: 0.1,
      cholesterolMg: 20,
      sodiumMg: 85,
      calciumMg: 40,
      ironMg: 0.5,
      fiberG: 0.5
    },
    ingredientsRaw: '밀가루, 설탕, 계란, 초콜릿, 식물성유지, 우유, 크림, 물엿',
    recommendationReason: '부드러운 초코 케이크예요. 천식과 카페인 과민 아이에게 안전해요.'
  },
  {
    id: '20040093012',
    brand: '농심',
    name: '꿀꽈배기',
    foodType: '스낵',
    price: 1300,
    pricePerUnit: 1300,
    servingG: 50,
    nutritionScore: 70,
    scorePerPrice: 0.054,
    tasteTags: ['달달', '고소'],
    safeFor: ['소아천식', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증', '소아비만', '소아당뇨'],
    warnIngredients: { '알레르기': ['밀', '대두'], '아토피': ['밀', '대두'], '유당불내증': ['버터'], '소아비만': ['물엿'], '소아당뇨': ['물엿'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 245,
      carbsG: 35,
      sugarG: 12,
      proteinG: 3,
      fatG: 10,
      saturatedFatG: 4.5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 180,
      calciumMg: 15,
      ironMg: 0.6,
      fiberG: 1
    },
    ingredientsRaw: '밀가루, 물엿, 설탕, 식물성유지, 꿀, 소금',
    recommendationReason: '꿀이 들어가 달콤하고 바삭한 꽈배기예요. 천식 아이에게 안전해요.'
  },
  {
    id: '20040093013',
    brand: '롯데',
    name: '칸쵸',
    foodType: '과자',
    price: 1500,
    pricePerUnit: 1500,
    servingG: 42,
    nutritionScore: 64,
    scorePerPrice: 0.043,
    tasteTags: ['초코', '달달', '고소'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유', '대두'], '아토피': ['밀', '계란', '우유', '대두'], '유당불내증': ['우유', '분유'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 210,
      carbsG: 27,
      sugarG: 13,
      proteinG: 3,
      fatG: 10,
      saturatedFatG: 5,
      transFatG: 0,
      cholesterolMg: 10,
      sodiumMg: 120,
      calciumMg: 50,
      ironMg: 0.7,
      fiberG: 1
    },
    ingredientsRaw: '밀가루, 초콜릿, 설탕, 계란, 우유, 식물성유지, 분유, 대두레시틴',
    recommendationReason: '동글동글 귀여운 초코 스낵이에요. 천식과 카페인 과민 아이에게 적합해요.'
  },
  {
    id: '20040093014',
    brand: '오리온',
    name: '포카칩 오리지널',
    foodType: '과자',
    price: 1800,
    pricePerUnit: 1800,
    servingG: 66,
    nutritionScore: 82,
    scorePerPrice: 0.046,
    tasteTags: ['감자', '짭짤'],
    safeFor: ['알레르기', '아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: [],
    warnIngredients: {} as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 355,
      carbsG: 38,
      sugarG: 1,
      proteinG: 4,
      fatG: 21,
      saturatedFatG: 7,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 350,
      calciumMg: 15,
      ironMg: 0.8,
      fiberG: 3
    },
    ingredientsRaw: '감자(국산), 식물성유지, 소금',
    recommendationReason: '심플한 재료로 만든 감자칩이에요. 주요 알레르겐이 없어 모든 아이가 안심하고 먹을 수 있어요.'
  },
  {
    id: '20040093015',
    brand: '크라운',
    name: '새콤달콤',
    foodType: '캔디',
    price: 600,
    pricePerUnit: 600,
    servingG: 20,
    nutritionScore: 50,
    scorePerPrice: 0.083,
    tasteTags: ['달달', '딸기'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '소아비만', '소아당뇨'],
    warnIngredients: { '알레르기': ['대두'], '소아비만': ['설탕', '물엿'], '소아당뇨': ['설탕', '물엿'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 78,
      carbsG: 19,
      sugarG: 15,
      proteinG: 0,
      fatG: 0,
      saturatedFatG: 0,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 10,
      calciumMg: 2,
      ironMg: 0,
      fiberG: 0
    },
    ingredientsRaw: '설탕, 물엿, 산미료, 향료, 대두레시틴',
    recommendationReason: '새콤달콤한 맛이 매력적인 캔디예요. 아토피와 천식 아이에게 안전해요.'
  },
  {
    id: '20040093016',
    brand: '농심',
    name: '양파링',
    foodType: '스낵',
    price: 1400,
    pricePerUnit: 1400,
    servingG: 50,
    nutritionScore: 76,
    scorePerPrice: 0.054,
    tasteTags: ['양파', '짭짤', '고소'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기'],
    warnIngredients: { '알레르기': ['밀'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 240,
      carbsG: 32,
      sugarG: 3,
      proteinG: 3,
      fatG: 11,
      saturatedFatG: 5,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 290,
      calciumMg: 10,
      ironMg: 0.5,
      fiberG: 1.5
    },
    ingredientsRaw: '밀가루, 양파분말, 식물성유지, 소금, 설탕',
    recommendationReason: '양파 향이 가득한 바삭한 링 과자예요. 유제품이 없어 유당불내증 아이도 OK!'
  },
  {
    id: '20040093017',
    brand: '해태',
    name: '맛동산',
    foodType: '과자',
    price: 2000,
    pricePerUnit: 2000,
    servingG: 72,
    nutritionScore: 67,
    scorePerPrice: 0.034,
    tasteTags: ['달달', '고소'],
    safeFor: ['소아천식', '아나필락시스', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증', '소아비만', '소아당뇨'],
    warnIngredients: { '알레르기': ['밀', '대두', '땅콩'], '아토피': ['밀', '대두', '땅콩'], '유당불내증': ['버터'], '소아비만': ['물엿'], '소아당뇨': ['물엿'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 360,
      carbsG: 48,
      sugarG: 18,
      proteinG: 5,
      fatG: 16,
      saturatedFatG: 7,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 210,
      calciumMg: 25,
      ironMg: 1,
      fiberG: 2
    },
    ingredientsRaw: '밀가루, 물엿, 설탕, 땅콩, 식물성유지, 대두유',
    recommendationReason: '고소하고 달콤한 클래식 과자예요. 천식 아이에게 안전해요.'
  },
  {
    id: '20040093018',
    brand: '삼양',
    name: '불닭 포테이토칩',
    foodType: '과자',
    price: 2200,
    pricePerUnit: 2200,
    servingG: 60,
    nutritionScore: 74,
    scorePerPrice: 0.034,
    tasteTags: ['매콤', '감자', '짭짤'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기'],
    warnIngredients: { '알레르기': ['대두', '밀'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 320,
      carbsG: 35,
      sugarG: 2,
      proteinG: 4,
      fatG: 18,
      saturatedFatG: 6,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 420,
      calciumMg: 12,
      ironMg: 0.7,
      fiberG: 2.5
    },
    ingredientsRaw: '감자, 식물성유지, 고춧가루, 소금, 대두유, 밀전분',
    recommendationReason: '매콤한 맛을 좋아하는 아이를 위한 감자칩이에요. 유제품이 없어요.'
  },
  {
    id: '20040093019',
    brand: '롯데',
    name: '꼬깔콘 고소한맛',
    foodType: '과자',
    price: 1600,
    pricePerUnit: 1600,
    servingG: 72,
    nutritionScore: 79,
    scorePerPrice: 0.049,
    tasteTags: ['옥수수', '고소', '짭짤'],
    safeFor: ['아토피', '소아천식', '유당불내증', '아나필락시스', '카페인'],
    warnFor: ['알레르기'],
    warnIngredients: { '알레르기': ['대두'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 390,
      carbsG: 42,
      sugarG: 4,
      proteinG: 4,
      fatG: 22,
      saturatedFatG: 8,
      transFatG: 0,
      cholesterolMg: 0,
      sodiumMg: 310,
      calciumMg: 8,
      ironMg: 0.6,
      fiberG: 2
    },
    ingredientsRaw: '옥수수(미국산), 식물성유지, 소금, 대두유',
    recommendationReason: '옥수수 맛이 진한 고소한 과자예요. 유제품과 계란이 없어 아토피 아이도 안심!'
  },
  {
    id: '20040093020',
    brand: '오리온',
    name: '다이제 샌드위치',
    foodType: '비스킷',
    price: 2500,
    pricePerUnit: 2500,
    servingG: 42,
    nutritionScore: 73,
    scorePerPrice: 0.029,
    tasteTags: ['달달', '고소'],
    safeFor: ['소아천식', '카페인'],
    warnFor: ['알레르기', '아토피', '유당불내증'],
    warnIngredients: { '알레르기': ['밀', '계란', '우유', '대두'], '아토피': ['밀', '계란', '우유', '대두'], '유당불내증': ['우유', '크림'] } as Record<Condition, string[]>,
    nutrition: {
      caloriesKcal: 200,
      carbsG: 28,
      sugarG: 10,
      proteinG: 3,
      fatG: 9,
      saturatedFatG: 4.5,
      transFatG: 0,
      cholesterolMg: 5,
      sodiumMg: 145,
      calciumMg: 35,
      ironMg: 0.8,
      fiberG: 1.5
    },
    ingredientsRaw: '밀가루, 설탕, 식물성유지, 계란, 우유, 크림, 대두레시틴',
    recommendationReason: '통밀이 들어간 건강한 비스킷이에요. 천식과 카페인 과민 아이에게 좋아요.'
  }
];

// Get products filtered by conditions and other criteria
export function filterProducts(
  products: Product[],
  conditions: Set<Condition>,
  tastes: Set<TasteTag>,
  budget: number,
  query: string
): Product[] {
  return products.filter(product => {
    // Check if product is safe for all selected conditions
    if (conditions.size > 0) {
      const conditionArray = Array.from(conditions);
      const isSafe = conditionArray.every(condition => 
        product.safeFor.includes(condition)
      );
      if (!isSafe) return false;
    }

    // Check taste filter (OR condition)
    if (tastes.size > 0) {
      const tasteArray = Array.from(tastes);
      const hasTaste = tasteArray.some(taste => 
        product.tasteTags.includes(taste)
      );
      if (!hasTaste) return false;
    }

    // Check budget
    if (product.pricePerUnit > budget) return false;

    // Check search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      const matchesQuery = 
        product.name.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.ingredientsRaw.toLowerCase().includes(lowerQuery);
      if (!matchesQuery) return false;
    }

    return true;
  });
}

// Sort products
export function sortProducts(
  products: Product[],
  sort: 'score_desc' | 'price_asc' | 'price_desc' | 'value_desc'
): Product[] {
  const sorted = [...products];
  
  switch (sort) {
    case 'score_desc':
      return sorted.sort((a, b) => b.nutritionScore - a.nutritionScore);
    case 'price_asc':
      return sorted.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    case 'price_desc':
      return sorted.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    case 'value_desc':
      return sorted.sort((a, b) => b.scorePerPrice - a.scorePerPrice);
    default:
      return sorted;
  }
}
