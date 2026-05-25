// 영양 점수(0~100) → 사용자 노출 등급(A~D).
// 내부 정렬/필터는 점수 그대로 사용하고, 화면에는 등급 라벨만 노출한다.
// 임계값 근거: nutrition_score 분포 분석 결과 A안(균형형) 채택.
// → nutrition_score_analysis.ipynb 참조

export type GradeCode = 'A' | 'B' | 'C' | 'D';

export interface ScoreGrade {
  code: GradeCode;
  label: string;        // 짧은 표시 — 예: 'A등급'
  description: string;  // 부연 설명 — 예: '안심추천'
  // Tailwind 클래스
  bgClass: string;      // 컬러 배경(원형 뱃지용)
  textClass: string;    // 위 배경 위의 글자색
  accentClass: string;  // 흰 배경 위 인라인 텍스트 색
}

export const SCORE_GRADES: ScoreGrade[] = [
  { code: 'A', label: 'A등급', description: '안심추천', bgClass: 'bg-green-500',  textClass: 'text-white', accentClass: 'text-green-600' },
  { code: 'B', label: 'B등급', description: '추천가능', bgClass: 'bg-lime-500',   textClass: 'text-white', accentClass: 'text-lime-600' },
  { code: 'C', label: 'C등급', description: '보통',     bgClass: 'bg-yellow-500', textClass: 'text-white', accentClass: 'text-yellow-600' },
  { code: 'D', label: 'D등급', description: '주의필요', bgClass: 'bg-gray-500',   textClass: 'text-white', accentClass: 'text-gray-600' },
];

export function scoreToGrade(score: number): ScoreGrade {
  if (score >= 85) return SCORE_GRADES[0];
  if (score >= 70) return SCORE_GRADES[1];
  if (score >= 55) return SCORE_GRADES[2];
  return SCORE_GRADES[3];
}
