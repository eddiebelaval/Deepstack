'use client';

import React from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { HomeWidgets } from '@/components/chat/HomeWidgets';
import { cn } from '@/lib/utils';
import { ChevronDown, LineChart } from 'lucide-react';

// Fixed dimensions - no resizing, solid panel feel
const COLLAPSED_TAB_HEIGHT = 44; // Height of the tab when collapsed
const FIXED_PANEL_HEIGHT = 580; // Increased height - more chart real estate
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
  } = useUIStore();

  const { isMobile, isTablet } = useIsMobile();

  // Don't render on mobile/tablet - HomeWidgets handled differently there
  if (isMobile || isTablet) return null;

  // Don't render if panel is closed
  if (!marketWatchPanel.isOpen) return null;

  const { isExpanded } = marketWatchPanel;

  // Calculate sidebar margins (same logic as DeepStackLayout main content)
  const leftMargin = leftSidebarOpen ? LEFT_SIDEBAR_EXPANDED : LEFT_SIDEBAR_COLLAPSED;
  const rightMargin = rightSidebarOpen ? RIGHT_SIDEBAR_EXPANDED : RIGHT_SIDEBAR_COLLAPSED;

  return (
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
        {/* Left: Title + Icon */}
        <button
          onClick={toggleMarketWatchPanel}
          className="flex items-center gap-2 hover:text-primary transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md px-1 -ml-1"
          aria-expanded={isExpanded}
          aria-controls="market-watch-content"
        >
          <LineChart className={cn(
            "h-4 w-4 transition-colors",
            isExpanded ? "text-primary" : "text-primary/70"
          )} />
          <span className="text-sm font-semibold text-foreground">Market Watch</span>
          <div className={cn(
            "transition-transform duration-200",
            isExpanded && "rotate-180"
          )}>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>

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
