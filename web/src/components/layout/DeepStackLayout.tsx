'use client';

import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightToolbar } from './RightToolbar';
import { WidgetPanel } from './WidgetPanel';
import { StreamingTicker } from './StreamingTicker';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface DeepStackLayoutProps {
    children: React.ReactNode;
}

export function DeepStackLayout({ children }: DeepStackLayoutProps) {
    const { leftSidebarOpen, rightSidebarOpen } = useUIStore();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Left Sidebar - Chat History */}
            <LeftSidebar />

            {/* Right Toolbar - TradingView style icons */}
            <RightToolbar />

            {/* Right Widget Panel - 3 customizable slots */}
            <WidgetPanel />

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    // Left margin based on sidebar state
                    leftSidebarOpen ? "ml-64" : "ml-14",
                    // Right margin: toolbar + widget panel if open
                    rightSidebarOpen ? "mr-[21rem]" : "mr-12"
                )}
            >
                {/* LED Ticker at top of workspace */}
                <StreamingTicker />

                {/* Workspace Content */}
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
