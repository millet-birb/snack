'use client';

import { HeroSection } from '@/components/home/hero-section';
import { StatsStrip } from '@/components/home/stats-strip';
import { ConditionGrid } from '@/components/home/condition-grid';
import { TasteChips } from '@/components/home/taste-chips';
import { BudgetSlider } from '@/components/home/budget-slider';
import { CTAButton } from '@/components/home/cta-button';

export function HomeScreen() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <StatsStrip />
      <ConditionGrid />
      <TasteChips />
      <BudgetSlider />
      <CTAButton />
    </div>
  );
}
