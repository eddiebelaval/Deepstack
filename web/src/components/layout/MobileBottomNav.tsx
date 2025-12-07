'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore, ActiveContentType } from '@/lib/stores/ui-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import {
    LineChart,
    Briefcase,
    Newspaper,
    Calendar,
    BarChart3,
    Bell,
    MoreHorizontal,
    X,
    Diamond,
    Shield,
    Filter,
    Calculator,
} from 'lucide-react';

type ToolItem = {
    id: ActiveContentType;
    icon: React.ElementType;
    label: string;
};

// Primary tools (always visible in bottom bar)
const PRIMARY_TOOLS: ToolItem[] = [
    { id: 'chart', icon: LineChart, label: 'Chart' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
    { id: 'news', icon: Newspaper, label: 'News' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
];

// Secondary tools (in "More" menu)
const SECONDARY_TOOLS: ToolItem[] = [
    { id: 'screener', icon: BarChart3, label: 'Screener' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'deep-value', icon: Diamond, label: 'Deep Value' },
    { id: 'hedged-positions', icon: Shield, label: 'Hedged' },
    { id: 'options-screener', icon: Filter, label: 'Options' },
    { id: 'options-builder', icon: Calculator, label: 'Builder' },
];

/**
 * Mobile Bottom Navigation Bar
 * Provides access to trading tools on mobile devices
 * Only renders on mobile/tablet viewports
 */
export function MobileBottomNav() {
    const { isMobile, isTablet } = useIsMobile();
    const { activeContent, setActiveContent } = useUIStore();
    const [showMore, setShowMore] = useState(false);

    // Only show on mobile/tablet
    if (!isMobile && !isTablet) return null;

    const handleToolClick = (toolId: ActiveContentType) => {
        if (activeContent === toolId) {
            // Toggle off if already active
            setActiveContent('none');
        } else {
            setActiveContent(toolId);
        }
        setShowMore(false);
    };

    const isActive = (id: ActiveContentType) => activeContent === id;

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Menu Panel */}
                    <div
                        className="absolute bottom-16 left-0 right-0 bg-sidebar border-t border-sidebar-border rounded-t-2xl p-4 safe-area-bottom"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold">More Tools</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setShowMore(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {SECONDARY_TOOLS.map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleToolClick(tool.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors tap-target",
                                        isActive(tool.id)
                                            ? "bg-primary/20 text-primary"
                                            : "hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <tool.icon className="h-5 w-5" />
                                    <span className="text-xs">{tool.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {PRIMARY_TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool.id)}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors tap-target min-w-[60px]",
                                isActive(tool.id)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <tool.icon className={cn(
                                "h-5 w-5",
                                isActive(tool.id) && "scale-110 transition-transform"
                            )} />
                            <span className="text-[10px] font-medium">{tool.label}</span>
                        </button>
                    ))}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={cn(
                            "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors tap-target min-w-[60px]",
                            showMore
                                ? "text-primary"
                                : "text-muted-foreground"
                        )}
                    >
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
