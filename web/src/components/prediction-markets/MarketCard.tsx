'use client';

import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { BetsCarouselCard } from './BetsCarouselCard';
import { MultiOutcomeCard } from './MultiOutcomeCard';
import { ScalarMarketCard } from './ScalarMarketCard';

/**
 * MarketCard - Unified market card that renders the appropriate visualization
 *
 * Automatically selects:
 * - BetsCarouselCard for binary Yes/No markets (with sparkline)
 * - MultiOutcomeCard for multi-choice markets (with stacked bar)
 * - ScalarMarketCard for range markets (with slider visualization)
 *
 * This is the recommended component to use in lists/carousels.
 */

interface MarketCardProps {
  market: PredictionMarket;
  isWatched?: boolean;
  onToggleWatch?: () => void;
  onClick?: () => void;
  className?: string;
}

export function MarketCard({
  market,
  isWatched,
  onToggleWatch,
  onClick,
  className,
}: MarketCardProps) {
  // Determine market type - fallback to binary if not specified
  const marketType = market.marketType || inferMarketType(market);

  switch (marketType) {
    case 'scalar':
      return (
        <ScalarMarketCard
          market={market}
          isWatched={isWatched}
          onToggleWatch={onToggleWatch}
          onClick={onClick}
          className={className}
        />
      );

    case 'multi':
      return (
        <MultiOutcomeCard
          market={market}
          isWatched={isWatched}
          onToggleWatch={onToggleWatch}
          onClick={onClick}
          className={className}
        />
      );

    case 'binary':
    default:
      return (
        <BetsCarouselCard
          market={market}
          isWatched={isWatched}
          onToggleWatch={onToggleWatch}
          onClick={onClick}
          className={className}
        />
      );
  }
}

/**
 * Infer market type from market data when marketType isn't explicitly set
 * This handles backwards compatibility with existing data
 */
function inferMarketType(market: PredictionMarket): 'binary' | 'scalar' | 'multi' {
  // If scalar bounds exist, it's a scalar market
  if (market.scalarBounds) {
    return 'scalar';
  }

  // Check outcomes array (with null safety)
  const outcomes = market.outcomes || [];
  if (outcomes.length > 0) {
    // If more than 2 outcomes and not Yes/No, it's multi
    if (outcomes.length > 2) {
      return 'multi';
    }

    // Check if outcomes are binary (Yes/No, Long/Short, etc.)
    const outcomeNames = outcomes.map(o => o.name.toLowerCase());
    const isBinaryPair =
      (outcomeNames.includes('yes') && outcomeNames.includes('no')) ||
      (outcomeNames.includes('long') && outcomeNames.includes('short'));

    if (isBinaryPair) {
      // Long/Short with bounds is scalar
      if (outcomeNames.includes('long') && outcomeNames.includes('short')) {
        return 'scalar';
      }
      return 'binary';
    }

    // 2 outcomes but not standard binary - treat as multi
    if (outcomes.length === 2 && !isBinaryPair) {
      return 'multi';
    }
  }

  // Default to binary (most common)
  return 'binary';
}

export default MarketCard;
