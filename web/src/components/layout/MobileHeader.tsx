'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/ui-store';
import { Menu, Plus, Search } from 'lucide-react';
import NextImage from "next/image";

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
                <div className="relative h-8 w-32">
                    <NextImage
                        src="/logo-full.png"
                        alt="DeepStack"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
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
