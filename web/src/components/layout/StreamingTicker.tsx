"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState, useCallback } from "react";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { ConnectionDot } from "@/components/ui/ConnectionStatusIndicator";
import { cn } from "@/lib/utils";

// Sidebar dimensions (must match DeepStackLayout)
const LEFT_SIDEBAR_EXPANDED = 256; // ml-64 = 16rem = 256px
const LEFT_SIDEBAR_COLLAPSED = 56;  // ml-14 = 3.5rem = 56px
const RIGHT_TOOLBAR_WIDTH = 48;     // w-12 = 3rem = 48px
const RIGHT_SIDEBAR_EXPANDED = 336; // 21rem = 336px
const RIGHT_SIDEBAR_COLLAPSED = 0;  // Hidden when collapsed

// Core indices - curated essentials (reduced from 5)
const DEFAULT_INDICES = ["SPY", "QQQ", "VIX"];

// Top movers - key tech names (reduced from 5)
const TOP_MOVERS = ["NVDA", "TSLA"];

// Crypto pairs - top 3 only (reduced from 5)
const CRYPTO_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD"];

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

  // Format symbol for display (BTC/USD -> BTC)
  const displaySymbol = symbol.includes('/') ? symbol.split('/')[0] : symbol;
  const isCrypto = symbol.includes('/');

  return (
    <div className="flex items-center gap-3 px-4 whitespace-nowrap">
      {/* Symbol with LED glow - crypto gets special styling */}
      <span className={cn(
        "font-mono font-bold text-sm tracking-wide",
        isCrypto ? "text-amber-400" : "led-text"
      )}>
        {displaySymbol}
      </span>

      {/* Price - crypto uses more decimals */}
      <span className="font-mono text-sm text-foreground/70">
        {price ? (isCrypto && price > 100 ? price.toFixed(0) : price.toFixed(2)) : "—"}
      </span>

      {/* Change with prominent arrow and color glow */}
      {changePercent !== undefined && (
        <span
          className={cn(
            "flex items-center gap-1 font-mono text-sm font-semibold",
            isNeutral && "text-muted-foreground",
            isPositive && !isNeutral && "led-profit",
            !isPositive && !isNeutral && "led-loss"
          )}
        >
          {/* Arrow with enhanced visibility */}
          <span className="text-base leading-none">
            {isPositive ? "↑" : "↓"}
          </span>
          <span>{Math.abs(changePercent).toFixed(2)}%</span>
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
  const { leftSidebarOpen, rightSidebarOpen } = useUIStore();
  const [isVisible, setIsVisible] = useState(true);
  const [localQuotes, setLocalQuotes] = useState<Record<string, QuoteData>>({});

  // Calculate margins to stay within center panel
  const leftMargin = leftSidebarOpen ? LEFT_SIDEBAR_EXPANDED : LEFT_SIDEBAR_COLLAPSED;
  const rightMargin = RIGHT_TOOLBAR_WIDTH + (rightSidebarOpen ? RIGHT_SIDEBAR_EXPANDED : RIGHT_SIDEBAR_COLLAPSED);

  // Get watchlist symbols
  const activeWatchlist = getActiveWatchlist();
  const watchlistSymbols = activeWatchlist?.items.map((i) => i.symbol) ?? [];

  // Combine indices + movers + crypto + watchlist (deduplicated)
  const allSymbols = [
    ...DEFAULT_INDICES,
    ...TOP_MOVERS.filter((s) => !DEFAULT_INDICES.includes(s)),
    ...CRYPTO_SYMBOLS,
    ...watchlistSymbols.filter(
      (s) => !DEFAULT_INDICES.includes(s) && !TOP_MOVERS.includes(s) && !CRYPTO_SYMBOLS.includes(s)
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
  }, [allSymbols]);

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
    <div
      className="led-ticker-container h-9 overflow-hidden fixed top-0 z-40 transition-all duration-300"
      style={{ left: leftMargin, right: rightMargin }}
    >
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
