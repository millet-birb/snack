'use client';

import Image from 'next/image';
import { Home, Search, FileText, ShoppingCart } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { currentView, setCurrentView } = useFilterStore();

  const getActiveItem = (): string => {
    if (currentView === 'home') return 'home';
    if (currentView === 'results' || currentView === 'detail') return 'search';
    if (currentView === 'group') return 'group';
    return 'home';
  };

  const activeItem = getActiveItem();

  const handleNavClick = (id: string) => {
    if (id === 'home') setCurrentView('home');
    else if (id === 'search') setCurrentView('results');
    else if (id === 'group') setCurrentView('group');
    else alert(`해당 기능은 곧 출시 예정이에요! 🚀`);
  };

  const navItems = [
    { id: 'home',
      label: '홈',
      icon: <img src="/product-images/필터링.png" alt="홈" width={70} height={60} style={{ imageRendering: 'pixelated' }} />
    },
    { id: 'search',
      label: '검색',
      icon: <img src="/product-images/검색.png" alt="검색" width={50} height={40} style={{ imageRendering: 'pixelated' }} />
    },
    {
      id: 'group',
      label: '단체구매',
      icon: <img src="/product-images/지갑.png" alt="단체구매" width={22} height={24} style={{ imageRendering: 'pixelated' }} />,
    },
    { id: 'news',
      label: '최신 이슈',
      icon: <img src="/product-images/최신이슈.png" alt="최신이슈" width={60} height={60} style={{ imageRendering: 'pixelated' }} />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 w-16 transition-all',
                isActive ? 'text-primary' : 'text-text-3'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-6 h-6 transition-transform',
                isActive && 'scale-110'
              )}>
                {item.icon}
              </span>
              <span className={cn('text-[10px] font-medium text-center', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
