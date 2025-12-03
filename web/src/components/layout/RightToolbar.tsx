'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/ui-store';
import {
    LineChart,
    List,
    Briefcase,
    Bell,
    Calendar,
    Newspaper,
    BarChart3,
    Target,
    LayoutGrid
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

type ToolbarItem = {
    id: string;
    icon: React.ElementType;
    label: string;
    shortcut?: string;
};

// TradingView-inspired toolbar items
const TOOLBAR_ITEMS: ToolbarItem[] = [
    { id: 'chart', icon: LineChart, label: 'Chart', shortcut: 'C' },
    { id: 'watchlist', icon: List, label: 'Watchlist', shortcut: 'W' },
    { id: 'positions', icon: Briefcase, label: 'Positions', shortcut: 'P' },
    { id: 'orders', icon: Target, label: 'Orders', shortcut: 'O' },
];

const SECONDARY_ITEMS: ToolbarItem[] = [
    { id: 'screener', icon: BarChart3, label: 'Screener' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'news', icon: Newspaper, label: 'News' },
];

const WIDGET_ITEMS: ToolbarItem[] = [
    { id: 'widgets', icon: LayoutGrid, label: 'Widgets Panel', shortcut: 'M' },
];

export function RightToolbar() {
    const {
        activeContent,
        setActiveContent,
        rightSidebarOpen,
        toggleRightSidebar
    } = useUIStore();

    const handleToolClick = (toolId: string) => {
        if (toolId === 'widgets') {
            toggleRightSidebar();
        } else if (toolId === 'chart') {
            setActiveContent(activeContent === 'chart' ? 'none' : 'chart');
        } else if (toolId === 'watchlist' || toolId === 'positions') {
            // Open widget panel with that widget focused
            if (!rightSidebarOpen) toggleRightSidebar();
        } else if (toolId === 'orders') {
            setActiveContent(activeContent === 'orders' ? 'none' : 'orders');
        } else {
            // For other tools, toggle them
            setActiveContent(activeContent === toolId ? 'none' : toolId as any);
        }
    };

    const isActive = (toolId: string) => {
        if (toolId === 'widgets') return rightSidebarOpen;
        return activeContent === toolId;
    };

    return (
        <TooltipProvider>
            <aside className="flex flex-col items-center w-12 bg-sidebar border-l border-sidebar-border h-screen fixed right-0 top-0 z-40 py-2">
                {/* Primary Tools */}
                <div className="flex flex-col items-center gap-1 px-1.5">
                    {TOOLBAR_ITEMS.map((item) => (
                        <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isActive(item.id) ? "secondary" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 rounded-lg",
                                        isActive(item.id) && "bg-primary/20 text-primary"
                                    )}
                                    onClick={() => handleToolClick(item.id)}
                                >
                                    <item.icon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {item.shortcut && (
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
                                        {item.shortcut}
                                    </kbd>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                <Separator className="my-2 w-6" />

                {/* Secondary Tools */}
                <div className="flex flex-col items-center gap-1 px-1.5">
                    {SECONDARY_ITEMS.map((item) => (
                        <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isActive(item.id) ? "secondary" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 rounded-lg",
                                        isActive(item.id) && "bg-primary/20 text-primary"
                                    )}
                                    onClick={() => handleToolClick(item.id)}
                                >
                                    <item.icon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Widget Panel Toggle */}
                <div className="flex flex-col items-center gap-1 px-1.5 pb-2">
                    <Separator className="mb-2 w-6" />
                    {WIDGET_ITEMS.map((item) => (
                        <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isActive(item.id) ? "secondary" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 rounded-lg",
                                        isActive(item.id) && "bg-primary/20 text-primary"
                                    )}
                                    onClick={() => handleToolClick(item.id)}
                                >
                                    <item.icon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {item.shortcut && (
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
                                        ⌘{item.shortcut}
                                    </kbd>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </aside>
        </TooltipProvider>
    );
}
