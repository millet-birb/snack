'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for fade-out
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'
        }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pop-in">
        {/* Logo */}
        <img
          src="/product-images/노랑다람쥐.png"
          width={100}
          height={100}
          alt="스낵몬스터"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="font-display text-2xl text-white mb-1">
          스낵몬스터
        </h1>
        <p className="text-sm text-white/80">
          질환 아동 과자 추천 서비스
        </p>
      </div>

      {/* Spinner */}
      <Loader2 className="w-6 h-6 text-white/60 animate-spin mt-4" />
    </div>
  );
}
