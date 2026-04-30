'use client';

import { Search } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const { query, setQuery, goToResults } = useFilterStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToResults();
  };

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
        <div className="flex flex-col items-center gap-2 mb-6 animate-slide-up">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground text-2xl shadow-md">
            <span role="img" aria-label="cookie">{"🍪"}</span>
          </div>
          <h1 className="font-display text-2xl text-center text-text">
            두쫀쿠가고 버터떡왔다
          </h1>
        </div>

        {/* Headline */}
        <div className="text-center mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display text-[28px] leading-tight text-text mb-2 text-balance">
            우리 아이에게 딱 맞는
            <br />
            과자 찾아드릴게요
          </h2>
          <p className="text-sm text-text-2 max-w-[280px] mx-auto text-pretty">
            질환·예산·취향을 입력하면 604개 제품 중 안심 과자를 바로 추천해요
          </p>
        </div>

        {/* Search bar */}
        <form 
          onSubmit={handleSearch}
          className="relative animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="relative flex items-center bg-card rounded-[24px] shadow-sm border border-border-soft focus-within:border-primary focus-within:shadow-md transition-all">
            <Search className="absolute left-4 w-5 h-5 text-text-3" />
            <Input
              type="text"
              placeholder="과자 이름, 브랜드, 원재료 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 pr-4 py-4 h-auto border-0 bg-transparent rounded-[24px] text-[15px] placeholder:text-text-3 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 rounded-full px-4 h-9 bg-primary hover:bg-primary-dk"
            >
              검색
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
