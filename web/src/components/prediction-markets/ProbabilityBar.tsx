import { cn } from '@/lib/utils';

interface ProbabilityBarProps {
  yesPrice: number; // 0-1 probability
  compact?: boolean;
  showLabels?: boolean;
  className?: string;
}

/**
 * ProbabilityBar - Visual probability split for Yes/No outcomes
 *
 * Usage:
 * <ProbabilityBar yesPrice={0.65} showLabels />
 * <ProbabilityBar yesPrice={0.42} compact />
 */
export function ProbabilityBar({
  yesPrice,
  compact = false,
  showLabels = false,
  className,
}: ProbabilityBarProps) {
  const yesPercent = Math.round(yesPrice * 100);
  const noPercent = 100 - yesPercent;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>Yes {yesPercent}%</span>
          <span>No {noPercent}%</span>
        </div>
      )}
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-full bg-slate-800',
          compact ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className="bg-green-500 transition-all duration-300"
          style={{ width: `${yesPercent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${noPercent}%` }}
        />
      </div>
      {!showLabels && !compact && (
        <div className="text-xs text-slate-400 text-center">
          {yesPercent}% Yes
        </div>
      )}
    </div>
  );
}
