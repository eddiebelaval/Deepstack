'use client';

import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface DeepStackLayoutProps {
    children: React.ReactNode;
}

export function DeepStackLayout({ children }: DeepStackLayoutProps) {
    const { leftSidebarOpen, rightSidebarOpen } = useUIStore();

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Sidebar */}
            <LeftSidebar />

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    leftSidebarOpen ? "ml-64" : "ml-16",
                    rightSidebarOpen ? "mr-80" : "mr-0"
                )}
            >
                {children}
            </main>

            {/* Right Sidebar */}
            <RightSidebar />
        </div>
    );
}
