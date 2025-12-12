'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActivePersona } from '@/lib/stores/persona-store';
import { cn } from '@/lib/utils';

interface ActivePersonaIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * ActivePersonaIndicator Component
 * Compact indicator showing the currently active AI persona
 */
export function ActivePersonaIndicator({
  className,
  showLabel = false,
}: ActivePersonaIndicatorProps) {
  const activePersona = useActivePersona();

  // Dynamically get the Lucide icon component
  const IconComponent =
    (LucideIcons as any)[activePersona.visual.icon] || LucideIcons.CircleHelp;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
              'bg-muted/50 hover:bg-muted transition-colors cursor-help',
              'border border-border/50',
              className
            )}
          >
            <div
              className="w-4 h-4 flex items-center justify-center"
              style={{ color: `var(${activePersona.visual.color})` }}
            >
              <IconComponent className="w-4 h-4" />
            </div>
            {showLabel && (
              <span className="text-xs font-medium text-foreground/80">
                {activePersona.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs"
          sideOffset={8}
        >
          <div className="space-y-1">
            <p className="font-semibold text-sm">{activePersona.name}</p>
            <p className="text-xs text-muted-foreground">
              {activePersona.shortDescription}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
