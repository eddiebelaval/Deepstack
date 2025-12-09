'use client';

/**
 * Test page for Prediction Markets infrastructure
 *
 * Visit http://localhost:3000/test-prediction-markets to see this in action
 *
 * This demonstrates:
 * - Loading markets from API
 * - Filtering by source and category
 * - Search functionality
 * - Watchlist management
 * - Service unavailable state indicator
 */

import { useEffect, useState } from 'react';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

export default function TestPredictionMarketsPage() {
  const {
    markets,
    watchlist,
    filters,
    isLoading,
    error,
    isUnavailable,
    loadMarkets,
    searchMarkets,
    setFilters,
    toggleWatchlist,
    isInWatchlist,
  } = usePredictionMarkets();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMarkets();
  }, [filters.source, filters.category, loadMarkets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMarkets(searchQuery);
    } else {
      loadMarkets();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Prediction Markets Test</h1>

      {/* Service Unavailable Indicator */}
      {isUnavailable && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded mb-6">
          <strong>Service Unavailable:</strong> Prediction markets service is currently down. Please try again later.
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ source: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All Sources</option>
              <option value="kalshi">Kalshi</option>
              <option value="polymarket">Polymarket</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters({ category: e.target.value || null })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              <option value="Economics">Economics</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Earnings">Earnings</option>
              <option value="Commodities">Commodities</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="volume">Volume</option>
              <option value="probability">Probability</option>
              <option value="expiration">Expiration</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets..."
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadMarkets();
              }}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Watchlist Summary */}
      {watchlist.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Watchlist</h2>
          <p className="text-gray-700">
            You are watching {watchlist.length} market{watchlist.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-2 space-y-1">
            {watchlist.slice(0, 3).map((item) => (
              <div key={item.id} className="text-sm text-gray-600">
                • {item.marketTitle}
              </div>
            ))}
            {watchlist.length > 3 && (
              <div className="text-sm text-gray-600">
                ... and {watchlist.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Markets List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Markets {searchQuery && `(searching for "${searchQuery}")`}
          </h2>
          <div className="text-gray-600">
            {markets.length} market{markets.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading markets...</div>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-600">No markets found</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                isWatched={isInWatchlist(market.platform, market.id)}
                onToggleWatchlist={() => toggleWatchlist(market)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketCard({
  market,
  isWatched,
  onToggleWatchlist,
}: {
  market: PredictionMarket;
  isWatched: boolean;
  onToggleWatchlist: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{market.title}</h3>
          <div className="flex gap-2 text-sm text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded">{market.platform}</span>
            <span className="bg-gray-100 px-2 py-1 rounded">{market.category}</span>
            <span className="bg-gray-100 px-2 py-1 rounded">{market.status}</span>
          </div>
        </div>

        <button
          onClick={onToggleWatchlist}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isWatched
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isWatched ? '★ Watching' : '☆ Watch'}
        </button>
      </div>

      {market.description && (
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">{market.description}</p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">YES</div>
          <div className="text-2xl font-bold text-green-600">
            {(market.yesPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">NO</div>
          <div className="text-2xl font-bold text-red-600">
            {(market.noPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">VOLUME</div>
          <div className="text-2xl font-bold text-gray-700">
            ${(market.volume / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {market.volume24h && (
        <div className="text-sm text-gray-600 mb-2">
          24h Volume: ${(market.volume24h / 1000000).toFixed(2)}M
        </div>
      )}

      {market.endDate && (
        <div className="text-sm text-gray-600 mb-2">
          Ends: {new Date(market.endDate).toLocaleDateString()}
        </div>
      )}

      <a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
      >
        View on {market.platform} →
      </a>
    </div>
  );
}
