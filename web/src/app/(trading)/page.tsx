"use client";

import { TradingLayout, StatusBar } from "@/components/layout/TradingLayout";
import { WatchlistPanel } from "@/components/trading/WatchlistPanel";
import { ChartPanel } from "@/components/trading/ChartPanel";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { ChatSidePanel } from "@/components/trading/ChatSidePanel";
import { SymbolSearch } from "@/components/trading/SymbolSearch";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function TradingPage() {
  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
      <TradingLayout
        watchlistPanel={<WatchlistPanel />}
        chartPanel={<ChartPanel />}
        orderPanel={<OrderPanel />}
        chatPanel={<ChatSidePanel />}
      />
      <StatusBar />
      <SymbolSearch />
    </>
  );
}
