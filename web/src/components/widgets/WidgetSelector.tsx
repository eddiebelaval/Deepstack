'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useWidgetStore,
  WIDGET_CATEGORIES,
  getWidgetsByCategory,
  WIDGET_REGISTRY,
  type WidgetType,
  type WidgetCategory,
} from '@/lib/stores/widget-store';
import { cn } from '@/lib/utils';

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetSelector({ open, onOpenChange }: WidgetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>('market');
  const { activeWidgets, addWidget } = useWidgetStore();

  // Get IDs of already added widgets
  const activeWidgetTypes = useMemo(
    () => new Set(activeWidgets.map((w) => w.type)),
    [activeWidgets]
  );

  // Filter widgets by search query
  const filteredWidgets = useMemo(() => {
    const categoryWidgets = getWidgetsByCategory(selectedCategory);

    if (!searchQuery) return categoryWidgets;

    const query = searchQuery.toLowerCase();
    return categoryWidgets.filter(
      (widget) =>
        widget.title.toLowerCase().includes(query) ||
        widget.description.toLowerCase().includes(query)
    );
  }, [selectedCategory, searchQuery]);

  // Filter all widgets for search across categories
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;

    const query = searchQuery.toLowerCase();
    return Object.values(WIDGET_REGISTRY).filter(
      (widget) =>
        widget.title.toLowerCase().includes(query) ||
        widget.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleAddWidget = (type: WidgetType) => {
    addWidget(type);
    // Optional: close dialog after adding
    // onOpenChange(false);
  };

  const isWidgetAdded = (type: WidgetType) => activeWidgetTypes.has(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose from available widgets to customize your dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Show search results when searching, otherwise show category tabs */}
        {searchQuery ? (
          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-2">
              {searchResults && searchResults.length > 0 ? (
                searchResults.map((widget) => {
                  const Icon = widget.icon;
                  const added = isWidgetAdded(widget.type);

                  return (
                    <div
                      key={widget.type}
                      className={cn(
                        'group relative rounded-lg border border-border/50 p-4 transition-all hover:border-primary/50 hover:bg-accent/50',
                        added && 'bg-primary/5 border-primary/30'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10',
                            added && 'bg-primary/20'
                          )}
                        >
                          <Icon className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{widget.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {widget.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {widget.description}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant={added ? 'outline' : 'default'}
                          onClick={() => handleAddWidget(widget.type)}
                          disabled={added}
                          className={cn(
                            'shrink-0',
                            added && 'pointer-events-none'
                          )}
                        >
                          {added ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No widgets found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <Tabs
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as WidgetCategory)}
            className="flex-1 flex flex-col"
          >
            <div className="px-6 border-b border-border/50">
              <TabsList className="w-full justify-start">
                {WIDGET_CATEGORIES.map((category) => (
                  <TabsTrigger key={category.key} value={category.key}>
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {WIDGET_CATEGORIES.map((category) => (
              <TabsContent
                key={category.key}
                value={category.key}
                className="flex-1 m-0"
              >
                <ScrollArea className="h-[400px]">
                  <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredWidgets.map((widget) => {
                      const Icon = widget.icon;
                      const added = isWidgetAdded(widget.type);

                      return (
                        <div
                          key={widget.type}
                          className={cn(
                            'group relative rounded-lg border border-border/50 p-4 transition-all hover:border-primary/50 hover:bg-accent/50',
                            added && 'bg-primary/5 border-primary/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10',
                                added && 'bg-primary/20'
                              )}
                            >
                              <Icon className="h-5 w-5 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1">
                                {widget.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {widget.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              variant={added ? 'outline' : 'default'}
                              onClick={() => handleAddWidget(widget.type)}
                              disabled={added}
                              className={cn(
                                'w-full',
                                added && 'pointer-events-none'
                              )}
                            >
                              {added ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Add Widget
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WidgetSelector;
