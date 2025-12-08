/**
 * Prediction Markets API Client
 *
 * Provides typed functions for fetching prediction market data from the backend.
 * Automatically falls back to mock data when backend is unavailable.
 *
 * Usage Examples:
 *
 * ```typescript
 * // Fetch trending markets
 * const { markets, mock } = await fetchTrendingMarkets();
 *
 * // Fetch markets by category
 * const { markets } = await fetchTrendingMarkets({ category: 'Crypto' });
 *
 * // Search markets
 * const { markets } = await searchMarkets('Bitcoin');
 *
 * // Get market detail
 * const { market } = await fetchMarketDetail('polymarket', 'MOCK-BTC-100K');
 * ```
 */

import type { PredictionMarket } from '@/lib/types/prediction-markets';

export interface FetchMarketsOptions {
  limit?: number;
  category?: string;
  source?: 'all' | 'kalshi' | 'polymarket';
}

export interface MarketsResponse {
  markets: PredictionMarket[];
  mock?: boolean;
}

export interface MarketDetailResponse {
  market: PredictionMarket & {
    priceHistory?: Array<{ timestamp: string; yesPrice: number; volume?: number }>;
  };
  mock?: boolean;
}

/**
 * Fetch trending prediction markets
 */
export async function fetchTrendingMarkets(
  options: FetchMarketsOptions = {}
): Promise<MarketsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.category) params.append('category', options.category);
  if (options.source) params.append('source', options.source);

  const response = await fetch(`/api/prediction-markets?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search prediction markets by query
 */
export async function searchMarkets(query: string): Promise<MarketsResponse> {
  const response = await fetch(
    `/api/prediction-markets/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to search markets: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch detailed information for a specific market
 */
export async function fetchMarketDetail(
  platform: string,
  marketId: string
): Promise<MarketDetailResponse> {
  const response = await fetch(`/api/prediction-markets/${platform}/${marketId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market detail: ${response.statusText}`);
  }

  return response.json();
}
