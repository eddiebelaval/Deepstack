'use client';

import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightToolbar } from './RightToolbar';
import { WidgetPanel } from './WidgetPanel';
import { StreamingTicker } from './StreamingTicker';
import { ProfilePanel } from './ProfilePanel';
import { SettingsPanel } from './SettingsPanel';
import { MobileSwipeNavigation } from './MobileSwipeNavigation';
import { FloatingToolbar } from './FloatingToolbar';
import { ChatHistoryPage, ChatPage, DiscoverPage, MarketsPage } from './MobilePages';
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
    const { leftSidebarOpen, rightSidebarOpen, marketWatchPanel } = useUIStore();
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

            {/* Left Sidebar - Chat History (Desktop only - mobile uses swipe nav) */}
            {isDesktop && (
                <ErrorBoundary variant="panel">
                    <LeftSidebar />
                </ErrorBoundary>
            )}

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

            {/* Mobile: Swipe Navigation */}
            {(isMobile || isTablet) ? (
                <>
                    <main className="flex-1 flex flex-col h-full overflow-hidden pt-0">
                        <MobileSwipeNavigation
                            initialPage={1}
                            onPageChange={(index, pageId) => {
                                // Could track analytics or update state here
                                console.log(`Navigated to page ${index}: ${pageId}`);
                            }}
                        >
                            {/* Page 0: Chat History */}
                            <ChatHistoryPage
                                onSelectConversation={() => {
                                    // Navigate back to chat after selection
                                    (window as any).__mobileSwipeNav?.navigateTo(1);
                                }}
                                onNewChat={() => {
                                    // Navigate back to chat after new chat
                                    (window as any).__mobileSwipeNav?.navigateTo(1);
                                }}
                            />

                            {/* Page 1: Chat (HOME) */}
                            <ChatPage>
                                <ErrorBoundary variant="fullscreen">
                                    {children}
                                </ErrorBoundary>
                            </ChatPage>

                            {/* Page 2: Discover/News */}
                            <DiscoverPage />

                            {/* Page 3: Prediction Markets */}
                            <MarketsPage />
                        </MobileSwipeNavigation>
                    </main>

                    {/* Floating Toolbar */}
                    <FloatingToolbar />
                </>
            ) : (
                /* Desktop: Traditional layout */
                <main
                    className={cn(
                        "flex-1 flex flex-col h-full overflow-hidden",
                        // Sync transition with MarketWatchPanel (300ms ease-out)
                        "transition-all duration-300 ease-out",
                        // Reduced motion support
                        "motion-reduce:transition-none",
                        // Desktop: Original sidebar margins
                        leftSidebarOpen ? "ml-64" : "ml-14",
                        rightSidebarOpen ? "mr-[21rem]" : "mr-12"
                    )}
                    style={{
                        // Dynamic top padding for fixed headers (Ticker + Market Watch Panel) - desktop only
                        // Uses CSS transition to animate smoothly with the panel
                        paddingTop: topPadding > 0 ? `${topPadding}px` : undefined,
                    }}
                >
                    {/* Workspace Content - fills remaining height */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <ErrorBoundary variant="fullscreen">
                            {children}
                        </ErrorBoundary>
                    </div>
                </main>
            )}
        </div>
    );
}
