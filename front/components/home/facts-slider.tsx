'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import factsCards from '@/lib/facts-cards.json';

interface FactCard {
  card_id: number;
  emoji: string;
  disease: string;
  headline: string;
  content: string;
  source: string;
}

const cards: FactCard[] = factsCards as FactCard[];

export function FactsSlider() {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % cards.length);
        setFade(true);
      }, 400);
    }, 30000); // 30초마다 전환

    return () => clearInterval(interval);
  }, []);

  const goTo = (idx: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrent(idx);
      setFade(true);
    }, 400);
  };

  const goPrev = () => {
    setFade(false);
    setTimeout(() => {
      setCurrent((prev) => (prev - 1 + cards.length) % cards.length);
      setFade(true);
    }, 400);
  };

  const goNext = () => {
    setFade(false);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % cards.length);
      setFade(true);
    }, 400);
  };

  if (cards.length === 0) return null;

  const card = cards[current];

  return (
    <div className="px-4 py-3">
      <div
        className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-orange-100"
        style={{ minHeight: '160px' }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-semibold text-[#D9472E]">💡 알고 계셨나요?</span>
        </div>

        {/* 내용 + 화살표 */}
        <div
          className="flex items-center gap-2 transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {/* 왼쪽 화살표 */}
          <button
            onClick={goPrev}
            className="shrink-0 text-gray-300 hover:text-[#D9472E] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

        {/* 카드 내용 - 고정 높이 */}
          <div className="flex gap-3 items-start flex-1 min-h-[80px]">
            <span className="text-2xl">{card.emoji}</span>
            <div>
              <p className="font-bold text-sm text-gray-800 mb-1">{card.headline}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{card.content}</p>
              <p className="text-[10px] text-gray-400 mt-2">출처: {card.source}</p>
            </div>
          </div>

          {/* 오른쪽 화살표 */}
          <button
            onClick={goNext}
            className="shrink-0 text-gray-300 hover:text-[#D9472E] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 인디케이터 */}
        <div className="flex justify-center gap-1 mt-3 flex-wrap">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all ${
                idx === current
                  ? 'w-4 h-1.5 bg-[#D9472E]'
                  : 'w-1.5 h-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
