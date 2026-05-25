'use client';

import { useEffect, useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import { Splash } from '@/components/splash';
import { HomeScreen } from '@/components/screens/home-screen';
import { ResultsScreen } from '@/components/screens/results-screen';
import { DetailScreen } from '@/components/screens/detail-screen';
import { GroupPurchaseScreen } from '@/components/screens/group-purchase-screen';  // 추가
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ChatWidget } from '@/components/chat/chat-widget';

export function SnackApp() {
  const [showSplash, setShowSplash] = useState(true);
  const { currentView } = useFilterStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentView]);

  const renderScreen = () => {
    switch (currentView) {
      case 'home':
        return <HomeScreen />;
      case 'results':
        return <ResultsScreen />;
      case 'detail':
        return <DetailScreen />;
      case 'group':
        return <GroupPurchaseScreen />;  // 추가
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {showSplash && (
        <Splash onComplete={() => setShowSplash(false)} />
      )}
      
      <main className="pb-20 max-w-4xl mx-auto">
        {renderScreen()}
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-28 pt-4 text-center text-xs leading-5 text-text-3">
        <p>제품·원재료 데이터는 식품안전나라 OpenAPI를 기반으로 제공합니다.</p>
        <p>
          추천 결과는 원재료 키워드 및 영양 정보 분석 결과이며, 구매 전 제품 표시사항을
          다시 확인해 주세요.
        </p>
      </footer>

      <BottomNav />

      {!showSplash && <ChatWidget />}
    </div>
  );
}
