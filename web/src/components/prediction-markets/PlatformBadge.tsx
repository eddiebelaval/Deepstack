import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/types/prediction-markets';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * PlatformBadge - Displays a colored badge for Kalshi or Polymarket
 *
 * Usage:
 * <PlatformBadge platform="kalshi" />
 * <PlatformBadge platform="polymarket" size="sm" />
 */
export function PlatformBadge({ platform, size = 'md', className }: PlatformBadgeProps) {
  const styles = {
    kalshi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    polymarket: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium border',
        sizeStyles[size],
        styles[platform],
        className
      )}
    >
      {platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
    </span>
  );
}
