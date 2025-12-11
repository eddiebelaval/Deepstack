"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { Clock, Plus, Search, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Popular trading symbols
const POPULAR_SYMBOLS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "BTC/USD", name: "Bitcoin" },
  { symbol: "ETH/USD", name: "Ethereum" },
  { symbol: "SOL/USD", name: "Solana" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
];

// Symbol database for search (would be API-based in production)
const SYMBOL_DATABASE = [
  ...POPULAR_SYMBOLS,
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "UBER", name: "Uber Technologies Inc." },
  { symbol: "BA", name: "Boeing Co." },
  { symbol: "GS", name: "Goldman Sachs Group" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF" },
  { symbol: "XLF", name: "Financial Select Sector SPDR" },
  { symbol: "XLK", name: "Technology Select Sector SPDR" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "USO", name: "United States Oil Fund" },
  { symbol: "VIX", name: "CBOE Volatility Index" },
  { symbol: "DOGE/USD", name: "Dogecoin" },
  { symbol: "ADA/USD", name: "Cardano" },
  { symbol: "DOT/USD", name: "Polkadot" },
  { symbol: "MATIC/USD", name: "Polygon" },
  { symbol: "LTC/USD", name: "Litecoin" },
];

type SymbolSearchProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SymbolSearch({ open: controlledOpen, onOpenChange }: SymbolSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Use controlled or internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { setActiveSymbol } = useTradingStore();
  const { addSymbol, activeWatchlistId, getActiveWatchlist } = useWatchlistStore();
  const { quotes } = useMarketDataStore();

  const activeWatchlist = getActiveWatchlist();
  // Memoize watchlist symbols to prevent dependency issues
  const watchlistSymbols = useMemo(() => {
    return activeWatchlist?.items.map((i) => i.symbol) || [];
  }, [activeWatchlist?.items]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("deepstack-recent-searches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const handleSelect = useCallback(
    (symbol: string) => {
      setActiveSymbol(symbol);
      setOpen(false);

      // Update recent searches
      const updated = [symbol, ...recentSearches.filter((s) => s !== symbol)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("deepstack-recent-searches", JSON.stringify(updated));
    },
    [setActiveSymbol, setOpen, recentSearches]
  );

  const handleAddToWatchlist = useCallback(
    (symbol: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (activeWatchlistId && !watchlistSymbols.includes(symbol)) {
        addSymbol(activeWatchlistId, symbol);
      }
    },
    [activeWatchlistId, addSymbol, watchlistSymbols]
  );

  const getQuoteDisplay = (symbol: string) => {
    const quote = quotes[symbol];
    if (!quote?.last) return null;
    const changePercent = quote.changePercent ?? 0;
    const isPositive = changePercent >= 0;
    return (
      <span
        className={cn(
          "text-xs font-medium",
          isPositive ? "text-profit" : "text-loss"
        )}
      >
        ${quote.last.toFixed(2)} ({isPositive ? "+" : ""}
        {changePercent.toFixed(2)}%)
      </span>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search symbols... (e.g., AAPL, BTC/USD)" />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center text-sm">
            <p className="text-muted-foreground">No symbols found.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching by symbol or company name
            </p>
          </div>
        </CommandEmpty>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <CommandGroup heading="Recent">
            {recentSearches.map((symbol) => {
              const symbolData = SYMBOL_DATABASE.find((s) => s.symbol === symbol);
              return (
                <CommandItem
                  key={`recent-${symbol}`}
                  value={symbol}
                  onSelect={() => handleSelect(symbol)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{symbol}</span>
                      {symbolData && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {symbolData.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {getQuoteDisplay(symbol)}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Popular Symbols */}
        <CommandGroup heading="Popular">
          {POPULAR_SYMBOLS.map(({ symbol, name }) => (
            <CommandItem
              key={`popular-${symbol}`}
              value={`${symbol} ${name}`}
              onSelect={() => handleSelect(symbol)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{symbol}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getQuoteDisplay(symbol)}
                {!watchlistSymbols.includes(symbol) && (
                  <button
                    onClick={(e) => handleAddToWatchlist(symbol, e)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Add to watchlist"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {watchlistSymbols.includes(symbol) && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* All Symbols (searchable) */}
        <CommandGroup heading="All Symbols">
          {SYMBOL_DATABASE.filter(
            (s) => !POPULAR_SYMBOLS.find((p) => p.symbol === s.symbol)
          ).map(({ symbol, name }) => (
            <CommandItem
              key={`all-${symbol}`}
              value={`${symbol} ${name}`}
              onSelect={() => handleSelect(symbol)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{symbol}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getQuoteDisplay(symbol)}
                {!watchlistSymbols.includes(symbol) && (
                  <button
                    onClick={(e) => handleAddToWatchlist(symbol, e)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Add to watchlist"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {watchlistSymbols.includes(symbol) && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default SymbolSearch;
