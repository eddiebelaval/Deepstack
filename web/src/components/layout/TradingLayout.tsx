"use client";

import { ReactNode, useState, useEffect } from "react";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

type TradingLayoutProps = {
  watchlistPanel: ReactNode;
  chartPanel: ReactNode;
  orderPanel: ReactNode;
  chatPanel: ReactNode;
};

export function TradingLayout({
  watchlistPanel,
  chartPanel,
  orderPanel,
  chatPanel,
}: TradingLayoutProps) {
  const { showWatchlist, showOrderPanel, showChatPanel } = useTradingStore();

  return (
    <div className="flex-1 h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Watchlist Panel */}
        {showWatchlist && (
          <>
            <ResizablePanel
              defaultSize={15}
              minSize={10}
              maxSize={25}
              className="min-w-[200px]"
            >
              <div className="h-full overflow-hidden border-r border-border bg-card">
                {watchlistPanel}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Main Chart Panel */}
        <ResizablePanel defaultSize={showChatPanel ? 45 : 60} minSize={30}>
          <div className="h-full overflow-hidden bg-card">{chartPanel}</div>
        </ResizablePanel>

        {/* Order Panel */}
        {showOrderPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={18}
              minSize={15}
              maxSize={30}
              className="min-w-[240px]"
            >
              <div className="h-full overflow-hidden border-l border-border bg-card">
                {orderPanel}
              </div>
            </ResizablePanel>
          </>
        )}

        {/* AI Chat Panel */}
        {showChatPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={22}
              minSize={18}
              maxSize={35}
              className="min-w-[280px]"
            >
              <div className="h-full overflow-hidden border-l border-border bg-card">
                {chatPanel}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

// Status bar component for the bottom of the trading layout
export function StatusBar() {
  const { wsConnected, wsReconnecting, lastError } = useMarketDataStore();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [marketOpen, setMarketOpen] = useState(false);

  // Update time on client side only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      // Get market status (simplified - would need real market hours logic)
      const hour = now.getUTCHours() - 5; // EST approximation
      const isMarketHours = hour >= 9.5 && hour < 16;
      const dayOfWeek = now.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      setMarketOpen(isMarketHours && isWeekday);
    };

    // Initial update
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 border-t border-border bg-muted/50 flex items-center justify-between px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex items-center gap-1",
            wsConnected ? "text-profit" : wsReconnecting ? "text-yellow-500" : "text-loss"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              wsConnected
                ? "bg-profit"
                : wsReconnecting
                ? "bg-yellow-500 animate-pulse"
                : "bg-loss"
            )}
          />
          {wsConnected
            ? "Connected"
            : wsReconnecting
            ? "Reconnecting..."
            : "Disconnected"}
        </span>

        {lastError && (
          <span className="text-loss truncate max-w-[200px]">{lastError}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex items-center gap-1",
            marketOpen ? "text-profit" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              marketOpen ? "bg-profit" : "bg-muted-foreground"
            )}
          />
          {marketOpen ? "Market Open" : "Market Closed"}
        </span>

        <span>{currentTime || "--:--:-- --"}</span>
      </div>
    </div>
  );
}
