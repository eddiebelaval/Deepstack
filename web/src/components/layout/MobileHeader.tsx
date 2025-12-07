'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/ui-store';
import { Menu, Plus, Search } from 'lucide-react';

/**
 * Mobile Header - Claude/Perplexity style header with hamburger menu
 * Shows on mobile and tablet viewports only
 */
export function MobileHeader() {
    const { toggleLeftSidebar, setActiveContent } = useUIStore();

    return (
        <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border">
            {/* Left: Hamburger Menu */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleLeftSidebar}
                className="h-10 w-10 rounded-xl tap-target"
                aria-label="Open menu"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Center: Logo */}
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </div>
                <span className="font-semibold text-foreground">DeepStack</span>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveContent('none')}
                    className="h-10 w-10 rounded-xl tap-target"
                    aria-label="Search"
                >
                    <Search className="h-5 w-5" />
                </Button>
                <Button
                    variant="default"
                    size="icon"
                    onClick={() => {
                        // New chat action - reset to home view
                        setActiveContent('none');
                    }}
                    className="h-10 w-10 rounded-xl tap-target"
                    aria-label="New chat"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
