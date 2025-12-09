export type Platform = 'kalshi' | 'polymarket';

/**
 * Market types based on Polymarket/Kalshi API structures:
 * - binary: Standard Yes/No markets (most common)
 * - scalar: Range markets with Long/Short, bounded by lowerBound/upperBound
 * - multi: Multiple custom outcomes (e.g., "Who will be PM?" with candidate list)
 */
export type MarketType = 'binary' | 'scalar' | 'multi';

/**
 * Individual outcome within a market (for multi-outcome support)
 */
export interface MarketOutcome {
  name: string;
  price: number;  // 0-1 (probability/price)
  /** Token ID for trading on Polymarket */
  tokenId?: string;
}

/**
 * Scalar market bounds (for range markets like "BTC price between $X-$Y")
 */
export interface ScalarBounds {
  lower: number;
  upper: number;
  formatType?: 'decimal' | 'number';
}

/**
 * Unified prediction market interface supporting all market types
 */
export interface PredictionMarket {
  id: string;
  platform: Platform;
  title: string;
  category: string;

  /** Market type determines how outcomes are structured (defaults to 'binary') */
  marketType?: MarketType;

  /** All outcomes for this market (optional for backwards compatibility) */
  outcomes?: MarketOutcome[];

  // Legacy binary fields (kept for backwards compatibility)
  yesPrice: number;  // 0-1 (probability)
  noPrice: number;

  /** Scalar market bounds (only for marketType='scalar') */
  scalarBounds?: ScalarBounds;

  volume: number;
  volume24h?: number;
  openInterest?: number;
  endDate?: string;
  status: 'active' | 'closed' | 'settled';
  url: string;
  description?: string;

  /** Parent event for grouped markets (e.g., elections with multiple questions) */
  eventId?: string;
  eventTitle?: string;

  /** Series for recurring markets (e.g., weekly BTC price) */
  seriesId?: string;
}

export interface MarketPricePoint {
  timestamp: string;
  yesPrice: number;
  volume?: number;
}

export interface WatchlistItem {
  id: string;
  platform: Platform;
  externalMarketId: string;
  marketTitle: string;
  marketCategory?: string;
  notes?: string;
  alertThresholdHigh?: number;
  alertThresholdLow?: number;
  trackedPosition?: 'yes' | 'no';
  trackedEntryPrice?: number;
  trackedQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThesisMarketLink {
  id: string;
  thesisId: string;
  platform: Platform;
  externalMarketId: string;
  marketTitle: string;
  relationship: 'supports' | 'contradicts' | 'correlates' | 'hedges';
  aiAnalysis?: string;
  confidenceScore?: number;
  userNotes?: string;
  priceAtLink?: number;
  createdAt: string;
}

export interface MarketFilters {
  source: 'all' | Platform;
  category: string | null;
  status: 'active' | 'closed' | 'all';
  search: string;
  sort: 'volume' | 'expiration' | 'probability' | 'change';
}
