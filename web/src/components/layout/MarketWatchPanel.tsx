'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { HomeWidgets } from '@/components/chat/HomeWidgets';
import { cn } from '@/lib/utils';
import { ChevronDown, LineChart } from 'lucide-react';
import { AnimatedChartIcon } from '@/components/ui/AnimatedChartIcon';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Fixed dimensions - no resizing, solid panel feel
const COLLAPSED_TAB_HEIGHT = 44; // Height of the tab when collapsed
const FIXED_PANEL_HEIGHT = 680; // Increased height to fit scroll wheel + cards at bottom
const TICKER_HEIGHT = 36; // Height of StreamingTicker (h-9 = 36px)

// Sidebar dimensions (must match DeepStackLayout)
const LEFT_SIDEBAR_EXPANDED = 256; // ml-64 = 16rem = 256px
const LEFT_SIDEBAR_COLLAPSED = 56;  // ml-14 = 3.5rem = 56px
const RIGHT_SIDEBAR_EXPANDED = 336; // mr-[21rem] = 336px
const RIGHT_SIDEBAR_COLLAPSED = 48; // mr-12 = 3rem = 48px

export function MarketWatchPanel() {
  const {
    marketWatchPanel,
    toggleMarketWatchPanel,
    leftSidebarOpen,
    rightSidebarOpen,
    setActiveContent,
    collapseMarketWatchPanel,
  } = useUIStore();

  const { wsConnected, wsReconnecting, lastError } = useMarketDataStore();
  const { isMobile, isTablet } = useIsMobile();

  // Status bar state
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

      // Get accurate Eastern Time using Intl.DateTimeFormat (handles DST automatically)
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
      });

      const parts = etFormatter.formatToParts(now);
      const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';

      // Convert weekday string to number
      const weekdayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      const dayOfWeek = weekdayMap[weekdayStr] ?? now.getDay();

      // Convert to decimal hours for comparison
      const decimalTime = hours + minutes / 60;

      // Regular market hours: 9:30 AM (9.5) to 4:00 PM (16.0) ET
      const isMarketHours = decimalTime >= 9.5 && decimalTime < 16;
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      setMarketOpen(isMarketHours && isWeekday);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render on mobile/tablet - HomeWidgets handled differently there
  if (isMobile || isTablet) return null;

  // Don't render if panel is closed
  if (!marketWatchPanel.isOpen) return null;

  const { isExpanded } = marketWatchPanel;

  // Calculate sidebar margins (same logic as DeepStackLayout main content)
  const leftMargin = leftSidebarOpen ? LEFT_SIDEBAR_EXPANDED : LEFT_SIDEBAR_COLLAPSED;
  const rightMargin = rightSidebarOpen ? RIGHT_SIDEBAR_EXPANDED : RIGHT_SIDEBAR_COLLAPSED;

  // Open full chart in center panel
  const handleOpenFullChart = () => {
    setActiveContent('chart');
    collapseMarketWatchPanel(); // Collapse Market Watch when opening full chart
  };

  return (
    <TooltipProvider>
    <div
      className={cn(
        // Fixed positioning within center content area
        "fixed z-40 border-b border-x rounded-b-lg transition-all duration-300 ease-out",
        // Solid background - no transparency for better readability
        isExpanded
          ? "bg-background border-border/60 shadow-xl"
          : "bg-background/95 backdrop-blur-md hover:bg-background border-border/40 hover:border-border/50 shadow-md hover:shadow-lg",
        // Reduced motion support
        "motion-reduce:transition-none"
      )}
      style={{
        top: TICKER_HEIGHT, // Position below the StreamingTicker
        height: isExpanded ? FIXED_PANEL_HEIGHT : COLLAPSED_TAB_HEIGHT,
        // Dynamic left/right to stay within center content area
        left: leftMargin,
        right: rightMargin,
      }}
    >
      {/* Header Bar - Always visible (acts as collapsed tab) */}
      <div className={cn(
        "flex items-center justify-between px-4 h-11 border-b transition-colors duration-200",
        isExpanded ? "border-border/40 bg-muted/30" : "border-border/20 bg-transparent"
      )}>
        {/* Left: Chevron + Title */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleMarketWatchPanel}
              className="flex items-center gap-2 hover:text-primary transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-2 py-1 -ml-2"
              aria-expanded={isExpanded}
              aria-controls="market-watch-content"
            >
              {/* Chevron with pill background for visibility */}
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200",
                "bg-muted/60 group-hover:bg-primary/20",
                "border border-border/40 group-hover:border-primary/40",
                isExpanded && "rotate-180 bg-primary/15 border-primary/30"
              )}>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-colors",
                  isExpanded ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
              <LineChart className={cn(
                "h-4 w-4 transition-colors",
                isExpanded ? "text-primary" : "text-primary/70"
              )} />
              <span className="text-sm font-semibold text-foreground">Market Watch</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isExpanded ? "Collapse Market Watch" : "Expand Market Watch"}
          </TooltipContent>
        </Tooltip>

        {/* Center: Connection + Market Status with backlit glow */}
        <div className="flex items-center gap-4 text-xs">
          {/* Connection Status */}
          <span
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all",
              wsConnected
                ? "text-profit bg-profit/10 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                : wsReconnecting
                ? "text-yellow-500 bg-yellow-500/10 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                : "text-loss bg-loss/10 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                wsConnected
                  ? "bg-profit shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                  : wsReconnecting
                  ? "bg-yellow-500 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.6)]"
                  : "bg-loss shadow-[0_0_6px_rgba(239,68,68,0.6)]"
              )}
            />
            {wsConnected
              ? "Connected"
              : wsReconnecting
              ? "Reconnecting..."
              : "Disconnected"}
          </span>

          {/* Separator */}
          <span className="text-border/50">|</span>

          {/* Market Status */}
          <span
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all",
              marketOpen
                ? "text-profit bg-profit/10 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                : "text-loss bg-loss/10 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                marketOpen
                  ? "bg-profit shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                  : "bg-loss shadow-[0_0_6px_rgba(239,68,68,0.6)]"
              )}
            />
            {marketOpen ? "Market Open" : "Market Closed"}
          </span>

          {/* Error indicator (if any) */}
          {lastError && (
            <>
              <span className="text-border">|</span>
              <span className="text-loss truncate max-w-[150px]">{lastError}</span>
            </>
          )}
        </div>

        {/* Right: Full Chart + Time */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-primary group"
                onClick={handleOpenFullChart}
              >
                <AnimatedChartIcon size={14} className="transition-transform group-hover:scale-110" />
                <span>Full Chart</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open full chart for detailed analysis</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentTime || "--:--:-- --"}
          </span>
        </div>
      </div>

      {/* Content - Only visible when expanded, no scroll needed */}
      <div
        id="market-watch-content"
        className={cn(
          "transition-all duration-300 ease-out",
          isExpanded
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none",
          "motion-reduce:transition-none motion-reduce:transform-none"
        )}
        style={{
          height: isExpanded ? FIXED_PANEL_HEIGHT - COLLAPSED_TAB_HEIGHT : 0,
        }}
        aria-hidden={!isExpanded}
      >
        {/* HomeWidgets fills the space - no overflow scroll */}
        <div className="h-full px-4 py-2">
          <HomeWidgets />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

// Export hook for programmatic control from anywhere in the app
export function useMarketWatchPanel() {
  const {
    marketWatchPanel,
    openMarketWatchPanel,
    closeMarketWatchPanel,
    toggleMarketWatchPanel,
    expandMarketWatchPanel,
    collapseMarketWatchPanel,
  } = useUIStore();

  return {
    isOpen: marketWatchPanel.isOpen,
    isExpanded: marketWatchPanel.isExpanded,
    open: openMarketWatchPanel,
    close: closeMarketWatchPanel,
    toggle: toggleMarketWatchPanel,
    expand: expandMarketWatchPanel,
    collapse: collapseMarketWatchPanel,
  };
}
