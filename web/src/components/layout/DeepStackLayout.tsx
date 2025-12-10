'use client';

import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightToolbar } from './RightToolbar';
import { WidgetPanel } from './WidgetPanel';
import { StreamingTicker } from './StreamingTicker';
import { ProfilePanel } from './ProfilePanel';
import { SettingsPanel } from './SettingsPanel';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MarketWatchPanel } from './MarketWatchPanel';
import { SymbolSearchDialog } from '@/components/search/SymbolSearchDialog';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useRealtimePositions } from '@/hooks/useRealtimePositions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface DeepStackLayoutProps {
    children: React.ReactNode;
}

// Constants for fixed header elements (must match MarketWatchPanel.tsx)
const TICKER_HEIGHT = 36; // StreamingTicker h-9 = 36px
const MARKET_WATCH_TAB_HEIGHT = 44; // Collapsed tab height
const MARKET_WATCH_FIXED_HEIGHT = 580; // Fixed expanded height

export function DeepStackLayout({ children }: DeepStackLayoutProps) {
    const { leftSidebarOpen, rightSidebarOpen, setLeftSidebarOpen, marketWatchPanel } = useUIStore();
    const { isMobile, isTablet, isDesktop } = useIsMobile();

    // Calculate top padding based on fixed header elements (desktop only)
    // Layout: StreamingTicker (36px) + MarketWatchPanel (variable)
    const calculateTopPadding = () => {
        if (!isDesktop) return 0;

        let padding = TICKER_HEIGHT; // Always include ticker

        if (marketWatchPanel.isOpen) {
            padding += marketWatchPanel.isExpanded
                ? MARKET_WATCH_FIXED_HEIGHT
                : MARKET_WATCH_TAB_HEIGHT;
        }

        return padding;
    };

    const topPadding = calculateTopPadding();

    // Initialize realtime subscriptions for positions
    useRealtimePositions();

    // Initialize global keyboard shortcuts
    useKeyboardShortcuts();

    // Close sidebar when tapping backdrop on mobile
    const handleBackdropClick = () => {
        if (isMobile || isTablet) {
            setLeftSidebarOpen(false);
        }
    };

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Symbol Search Dialog (Cmd+K) */}
            <SymbolSearchDialog />

            {/* Market Watch Panel - Fixed overlay at top (desktop only) */}
            {isDesktop && (
                <ErrorBoundary variant="panel">
                    <MarketWatchPanel />
                </ErrorBoundary>
            )}

            {/* Mobile Header - only show on mobile/tablet */}
            {(isMobile || isTablet) && <MobileHeader />}

            {/* Mobile Backdrop - show when sidebar open on mobile */}
            {(isMobile || isTablet) && leftSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity"
                    onClick={handleBackdropClick}
                    aria-hidden="true"
                />
            )}

            {/* Left Sidebar - Chat History */}
            <ErrorBoundary variant="panel">
                <LeftSidebar />
            </ErrorBoundary>

            {/* Slide-out Panels */}
            <ErrorBoundary variant="panel">
                <ProfilePanel />
            </ErrorBoundary>
            <ErrorBoundary variant="panel">
                <SettingsPanel />
            </ErrorBoundary>

            {/* Right Toolbar - Only on desktop */}
            {isDesktop && (
                <ErrorBoundary variant="panel">
                    <RightToolbar />
                </ErrorBoundary>
            )}

            {/* Right Widget Panel - Only on desktop */}
            {isDesktop && (
                <ErrorBoundary variant="panel">
                    <WidgetPanel />
                </ErrorBoundary>
            )}

            {/* Main Content Area */}
            {/* Streaming Ticker - Fixed at very top (desktop only) */}
            {isDesktop && <StreamingTicker />}

            <main
                className={cn(
                    "flex-1 flex flex-col h-full overflow-hidden",
                    // Sync transition with MarketWatchPanel (300ms ease-out)
                    "transition-all duration-300 ease-out",
                    // Reduced motion support
                    "motion-reduce:transition-none",
                    // Mobile/Tablet: Full width, no margins
                    (isMobile || isTablet) && "ml-0 mr-0",
                    // Desktop: Original sidebar margins
                    isDesktop && (leftSidebarOpen ? "ml-64" : "ml-14"),
                    isDesktop && (rightSidebarOpen ? "mr-[21rem]" : "mr-12"),
                    // Account for mobile header
                    (isMobile || isTablet) && "pt-14"
                )}
                style={{
                    // Dynamic top padding for fixed headers (Ticker + Market Watch Panel) - desktop only
                    // Uses CSS transition to animate smoothly with the panel
                    paddingTop: isDesktop && topPadding > 0 ? `${topPadding}px` : undefined,
                }}
            >
                {/* Workspace Content - fills remaining height, with bottom padding for mobile nav */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-0",
                    (isMobile || isTablet) && "pb-16" // Space for bottom nav
                )}>
                    <ErrorBoundary variant="fullscreen">
                        {children}
                    </ErrorBoundary>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
