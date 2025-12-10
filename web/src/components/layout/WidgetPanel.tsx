'use client';

import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useUIStore } from '@/lib/stores/ui-store';
import { useWidgetStore } from '@/lib/stores/widget-store';
import { X, Settings2, Plus, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SortableWidget } from '@/components/widgets/SortableWidget';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';
import { WidgetSelector } from '@/components/widgets/WidgetSelector';

export function WidgetPanel() {
  const { rightSidebarOpen, setRightSidebarOpen } = useUIStore();
  const { activeWidgets, removeWidget, toggleCollapse, reorderWidgets, resetToDefaults } =
    useWidgetStore();
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const widgetScrollRef = useRef<HTMLDivElement>(null);

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  if (!rightSidebarOpen) return null;

  return (
    <TooltipProvider>
      <aside className="flex flex-col w-72 bg-sidebar/50 backdrop-blur-sm border-l border-sidebar-border h-screen fixed right-12 top-0 z-30">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <span className="font-semibold text-sm">Widgets</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={resetToDefaults}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to Defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setShowWidgetSelector(true)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Customize Widgets</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setRightSidebarOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close Panel</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Widget Slots with Drag and Drop */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea
            className="h-full p-3"
            viewportRef={widgetScrollRef}
            hideScrollbar
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {activeWidgets.map((widget) => (
                    <SortableWidget
                      key={widget.id}
                      widget={widget}
                      onRemove={() => removeWidget(widget.id)}
                      onToggleCollapse={() => toggleCollapse(widget.id)}
                    >
                      <ErrorBoundary variant="inline">
                        <WidgetRenderer type={widget.type} />
                      </ErrorBoundary>
                    </SortableWidget>
                  ))}

                  {/* Empty state */}
                  {activeWidgets.length === 0 && (
                    <div className="border-2 border-dashed border-muted rounded-2xl p-6 text-center">
                      <p className="text-muted-foreground text-sm">
                        No widgets added
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click the button below to add widgets
                      </p>
                    </div>
                  )}

                  {/* Drop hint when few widgets */}
                  {activeWidgets.length > 0 && activeWidgets.length < 3 && (
                    <div className="border-2 border-dashed border-muted/50 rounded-2xl p-4 text-center text-muted-foreground text-sm opacity-60">
                      <p>Drag to reorder</p>
                      <p className="text-xs mt-1">or add more widgets</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
          <DotScrollIndicator
            scrollRef={widgetScrollRef}
            maxDots={5}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            minHeightGrowth={0}
          />
        </div>

        {/* Add Widget Button */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="outline"
            className="w-full rounded-xl text-sm gap-2"
            onClick={() => setShowWidgetSelector(true)}
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
        </div>
      </aside>

      {/* Widget Selector Dialog */}
      <WidgetSelector
        open={showWidgetSelector}
        onOpenChange={setShowWidgetSelector}
      />
    </TooltipProvider>
  );
}

export default WidgetPanel;
