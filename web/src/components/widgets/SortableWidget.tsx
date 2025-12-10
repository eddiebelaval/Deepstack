'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, ChevronDown, ChevronUp, X } from 'lucide-react';
import { type ActiveWidget, getWidgetDefinition } from '@/lib/stores/widget-store';

interface SortableWidgetProps {
  widget: ActiveWidget;
  onRemove: () => void;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

export function SortableWidget({
  widget,
  onRemove,
  onToggleCollapse,
  children,
}: SortableWidgetProps) {
  const definition = getWidgetDefinition(widget.type);
  const Icon = definition.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'glass-surface rounded-2xl overflow-hidden transition-all duration-200',
        isDragging && 'opacity-50 shadow-xl ring-2 ring-primary/50'
      )}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        <Icon className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-medium flex-1">{definition.title}</CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md"
              onClick={onToggleCollapse}
            >
              {widget.isCollapsed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {widget.isCollapsed ? 'Expand' : 'Collapse'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove Widget</TooltipContent>
        </Tooltip>
      </CardHeader>
      {!widget.isCollapsed && (
        <CardContent className="p-3 pt-0">{children}</CardContent>
      )}
    </Card>
  );
}

export default SortableWidget;
