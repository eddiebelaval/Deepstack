'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/ui-store';
import { Menu, Plus, Search } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

/**
 * Mobile Header - Claude/Perplexity style header with hamburger menu
 * Shows on mobile and tablet viewports only
 */
export function MobileHeader() {
    const { toggleLeftSidebar, setActiveContent } = useUIStore();

    return (
        <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border safe-area-top" style={{ minHeight: 'calc(56px + env(safe-area-inset-top, 0px))', paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}>
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
                <Logo size="lg" />
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
