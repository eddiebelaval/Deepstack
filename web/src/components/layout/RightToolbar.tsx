'use client';

import React, { useState } from 'react';
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
    LayoutGrid,
    Diamond,
    Shield,
    Filter,
    Calculator,
    Activity
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { WatchlistManagementDialog } from '@/components/trading/WatchlistManagementDialog';

type ToolbarItem = {
    id: string;
    icon: React.ElementType;
    label: string;
    shortcut?: string;
};

// Category 1: Trading
const TRADING_ITEMS: ToolbarItem[] = [
    { id: 'chart', icon: LineChart, label: 'Chart', shortcut: 'C' },
    { id: 'positions', icon: Briefcase, label: 'Positions', shortcut: 'P' },
];

// Category 2: Research
const RESEARCH_ITEMS: ToolbarItem[] = [
    { id: 'watchlist', icon: List, label: 'Watchlist', shortcut: 'W' },
    { id: 'screener', icon: BarChart3, label: 'Screener' },
    { id: 'news', icon: Newspaper, label: 'News' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
];

// Category 3: Analytics
const ANALYTICS_ITEMS: ToolbarItem[] = [
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'prediction-markets', icon: Activity, label: 'Predictions' },
    { id: 'deep-value', icon: Diamond, label: 'Deep Value' },
    { id: 'hedged-positions', icon: Shield, label: 'Hedged' },
    { id: 'options-screener', icon: Filter, label: 'Options' },
    { id: 'options-builder', icon: Calculator, label: 'Builder' },
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

    // State for watchlist management dialog
    const [showWatchlistManagement, setShowWatchlistManagement] = useState(false);

    const handleToolClick = (toolId: string) => {
        if (toolId === 'widgets') {
            toggleRightSidebar();
        } else if (toolId === 'chart') {
            setActiveContent(activeContent === 'chart' ? 'none' : 'chart');
        } else if (toolId === 'watchlist') {
            // Open watchlist management dialog directly
            setShowWatchlistManagement(true);
        } else if (toolId === 'positions') {
            // Open widget panel with that widget focused
            if (!rightSidebarOpen) toggleRightSidebar();
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
                {/* Category 1: Trading */}
                <div className="flex flex-col items-center gap-1 px-1.5">
                    {TRADING_ITEMS.map((item) => (
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

                {/* Category 2: Research */}
                <div className="flex flex-col items-center gap-1 px-1.5">
                    {RESEARCH_ITEMS.map((item) => (
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

                {/* Category 3: Analytics */}
                <div className="flex flex-col items-center gap-1 px-1.5">
                    {ANALYTICS_ITEMS.map((item) => (
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

            {/* Watchlist Management Dialog */}
            <WatchlistManagementDialog
                open={showWatchlistManagement}
                onOpenChange={setShowWatchlistManagement}
            />
        </TooltipProvider>
    );
}
