'use client';

import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';
import { SORT_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ResultsHeaderProps {
  totalCount: number;
}

export function ResultsHeader({ totalCount }: ResultsHeaderProps) {
  const { sort, setSort, setCurrentView, query, setQuery } = useFilterStore();

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label || '추천순';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border-soft">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1 text-sm text-text-2 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>조건 다시 설정</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-text-2">
            총 <span className="text-primary font-semibold">{totalCount}</span>개 추천
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full text-xs">
                {currentSortLabel}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSort(option.value)}
                  className={sort === option.value ? 'bg-primary-lt' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 검색바 */}
      <form onSubmit={handleSearch} className="px-4 pb-3">
        <div className="relative flex items-center bg-card rounded-[24px] border border-border-soft focus-within:border-primary transition-all">
          <Search className="absolute left-4 w-4 h-4 text-text-3" />
          <Input
            type="text"
            placeholder="과자 이름, 브랜드, 원재료 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-4 py-3 h-auto border-0 bg-transparent rounded-[24px] text-sm placeholder:text-text-3 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 rounded-full px-3 h-8 bg-primary hover:bg-primary-dk text-xs"
          >
            검색
          </Button>
        </div>
      </form>
    </header>
  );
}