'use client';

import { useFilterStore } from '@/lib/filter-store';
import { FactsSlider } from '@/components/home/facts-slider';
import { useStats } from '@/hooks/use-stats';

export function HeroSection() {
  const { goToResults } = useFilterStore();
  const { totalProducts } = useStats();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFAF3] via-[#FFE9DA] to-[#FFF5EC]">
      {/* Candy stripe top border */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{
          background: 'repeating-linear-gradient(90deg, var(--primary) 0px, var(--primary) 12px, #F9B9A8 12px, #F9B9A8 24px)'
        }}
      />

      {/* Floating emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-8 left-[10%] text-4xl opacity-15 animate-float" style={{ animationDelay: '0s' }}>
          <span role="img" aria-label="candy">{"🍬"}</span>
        </span>
        <span className="absolute top-16 right-[15%] text-3xl opacity-15 animate-float" style={{ animationDelay: '0.5s' }}>
          <span role="img" aria-label="lollipop">{"🍭"}</span>
        </span>
        <span className="absolute top-32 left-[20%] text-2xl opacity-15 animate-float" style={{ animationDelay: '1s' }}>
          <span role="img" aria-label="dango">{"🍡"}</span>
        </span>
        <span className="absolute top-24 right-[25%] text-3xl opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>
          <span role="img" aria-label="cupcake">{"🧁"}</span>
        </span>
      </div>

      <div className="relative px-4 pt-10 pb-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-0 mb-2 animate-slide-up">
          <img
            src="/product-images/다람쥐.png"
            width={120}
            height={120}
            alt="스낵몬스터"
            style={{ imageRendering: 'pixelated', marginBottom: '-40px' }}
          />

          <img
            src="/product-images/스낵몬스터.png"
            alt="스낵몬스터글자"
            style={{
              imageRendering: 'pixelated',
              height: '120px',
              width: 'auto'
            }}
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display text-[30px] font-medium leading-tight text-text mb-2">
            우리 아이에게 딱 맞는 과자 찾아드릴게요!
          </h2>
          <p className="text-sm text-text-2 mx-auto">
            질환·예산·취향으로 {totalProducts}개 제품 중 안심 과자를 찾아드려요
          </p>
        </div>

        {/* Facts Slider - 검색바 아래 */}
        <div className="mt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <FactsSlider />
        </div>
      </div>
    </section>
  );
}
