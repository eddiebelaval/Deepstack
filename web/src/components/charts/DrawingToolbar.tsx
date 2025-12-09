'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useChartDrawings, type DrawingType } from '@/hooks/useChartDrawings';
import { useTradingStore } from '@/lib/stores/trading-store';
import { cn } from '@/lib/utils';
import {
    TrendingUp,
    Minus,
    GitBranch,
    Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DRAWING_TOOLS: { type: DrawingType; label: string; icon: React.ElementType }[] = [
    { type: 'trendline', label: 'Trendline', icon: TrendingUp },
    { type: 'horizontal', label: 'Horizontal Line', icon: Minus },
    { type: 'fib', label: 'Fibonacci Retracement', icon: GitBranch },
];

export function DrawingToolbar() {
    const { activeSymbol } = useTradingStore();
    const {
        activeDrawingTool,
        setActiveDrawingTool,
        clearDrawings,
        getDrawingsForSymbol,
        cancelDrawing,
    } = useChartDrawings();

    const symbolDrawings = getDrawingsForSymbol(activeSymbol);
    const hasDrawings = symbolDrawings.length > 0;

    const handleToolClick = (type: DrawingType) => {
        if (activeDrawingTool === type) {
            // Toggle off
            cancelDrawing();
        } else {
            // Activate tool
            setActiveDrawingTool(type);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 bg-background/50">
                {/* Drawing tool buttons */}
                {DRAWING_TOOLS.map((tool) => (
                    <Tooltip key={tool.type}>
                        <TooltipTrigger asChild>
                            <Button
                                variant={activeDrawingTool === tool.type ? 'secondary' : 'ghost'}
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-lg transition-all",
                                    activeDrawingTool === tool.type && "ring-2 ring-primary/50"
                                )}
                                onClick={() => handleToolClick(tool.type)}
                            >
                                <tool.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{tool.label}</TooltipContent>
                    </Tooltip>
                ))}

                {/* Separator */}
                <div className="w-px h-5 bg-border/50 mx-1" />

                {/* Clear all drawings */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                            onClick={() => clearDrawings(activeSymbol)}
                            disabled={!hasDrawings}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all drawings</TooltipContent>
                </Tooltip>

                {/* Drawing count indicator */}
                {hasDrawings && (
                    <span className="text-xs text-muted-foreground ml-1">
                        {symbolDrawings.length} drawing{symbolDrawings.length !== 1 ? 's' : ''}
                    </span>
                )}

                {/* Active tool indicator */}
                {activeDrawingTool && (
                    <span className="ml-auto text-xs text-primary animate-pulse">
                        Click on chart to draw {activeDrawingTool}
                    </span>
                )}
            </div>
        </TooltipProvider>
    );
}

export default DrawingToolbar;
