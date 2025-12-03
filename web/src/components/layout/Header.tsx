"use client";

import { useCallback, useEffect, useState } from "react";
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

// Popular symbols for quick access
const POPULAR_SYMBOLS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { activeSymbol, setActiveSymbol, showChatPanel, toggleChatPanel } = useTradingStore();
  const { wsConnected, quotes } = useMarketDataStore();
  const { rightSidebarOpen, toggleRightSidebar } = useUIStore();

  // Get quote for active symbol
  const activeQuote = quotes[activeSymbol];

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
    },
    [setActiveSymbol]
  );

  // Filter symbols based on search
  const filteredSymbols = searchQuery
    ? POPULAR_SYMBOLS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_SYMBOLS;

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
                  className={`flex items-center gap-1 ${
                    activeQuote.changePercent >= 0 ? "text-profit" : "text-loss"
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
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  wsConnected
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
          onOpenChange={setSearchOpen}
          title="Search Symbols"
          description="Search for a stock symbol to view"
        >
          <CommandInput
            placeholder="Search symbols (e.g., AAPL, SPY)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No symbols found.</CommandEmpty>
            <CommandGroup heading="Popular Symbols">
              {filteredSymbols.map((item) => (
                <CommandItem
                  key={item.symbol}
                  value={item.symbol}
                  onSelect={() => handleSymbolSelect(item.symbol)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="text-muted-foreground text-sm">
                      {item.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </header>
    </TooltipProvider>
  );
}
