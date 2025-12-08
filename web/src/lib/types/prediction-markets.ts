export type Platform = 'kalshi' | 'polymarket';

export interface PredictionMarket {
  id: string;
  platform: Platform;
  title: string;
  category: string;
  yesPrice: number;  // 0-1 (probability)
  noPrice: number;
  volume: number;
  volume24h?: number;
  openInterest?: number;
  endDate?: string;
  status: 'active' | 'closed' | 'settled';
  url: string;
  description?: string;
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
