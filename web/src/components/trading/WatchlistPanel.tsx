"use client";

import { useState, useRef } from "react";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DotScrollIndicator } from "@/components/ui/DotScrollIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WatchlistPanel() {
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlist,
    addSymbol,
    removeSymbol,
    getActiveWatchlist,
  } = useWatchlistStore();

  const { activeSymbol, setActiveSymbol } = useTradingStore();
  const { quotes } = useMarketDataStore();

  const activeWatchlist = getActiveWatchlist();

  const handleAddSymbol = () => {
    if (newSymbol.trim() && activeWatchlistId) {
      addSymbol(activeWatchlistId, newSymbol.trim().toUpperCase());
      setNewSymbol("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddSymbol();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewSymbol("");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between font-semibold"
            >
              {activeWatchlist?.name || "Watchlist"}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {watchlists.map((wl) => (
              <DropdownMenuItem
                key={wl.id}
                onClick={() => setActiveWatchlist(wl.id)}
                className={cn(
                  activeWatchlistId === wl.id && "bg-accent"
                )}
              >
                {wl.name}
                <span className="ml-auto text-xs text-muted-foreground">
                  {wl.items.length}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="h-4 w-4 mr-2" />
              New Watchlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Symbol List */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
          <div className="p-1">
          {activeWatchlist?.items.map((item) => {
            const quote = quotes[item.symbol];
            const isActive = item.symbol === activeSymbol;
            const changePercent = quote?.changePercent ?? 0;
            const isPositive = changePercent >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => setActiveSymbol(item.symbol)}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                  isActive
                    ? "bg-accent"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm">{item.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {quote ? `$${quote.last?.toFixed(2) ?? "—"}` : "Loading..."}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {quote && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        isPositive ? "text-profit" : "text-loss"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {changePercent.toFixed(2)}%
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${item.symbol} from watchlist`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeWatchlistId) {
                        removeSymbol(activeWatchlistId, item.symbol);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add Symbol */}
          {isAdding ? (
            <div className="p-2">
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newSymbol.trim()) {
                    setIsAdding(false);
                  }
                }}
                placeholder="Enter symbol..."
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Symbol
            </Button>
          )}
          </div>
        </ScrollArea>
        <DotScrollIndicator
          scrollRef={scrollRef}
          maxDots={5}
          className="absolute right-1 top-1/2 -translate-y-1/2"
          minHeightGrowth={0}
        />
      </div>
    </div>
  );
}
