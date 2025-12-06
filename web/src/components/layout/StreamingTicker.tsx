"use client";

import { useEffect, useState, useCallback } from "react";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import { ConnectionDot } from "@/components/ui/ConnectionStatusIndicator";
import { cn } from "@/lib/utils";

// Default indices to always show
const DEFAULT_INDICES = ["SPY", "QQQ", "DIA", "IWM", "VIX"];

// Top movers (would come from API in production)
const TOP_MOVERS = ["NVDA", "AAPL", "TSLA", "AMD", "MSFT"];

type QuoteData = {
  symbol: string;
  price?: number;
  changePercent?: number;
};

type TickerItemProps = {
  symbol: string;
  price?: number;
  changePercent?: number;
};

function TickerItem({ symbol, price, changePercent }: TickerItemProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  const isNeutral = changePercent === undefined || changePercent === 0;

  return (
    <div className="flex items-center gap-3 px-4 whitespace-nowrap">
      {/* Symbol with LED glow */}
      <span className="led-text font-mono font-bold text-sm tracking-wide">
        {symbol}
      </span>

      {/* Price */}
      <span className="font-mono text-sm text-foreground/70">
        {price ? price.toFixed(2) : "—"}
      </span>

      {/* Change with color glow */}
      {changePercent !== undefined && (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            isNeutral && "text-muted-foreground",
            isPositive && !isNeutral && "led-profit",
            !isPositive && !isNeutral && "led-loss"
          )}
        >
          {isPositive ? "▲" : "▼"}
          {Math.abs(changePercent).toFixed(2)}%
        </span>
      )}

      {/* Separator dot */}
      <span className="text-primary/30 mx-2">•</span>
    </div>
  );
}

export function StreamingTicker() {
  const { quotes, wsConnected } = useMarketDataStore();
  const { getActiveWatchlist } = useWatchlistStore();
  const [isVisible, setIsVisible] = useState(true);
  const [localQuotes, setLocalQuotes] = useState<Record<string, QuoteData>>({});

  // Get watchlist symbols
  const activeWatchlist = getActiveWatchlist();
  const watchlistSymbols = activeWatchlist?.items.map((i) => i.symbol) ?? [];

  // Combine indices + movers + watchlist (deduplicated)
  const allSymbols = [
    ...DEFAULT_INDICES,
    ...TOP_MOVERS.filter((s) => !DEFAULT_INDICES.includes(s)),
    ...watchlistSymbols.filter(
      (s) => !DEFAULT_INDICES.includes(s) && !TOP_MOVERS.includes(s)
    ),
  ];

  // Fetch quotes from API
  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/market/quotes?symbols=${allSymbols.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        const newQuotes: Record<string, QuoteData> = {};

        for (const symbol of allSymbols) {
          const quote = data.quotes?.[symbol];
          if (quote) {
            newQuotes[symbol] = {
              symbol,
              price: quote.last || quote.ask || 0,
              changePercent: quote.changePercent,
            };
          }
        }

        setLocalQuotes(newQuotes);
      }
    } catch (error) {
      console.error('Error fetching ticker quotes:', error);
    }
  }, [allSymbols.join(',')]);

  // Fetch quotes on mount and periodically
  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  // Always visible for now (can make contextual later)
  useEffect(() => {
    setIsVisible(true);
  }, [quotes, wsConnected]);

  if (!isVisible) return null;

  // Build ticker items - prefer store quotes, fallback to local
  const tickerItems = allSymbols.map((symbol) => {
    const storeQuote = quotes[symbol];
    const local = localQuotes[symbol];
    return {
      symbol,
      price: storeQuote?.last || local?.price,
      changePercent: storeQuote?.changePercent ?? local?.changePercent,
    };
  });

  // Triplicate items for seamless infinite scroll
  const duplicatedItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="led-ticker-container h-9 overflow-hidden relative">
      {/* Connection status dot */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
        <ConnectionDot />
      </div>

      {/* Strong dissolving edge gradients */}
      <div className="absolute left-0 top-0 h-full w-24 led-fade-left z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-24 led-fade-right z-10 pointer-events-none" />

      {/* Ticker content */}
      <div className="animate-ticker-led flex items-center h-full">
        {duplicatedItems.map((item, index) => (
          <TickerItem
            key={`${item.symbol}-${index}`}
            symbol={item.symbol}
            price={item.price}
            changePercent={item.changePercent}
          />
        ))}
      </div>
    </div>
  );
}
