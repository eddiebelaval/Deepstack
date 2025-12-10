"use client";

import { ReactNode } from "react";
import { useTradingStore } from "@/lib/stores/trading-store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
