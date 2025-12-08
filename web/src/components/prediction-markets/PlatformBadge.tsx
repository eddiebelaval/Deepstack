import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/types/prediction-markets';

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

/**
 * PlatformBadge - Displays a colored badge for Kalshi or Polymarket
 *
 * Usage:
 * <PlatformBadge platform="kalshi" />
 * <PlatformBadge platform="polymarket" />
 */
export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const styles = {
    kalshi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    polymarket: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        styles[platform],
        className
      )}
    >
      {platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
    </span>
  );
}
