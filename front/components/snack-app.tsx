'use client';

import { useState } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import { Splash } from '@/components/splash';
import { HomeScreen } from '@/components/screens/home-screen';
import { ResultsScreen } from '@/components/screens/results-screen';
import { DetailScreen } from '@/components/screens/detail-screen';
import { BottomNav } from '@/components/navigation/bottom-nav';

export function SnackApp() {
  const [showSplash, setShowSplash] = useState(true);
  const { currentView } = useFilterStore();

  const renderScreen = () => {
    switch (currentView) {
      case 'home':
        return <HomeScreen />;
      case 'results':
        return <ResultsScreen />;
      case 'detail':
        return <DetailScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {showSplash && (
        <Splash onComplete={() => setShowSplash(false)} />
      )}
      
      <main className="pb-20">
        {renderScreen()}
      </main>

      <BottomNav />
    </div>
  );
}
