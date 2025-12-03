'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/lib/stores/ui-store';
import { PanelRightClose, PanelRightOpen, GripVertical } from 'lucide-react';

export function RightSidebar() {
    const { rightSidebarOpen, toggleRightSidebar, widgets } = useUIStore();

    if (!rightSidebarOpen) {
        return (
            <div className="fixed right-4 top-4 z-30">
                <Button variant="outline" size="icon" onClick={toggleRightSidebar} className="bg-background shadow-md">
                    <PanelRightOpen className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <aside className="w-80 border-l bg-background h-screen fixed right-0 top-0 z-30 flex flex-col transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between p-4 h-14 border-b">
                <span className="font-semibold">Widgets</span>
                <Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
                    <PanelRightClose className="h-4 w-4" />
                </Button>
            </div>

            {/* Widgets Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {widgets.filter(w => w.isOpen).map((widget) => (
                        <Card key={widget.id} className="overflow-hidden living-surface">
                            <CardHeader className="p-3 bg-muted/50 flex flex-row items-center space-y-0">
                                <GripVertical className="h-4 w-4 text-muted-foreground mr-2 cursor-move" />
                                <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3">
                                {/* Placeholder content based on type */}
                                {widget.type === 'watchlist' && (
                                    <div className="text-sm text-muted-foreground">
                                        <div className="flex justify-between py-1">
                                            <span>SPY</span>
                                            <span className="text-green-500">+1.2%</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>QQQ</span>
                                            <span className="text-green-500">+1.5%</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>IWM</span>
                                            <span className="text-red-500">-0.4%</span>
                                        </div>
                                    </div>
                                )}
                                {widget.type === 'quick-stats' && (
                                    <div className="text-sm">
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Portfolio</span>
                                            <span className="font-mono">$104,230</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Day P&L</span>
                                            <span className="text-green-500 font-mono">+$1,240</span>
                                        </div>
                                    </div>
                                )}
                                {widget.type === 'market-status' && (
                                    <div className="flex items-center space-x-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">Market Open</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </aside>
    );
}
