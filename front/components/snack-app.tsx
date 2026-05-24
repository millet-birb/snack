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

      <BottomNav />

      {!showSplash && <ChatWidget />}
    </div>
  );
}
