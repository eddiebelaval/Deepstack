'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { UserTier } from '@/lib/stores/credit-store';

interface UsageProgressRingProps {
  credits: number;
  tierLimit: number;
  tier: UserTier;
  size?: 'sm' | 'md' | 'lg';
  showCredits?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    svgSize: 'w-20 h-20',
    radius: 32,
    strokeWidth: 6,
    textSize: 'text-lg',
    labelSize: 'text-[10px]',
  },
  md: {
    svgSize: 'w-32 h-32',
    radius: 52,
    strokeWidth: 8,
    textSize: 'text-2xl',
    labelSize: 'text-xs',
  },
  lg: {
    svgSize: 'w-40 h-40',
    radius: 68,
    strokeWidth: 10,
    textSize: 'text-3xl',
    labelSize: 'text-sm',
  },
};

const TIER_COLORS: Record<UserTier, { gradient: string; text: string }> = {
  free: {
    gradient: 'from-slate-400 to-slate-600',
    text: 'text-slate-400',
  },
  pro: {
    gradient: 'from-blue-400 to-blue-600',
    text: 'text-blue-400',
  },
  elite: {
    gradient: 'from-amber-400 to-amber-600',
    text: 'text-amber-400',
  },
};

/**
 * Circular progress ring showing credit usage.
 * Shows remaining credits as filled portion (more remaining = more filled).
 */
export function UsageProgressRing({
  credits,
  tierLimit,
  tier,
  size = 'md',
  showCredits = true,
  className,
}: UsageProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const tierColor = TIER_COLORS[tier];

  // Calculate remaining percentage (inverted - we show remaining, not used)
  const remainingPercent = tierLimit > 0 ? Math.min(100, (credits / tierLimit) * 100) : 0;

  // Calculate circumference for progress circle
  const circumference = 2 * Math.PI * config.radius;
  const progressOffset = circumference - (remainingPercent / 100) * circumference;

  // Determine color based on remaining percentage
  const getProgressColor = () => {
    if (remainingPercent > 50) return 'text-emerald-400';
    if (remainingPercent > 25) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: 'fit-content' }}>
        {/* SVG Progress Ring */}
        <svg
          className={cn(config.svgSize, 'transform -rotate-90')}
          viewBox={`0 0 ${config.radius * 2 + config.strokeWidth * 2} ${config.radius * 2 + config.strokeWidth * 2}`}
        >
          {/* Background circle */}
          <circle
            className="text-muted/30"
            strokeWidth={config.strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={config.radius}
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            className={cn('transition-all duration-700 ease-out', getProgressColor())}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={config.radius}
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {showCredits && (
              <>
                <div className={cn('font-bold tabular-nums', config.textSize)}>
                  {credits.toLocaleString()}
                </div>
                <div className={cn('text-muted-foreground', config.labelSize)}>
                  of {tierLimit.toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tier badge below ring */}
      <div
        className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider',
          tier === 'elite' && 'bg-amber-500/10 text-amber-400',
          tier === 'pro' && 'bg-blue-500/10 text-blue-400',
          tier === 'free' && 'bg-muted text-muted-foreground'
        )}
      >
        {tier}
      </div>
    </div>
  );
}
