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
import { EmotionalFirewallBanner } from '@/components/emotional-firewall';
import { SymbolSearchDialog } from '@/components/search/SymbolSearchDialog';
import { useRealtimePositions } from '@/hooks/useRealtimePositions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface DeepStackLayoutProps {
    children: React.ReactNode;
}

export function DeepStackLayout({ children }: DeepStackLayoutProps) {
    const { leftSidebarOpen, rightSidebarOpen, setLeftSidebarOpen } = useUIStore();
    const { isMobile, isTablet, isDesktop } = useIsMobile();

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
            <LeftSidebar />

            {/* Slide-out Panels */}
            <ProfilePanel />
            <SettingsPanel />

            {/* Right Toolbar - Only on desktop */}
            {isDesktop && <RightToolbar />}

            {/* Right Widget Panel - Only on desktop */}
            {isDesktop && <WidgetPanel />}

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
                    // Mobile/Tablet: Full width, no margins
                    (isMobile || isTablet) && "ml-0 mr-0",
                    // Desktop: Original sidebar margins
                    isDesktop && (leftSidebarOpen ? "ml-64" : "ml-14"),
                    isDesktop && (rightSidebarOpen ? "mr-[21rem]" : "mr-12"),
                    // Account for mobile header
                    (isMobile || isTablet) && "pt-14"
                )}
            >
                {/* LED Ticker at top of workspace - hide on mobile */}
                {isDesktop && <StreamingTicker />}

                {/* Emotional Firewall Banner - smaller padding on mobile */}
                <div className={cn("py-2", isMobile ? "px-2" : "px-4")}>
                    <EmotionalFirewallBanner />
                </div>

                {/* Workspace Content - fills remaining height, with bottom padding for mobile nav */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-0",
                    (isMobile || isTablet) && "pb-16" // Space for bottom nav
                )}>
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
