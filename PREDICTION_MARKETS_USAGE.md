# Prediction Markets Frontend - Usage Guide

This document shows how to use the prediction markets infrastructure in your React components.

## Overview

The prediction markets system consists of:

1. **TypeScript Types** (`/web/src/lib/types/prediction-markets.ts`)
2. **Zustand Store** (`/web/src/lib/stores/prediction-markets-store.ts`)
3. **API Routes** (`/web/src/app/api/prediction-markets/`)
4. **API Client** (`/web/src/lib/api/prediction-markets.ts`)
5. **React Hook** (`/web/src/hooks/usePredictionMarkets.ts`)

## File Structure

```
web/src/
├── lib/
│   ├── types/
│   │   └── prediction-markets.ts         # TypeScript interfaces
│   ├── stores/
│   │   └── prediction-markets-store.ts   # Zustand state management
│   └── api/
│       └── prediction-markets.ts         # API client functions
├── hooks/
│   └── usePredictionMarkets.ts           # React hook
└── app/api/prediction-markets/
    ├── route.ts                          # GET /api/prediction-markets
    ├── search/
    │   └── route.ts                      # GET /api/prediction-markets/search
    └── [platform]/[marketId]/
        └── route.ts                      # GET /api/prediction-markets/{platform}/{marketId}
```

## Quick Start: Basic Market List

```typescript
'use client';

import { useEffect } from 'react';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';

export default function MarketsPage() {
  const { markets, isLoading, error, loadMarkets, isMockData } = usePredictionMarkets();

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  if (isLoading) return <div>Loading markets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {isMockData && (
        <div className="bg-yellow-100 p-4 mb-4">
          Using mock data - backend unavailable
        </div>
      )}

      <div className="grid gap-4">
        {markets.map((market) => (
          <div key={market.id} className="border p-4 rounded">
            <h3 className="font-bold">{market.title}</h3>
            <div className="flex justify-between mt-2">
              <span>YES: {(market.yesPrice * 100).toFixed(1)}%</span>
              <span>NO: {(market.noPrice * 100).toFixed(1)}%</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Volume: ${(market.volume / 1000000).toFixed(2)}M
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Market Search

```typescript
'use client';

import { useState } from 'react';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';

export default function MarketSearch() {
  const [query, setQuery] = useState('');
  const { markets, searchMarkets, isLoading } = usePredictionMarkets();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchMarkets(query);
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets..."
          className="border px-4 py-2 rounded w-full"
        />
      </form>

      {isLoading ? (
        <div>Searching...</div>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Filters

```typescript
'use client';

import { useEffect } from 'react';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';

export default function MarketsWithFilters() {
  const { markets, filters, setFilters, loadMarkets, isLoading } = usePredictionMarkets();

  useEffect(() => {
    loadMarkets();
  }, [filters, loadMarkets]);

  return (
    <div>
      {/* Filter Controls */}
      <div className="mb-4 flex gap-4">
        <select
          value={filters.source}
          onChange={(e) => setFilters({ source: e.target.value as any })}
          className="border px-4 py-2 rounded"
        >
          <option value="all">All Sources</option>
          <option value="kalshi">Kalshi</option>
          <option value="polymarket">Polymarket</option>
        </select>

        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ category: e.target.value || null })}
          className="border px-4 py-2 rounded"
        >
          <option value="">All Categories</option>
          <option value="Economics">Economics</option>
          <option value="Crypto">Crypto</option>
          <option value="Stocks">Stocks</option>
          <option value="Earnings">Earnings</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value as any })}
          className="border px-4 py-2 rounded"
        >
          <option value="volume">Volume</option>
          <option value="probability">Probability</option>
          <option value="expiration">Expiration</option>
        </select>
      </div>

      {/* Markets List */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Watchlist Management

```typescript
'use client';

import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

function MarketCard({ market }: { market: PredictionMarket }) {
  const { isInWatchlist, toggleWatchlist } = usePredictionMarkets();
  const inWatchlist = isInWatchlist(market.platform, market.id);

  return (
    <div className="border p-4 rounded">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold">{market.title}</h3>
          <div className="text-sm text-gray-500">
            {market.platform} • {market.category}
          </div>
        </div>

        <button
          onClick={() => toggleWatchlist(market)}
          className={`px-4 py-2 rounded ${
            inWatchlist
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </button>
      </div>

      <div className="mt-4 flex justify-between">
        <div>
          <div className="text-xs text-gray-500">YES</div>
          <div className="text-lg font-bold text-green-600">
            {(market.yesPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">NO</div>
          <div className="text-lg font-bold text-red-600">
            {(market.noPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">VOLUME</div>
          <div className="text-lg font-bold">
            ${(market.volume / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchlistPanel() {
  const { watchlist, removeFromWatchlist } = usePredictionMarkets();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Watchlist</h2>
      {watchlist.length === 0 ? (
        <div className="text-gray-500">No markets in watchlist</div>
      ) : (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div key={item.id} className="flex justify-between items-center border p-3 rounded">
              <div>
                <div className="font-medium">{item.marketTitle}</div>
                <div className="text-sm text-gray-500">
                  {item.platform} • {item.marketCategory}
                </div>
              </div>
              <button
                onClick={() => removeFromWatchlist(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Market Detail View

```typescript
'use client';

import { useEffect } from 'react';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';

export default function MarketDetailPage({
  params,
}: {
  params: { platform: string; marketId: string };
}) {
  const { selectedMarket, loadMarketDetail, isLoading, error } = usePredictionMarkets();

  useEffect(() => {
    loadMarketDetail(params.platform, params.marketId);
  }, [params.platform, params.marketId, loadMarketDetail]);

  if (isLoading) return <div>Loading market details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!selectedMarket) return <div>Market not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">
          {selectedMarket.platform} • {selectedMarket.category}
        </div>
        <h1 className="text-3xl font-bold">{selectedMarket.title}</h1>
        {selectedMarket.description && (
          <p className="mt-4 text-gray-700">{selectedMarket.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border p-6 rounded-lg">
          <div className="text-sm text-gray-500 mb-2">YES Price</div>
          <div className="text-4xl font-bold text-green-600">
            {(selectedMarket.yesPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div className="border p-6 rounded-lg">
          <div className="text-sm text-gray-500 mb-2">NO Price</div>
          <div className="text-4xl font-bold text-red-600">
            {(selectedMarket.noPrice * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500">Total Volume</div>
          <div className="text-xl font-bold">
            ${(selectedMarket.volume / 1000000).toFixed(2)}M
          </div>
        </div>
        {selectedMarket.volume24h && (
          <div>
            <div className="text-sm text-gray-500">24h Volume</div>
            <div className="text-xl font-bold">
              ${(selectedMarket.volume24h / 1000000).toFixed(2)}M
            </div>
          </div>
        )}
        {selectedMarket.endDate && (
          <div>
            <div className="text-sm text-gray-500">Ends</div>
            <div className="text-xl font-bold">
              {new Date(selectedMarket.endDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      <a
        href={selectedMarket.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
      >
        Trade on {selectedMarket.platform}
      </a>
    </div>
  );
}
```

## Direct API Usage (Without Hook)

If you prefer to use the API client directly:

```typescript
import {
  fetchTrendingMarkets,
  searchMarkets,
  fetchMarketDetail,
} from '@/lib/api/prediction-markets';

// Fetch markets
const { markets, mock } = await fetchTrendingMarkets({
  category: 'Crypto',
  source: 'polymarket',
  limit: 20,
});

// Search
const { markets: results } = await searchMarkets('Bitcoin');

// Get detail
const { market } = await fetchMarketDetail('kalshi', 'MOCK-FED-JAN25');
```

## Direct Store Usage (Without Hook)

If you need to access the store directly:

```typescript
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';

function MyComponent() {
  const markets = usePredictionMarketsStore((state) => state.markets);
  const setFilters = usePredictionMarketsStore((state) => state.setFilters);
  const watchlist = usePredictionMarketsStore((state) => state.watchlist);

  // ... use the store
}
```

## Environment Configuration

Make sure your `.env.local` has the backend URL configured:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Mock Data

All API routes automatically fall back to mock data when the backend is unavailable, allowing you to develop the UI independently of the backend.

## Next Steps

1. Build the UI components using these patterns
2. Integrate with the thesis system for market-thesis linking
3. Add real-time updates via WebSocket
4. Implement price charts and historical data visualization
