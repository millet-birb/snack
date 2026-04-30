'use client';

import { cn } from '@/lib/utils';

interface NutritionRingProps {
  score: number;
}

export function NutritionRing({ score }: NutritionRingProps) {
  const radius = 46;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return 'stroke-safe';
    if (score >= 60) return 'stroke-warn';
    return 'stroke-primary';
  };

  const getScoreText = () => {
    if (score >= 80) return '영양 균형이 우수한 과자예요 👍';
    if (score >= 60) return '전반적으로 무난한 영양 구성이에요';
    return '가끔 즐기는 간식으로 추천해요';
  };

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-28 h-28">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress ring */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-1000 ease-out", getScoreColor())}
            style={{
              animation: 'ring-progress 1.1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif-display text-3xl text-text">{score}</span>
          <span className="text-[10px] text-text-2">영양점수</span>
        </div>
      </div>
      <p className="text-sm text-text-2 mt-3 text-center">{getScoreText()}</p>
      
      <style jsx>{`
        @keyframes ring-progress {
          from {
            stroke-dashoffset: ${circumference};
          }
        }
      `}</style>
    </div>
  );
}
