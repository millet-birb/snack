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
    { id: 'home', label: '홈', icon: <Home className="w-6 h-6" /> },
    { id: 'search', label: '검색', icon: <Search className="w-6 h-6" /> },
    {
      id: 'group',
      label: '단체구매',
      icon: (
        <Image
          src="/지갑.png"
          width={24}
          height={24}
          alt="단체구매"
          style={{ imageRendering: 'pixelated' }}
        />
      ),
    },
    { id: 'news', label: '최신 이슈', icon: <FileText className="w-6 h-6" /> },
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
                'flex flex-col items-center gap-0.5 py-1 px-4 transition-all',
                isActive ? 'text-primary' : 'text-text-3'
              )}
            >
              <span className={cn('transition-transform', isActive && 'scale-110')}>
                {item.icon}
              </span>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
