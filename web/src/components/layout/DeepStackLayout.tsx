'use client';

import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightToolbar } from './RightToolbar';
import { WidgetPanel } from './WidgetPanel';
import { StreamingTicker } from './StreamingTicker';
import { ProfilePanel } from './ProfilePanel';
import { SettingsPanel } from './SettingsPanel';
import { EmotionalFirewallBanner } from '@/components/emotional-firewall';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface DeepStackLayoutProps {
    children: React.ReactNode;
}

export function DeepStackLayout({ children }: DeepStackLayoutProps) {
    const { leftSidebarOpen, rightSidebarOpen } = useUIStore();

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Left Sidebar - Chat History */}
            <LeftSidebar />

            {/* Slide-out Panels */}
            <ProfilePanel />
            <SettingsPanel />

            {/* Right Toolbar - TradingView style icons */}
            <RightToolbar />

            {/* Right Widget Panel - 3 customizable slots */}
            <WidgetPanel />

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
                    // Left margin based on sidebar state
                    leftSidebarOpen ? "ml-64" : "ml-14",
                    // Right margin: toolbar + widget panel if open
                    rightSidebarOpen ? "mr-[21rem]" : "mr-12"
                )}
            >
                {/* LED Ticker at top of workspace */}
                <StreamingTicker />

                {/* Emotional Firewall Banner - shows trading status */}
                <div className="px-4 py-2">
                    <EmotionalFirewallBanner />
                </div>

                {/* Workspace Content - fills remaining height */}
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
