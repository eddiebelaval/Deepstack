'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { CategoryUsage } from '@/lib/stores/credit-store';

interface UsageCategoryBarProps {
  categories: CategoryUsage[];
  totalUsed: number;
  tierLimit: number;
  className?: string;
}

/**
 * Horizontal stacked bar showing usage breakdown by category.
 * Each segment represents a category's proportion of total usage.
 */
export function UsageCategoryBar({
  categories,
  totalUsed,
  tierLimit,
  className,
}: UsageCategoryBarProps) {
  // Calculate percentage for each category relative to tier limit
  const getPercentWidth = (credits: number) => {
    if (tierLimit === 0) return 0;
    return Math.max(0, Math.min(100, (credits / tierLimit) * 100));
  };

  // Sort categories by credits used (descending) for visual clarity
  const sortedCategories = [...categories].sort((a, b) => b.credits - a.credits);

  // Calculate total percentage used
  const totalPercent = totalUsed > 0 ? getPercentWidth(totalUsed) : 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Stacked bar */}
      <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
        {/* Category segments */}
        <div className="absolute inset-0 flex">
          {sortedCategories.map((category, index) => {
            const width = getPercentWidth(category.credits);
            if (width === 0) return null;

            return (
              <div
                key={category.category}
                className={cn(
                  'h-full transition-all duration-500',
                  index === 0 && 'rounded-l-full',
                  index === sortedCategories.filter((c) => c.credits > 0).length - 1 &&
                    'rounded-r-full'
                )}
                style={{
                  width: `${width}%`,
                  backgroundColor: category.color,
                }}
                title={`${category.label}: ${category.credits} credits`}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sortedCategories.map((category) => (
          <div key={category.category} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-xs text-muted-foreground">
              {category.label}
            </span>
            <span className="text-xs font-medium tabular-nums">
              {category.credits}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {totalUsed.toLocaleString()} / {tierLimit.toLocaleString()} credits used
        </span>
        <span className="font-medium">{totalPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/**
 * Individual category row with progress bar.
 * Use this for detailed breakdown in the Usage Panel.
 */
interface UsageCategoryRowProps {
  category: CategoryUsage;
  maxCredits: number; // Max credits for this category (for bar scaling)
  className?: string;
}

export function UsageCategoryRow({
  category,
  maxCredits,
  className,
}: UsageCategoryRowProps) {
  const percent = maxCredits > 0 ? (category.credits / maxCredits) * 100 : 0;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-muted-foreground">{category.label}</span>
        </div>
        <span className="font-medium tabular-nums">{category.credits}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundColor: category.color,
          }}
        />
      </div>
    </div>
  );
}
