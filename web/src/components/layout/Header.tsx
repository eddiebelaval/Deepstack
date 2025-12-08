"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Search,
  Settings,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Type for asset search results
type AssetResult = {
  symbol: string;
  name: string;
  class: 'us_equity' | 'crypto';
  exchange: string;
};

// Popular symbols for quick access (shown when no search query)
const POPULAR_SYMBOLS: AssetResult[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", class: "us_equity", exchange: "ARCA" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", class: "us_equity", exchange: "NASDAQ" },
  { symbol: "AAPL", name: "Apple Inc.", class: "us_equity", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corp.", class: "us_equity", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corp.", class: "us_equity", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", class: "us_equity", exchange: "NASDAQ" },
  { symbol: "BTC/USD", name: "Bitcoin", class: "crypto", exchange: "CRYPTO" },
  { symbol: "ETH/USD", name: "Ethereum", class: "crypto", exchange: "CRYPTO" },
];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AssetResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { activeSymbol, setActiveSymbol, showChatPanel, toggleChatPanel } = useTradingStore();
  const { wsConnected, quotes } = useMarketDataStore();
  const { rightSidebarOpen, toggleRightSidebar } = useUIStore();

  // Get quote for active symbol
  const activeQuote = quotes[activeSymbol];

  // Debounced search function
  const searchAssets = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/market/assets?search=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      setSearchResults(data.assets || []);
    } catch (error) {
      console.error('Failed to search assets:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search query changes with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce API call by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      searchAssets(value);
    }, 300);
  }, [searchAssets]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for symbol search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd/Ctrl + J for chat toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        toggleChatPanel();
      }
      // Cmd/Ctrl + M for market data panel toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault();
        toggleRightSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleChatPanel, toggleRightSidebar]);

  const handleSymbolSelect = useCallback(
    (symbol: string) => {
      setActiveSymbol(symbol);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    },
    [setActiveSymbol]
  );

  // Display either search results or popular symbols
  const displaySymbols = searchQuery.length > 0 ? searchResults : POPULAR_SYMBOLS;

  return (
    <TooltipProvider>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-primary">
              DEEPSTACK
            </span>
          </Link>

          {/* Active Symbol Display */}
          {activeQuote && (
            <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-muted rounded-md glass-input">
              <span className="font-semibold">{activeSymbol}</span>
              <span className="text-foreground">
                ${activeQuote.last?.toFixed(2) ?? "—"}
              </span>
              {activeQuote.changePercent !== undefined && (
                <span
                  className={`flex items-center gap-1 ${activeQuote.changePercent >= 0 ? "text-profit" : "text-loss"
                    }`}
                >
                  {activeQuote.changePercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {activeQuote.changePercent >= 0 ? "+" : ""}
                  {activeQuote.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Symbol Search */}
        <div className="flex-1 max-w-md">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Search symbols...</span>
            <span className="sm:hidden">Search</span>
            <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${wsConnected
                  ? "bg-profit/20 text-profit"
                  : "bg-loss/20 text-loss"
                  }`}
              >
                {wsConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {wsConnected ? "Live" : "Offline"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {wsConnected
                ? "Connected to real-time data"
                : "Disconnected from real-time data"}
            </TooltipContent>
          </Tooltip>

          {/* Market Data Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rightSidebarOpen ? "secondary" : "ghost"}
                size="icon"
                onClick={toggleRightSidebar}
                aria-label="Toggle Market Data"
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Market Data
              <kbd className="ml-2 rounded border bg-muted px-1 font-mono text-[10px]">
                ⌘M
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* Chat Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showChatPanel ? "secondary" : "ghost"}
                size="icon"
                onClick={toggleChatPanel}
                aria-label="Toggle AI Chat"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Toggle AI Chat
              <kbd className="ml-2 rounded border bg-muted px-1 font-mono text-[10px]">
                ⌘J
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>

        {/* Symbol Search Dialog */}
        <CommandDialog
          open={searchOpen}
          onOpenChange={(open) => {
            setSearchOpen(open);
            if (!open) {
              setSearchQuery("");
              setSearchResults([]);
            }
          }}
          title="Search Symbols"
          description="Search for a stock or crypto symbol to view"
        >
          <CommandInput
            placeholder="Search 10,000+ symbols (e.g., AAPL, BTC)..."
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : displaySymbols.length === 0 ? (
              <CommandEmpty>No symbols found for &quot;{searchQuery}&quot;</CommandEmpty>
            ) : (
              <CommandGroup heading={searchQuery ? `Results for "${searchQuery}"` : "Popular Symbols"}>
                {displaySymbols.map((item) => (
                  <CommandItem
                    key={item.symbol}
                    value={item.symbol}
                    onSelect={() => handleSymbolSelect(item.symbol)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.symbol}</span>
                      <span className="text-muted-foreground text-sm truncate max-w-[200px]">
                        {item.name}
                      </span>
                    </div>
                    <Badge
                      variant={item.class === 'crypto' ? 'secondary' : 'outline'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.class === 'crypto' ? '₿' : item.exchange}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </header>
    </TooltipProvider>
  );
}
