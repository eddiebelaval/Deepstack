'use client';

/**
 * ResearchQualityBadge Component
 *
 * A small badge showing the research quality score.
 * Color-coded: red < 40, yellow 40-70, green > 70
 */

import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchQualityBadgeProps {
  score: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ResearchQualityBadge({
  score,
  showIcon = true,
  size = 'sm',
  className,
}: ResearchQualityBadgeProps) {
  const getColorClasses = () => {
    if (score >= 70) {
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    }
    if (score >= 40) {
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  const getLabel = () => {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Fair';
    return 'Weak';
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        getColorClasses(),
        textSize,
        className
      )}
    >
      {showIcon && <BookOpen className={iconSize} />}
      {score}%
    </Badge>
  );
}

/**
 * MaturityBadge Component
 *
 * Shows the thesis maturity level (nascent, developing, mature)
 */

interface MaturityBadgeProps {
  level: 'nascent' | 'developing' | 'mature';
  hours?: number;
  showIcon?: boolean;
  className?: string;
}

export function MaturityBadge({
  level,
  hours,
  showIcon = true,
  className,
}: MaturityBadgeProps) {
  const config = {
    nascent: {
      label: 'Nascent',
      color: 'bg-red-500/10 text-red-500 border-red-500/30',
    },
    developing: {
      label: 'Developing',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    },
    mature: {
      label: 'Mature',
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
    },
  };

  const formatHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${Math.round(h / 24)}d`;
  };

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium text-xs', config[level].color, className)}
    >
      {config[level].label}
      {hours !== undefined && <span className="opacity-70">({formatHours(hours)})</span>}
    </Badge>
  );
}

/**
 * ConvictionBadge Component
 *
 * Shows conviction score with trend indicator
 */

interface ConvictionBadgeProps {
  score: number;
  trend?: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  className?: string;
}

export function ConvictionBadge({
  score,
  trend,
  className,
}: ConvictionBadgeProps) {
  const getColorClasses = () => {
    // Very high conviction might indicate overconfidence
    if (score >= 90) {
      return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    }
    if (score >= 60) {
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    }
    if (score >= 40) {
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return '↑';
      case 'decreasing':
        return '↓';
      case 'volatile':
        return '↕';
      default:
        return '';
    }
  };

  const trendClass = trend === 'volatile' ? 'text-red-500' : '';

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium text-xs', getColorClasses(), className)}
    >
      {score}%
      {trend && trend !== 'stable' && (
        <span className={trendClass}>{getTrendIcon()}</span>
      )}
    </Badge>
  );
}
