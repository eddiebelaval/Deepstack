"use client";

import { useRef } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DotScrollIndicator } from "@/components/ui/DotScrollIndicator";
import { TrendingUp, TrendingDown, List, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Watchlist Widget
function WatchlistWidget() {
  const { quotes } = useMarketDataStore();
  const { getActiveWatchlist } = useWatchlistStore();
  const watchlist = getActiveWatchlist();

  if (!watchlist) return null;

  return (
    <Card className="glass-surface living-surface">
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <List className="h-4 w-4 text-primary" />
          {watchlist.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1">
          {watchlist.items.slice(0, 8).map((item) => {
            const quote = quotes[item.symbol];
            const isPositive = (quote?.changePercent ?? 0) >= 0;

            return (
              <div
                key={item.symbol}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <span className="font-medium text-sm">{item.symbol}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    ${quote?.last?.toFixed(2) ?? "—"}
                  </span>
                  {quote?.changePercent !== undefined && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs",
                        isPositive ? "text-profit" : "text-loss"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Stats Widget
function QuickStatsWidget() {
  return (
    <Card className="glass-surface living-surface">
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="flex justify-between py-1">
          <span className="text-sm text-muted-foreground">Portfolio</span>
          <span className="text-sm font-mono">$104,230</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm text-muted-foreground">Day P&L</span>
          <span className="text-sm font-mono text-profit">+$1,240</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm text-muted-foreground">Open Positions</span>
          <span className="text-sm font-mono">5</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm text-muted-foreground">Buying Power</span>
          <span className="text-sm font-mono">$42,850</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Market Status Widget
function MarketStatusWidget() {
  const { wsConnected } = useMarketDataStore();

  // Simple market hours check (9:30 AM - 4:00 PM ET, weekdays)
  const now = new Date();
  const etHour = now.getUTCHours() - 5; // Rough EST conversion
  const isWeekday = now.getDay() > 0 && now.getDay() < 6;
  const isMarketHours = etHour >= 9.5 && etHour < 16;
  const isMarketOpen = isWeekday && isMarketHours;

  return (
    <Card className="glass-surface living-surface">
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Market Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isMarketOpen ? "bg-profit" : "bg-muted-foreground"
            )}
          />
          <span className="text-sm font-medium">
            {isMarketOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              wsConnected ? "bg-profit" : "bg-loss"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {wsConnected ? "Live Data" : "Disconnected"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function FloatingPanels() {
  const { rightSidebarOpen, setRightSidebarOpen } = useUIStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
      <SheetContent className="w-80 glass-surface-elevated p-0 border-l border-border/50">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-base font-semibold">Market Data</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-60px)] relative">
          <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
            <div className="p-4 space-y-4">
              <WatchlistWidget />
              <QuickStatsWidget />
              <MarketStatusWidget />
            </div>
          </ScrollArea>
          <DotScrollIndicator
            scrollRef={scrollRef}
            maxDots={5}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            minHeightGrowth={0}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
