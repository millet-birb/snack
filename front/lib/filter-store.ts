import { create } from 'zustand';
import type { Product, Condition, TasteTag, SortOption } from '@/lib/types';

type ViewType = 'home' | 'results' | 'detail' | 'group';  // group 추가

interface FilterStore {
  currentView: ViewType;
  conditions: Set<Condition>;
  tastes: Set<TasteTag>;
  budget: number;
  query: string;
  sort: SortOption;
  selectedProduct: Product | null;

  setCurrentView: (view: ViewType) => void;
  setSelectedProduct: (product: Product | null) => void;

  toggleCondition: (condition: Condition) => void;
  toggleTaste: (taste: TasteTag) => void;
  setBudget: (budget: number) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortOption) => void;

  goToResults: () => void;
  goToGroup: () => void;  // group 뷰로 이동
}

export const useFilterStore = create<FilterStore>((set) => ({
  currentView: 'home',
  conditions: new Set<Condition>(),
  tastes: new Set<TasteTag>(),
  budget: 5000,
  query: '',
  sort: 'price_asc',
  selectedProduct: null,

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),

  toggleCondition: (condition) =>
    set((state) => {
      const next = new Set(state.conditions);
      if (next.has(condition)) next.delete(condition);
      else next.add(condition);
      return { conditions: next };
    }),

  toggleTaste: (taste) =>
    set((state) => {
      const next = new Set(state.tastes);
      if (next.has(taste)) next.delete(taste);
      else next.add(taste);
      return { tastes: next };
    }),

  setBudget: (budget) => set({ budget }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),

  goToResults: () => set({ currentView: 'results' }),
  goToGroup: () => set({ currentView: 'group' }),
}));
