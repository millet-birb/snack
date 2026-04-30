'use client';

import { Home, Search, Wallet, FileText, Baby } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { cn } from '@/lib/utils';

type NavItem = {
  id: 'home' | 'search' | 'budget' | 'blog' | 'profile';
  icon: typeof Home;
  label: string;
  view: 'home' | 'results' | 'detail';
};

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: '홈', view: 'home' },
  { id: 'search', icon: Search, label: '검색', view: 'results' },
  { id: 'budget', icon: Wallet, label: '예산조합', view: 'home' }, // Future feature
  { id: 'blog', icon: FileText, label: '블로그', view: 'home' }, // Future feature
  { id: 'profile', icon: Baby, label: '내 아이', view: 'home' }, // Future feature
];

export function BottomNav() {
  const { currentView, setView } = useFilterStore();

  const getActiveItem = (): string => {
    if (currentView === 'home') return 'home';
    if (currentView === 'results' || currentView === 'detail') return 'search';
    return 'home';
  };

  const activeItem = getActiveItem();

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'home') {
      setView('home');
    } else if (item.id === 'search') {
      setView('results');
    } else {
      // Future features - show toast or do nothing
      alert(`${item.label} 기능은 곧 출시 예정이에요! 🚀`);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-4 transition-all",
                isActive ? "text-primary" : "text-text-3"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6 transition-transform",
                  isActive && "scale-110"
                )} 
              />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
