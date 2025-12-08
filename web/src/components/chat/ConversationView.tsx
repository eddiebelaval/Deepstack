'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TradingChart } from '@/components/charts/TradingChart';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { DeepValuePanel } from '@/components/trading/DeepValuePanel';
import { HedgedPositionsPanel } from '@/components/trading/HedgedPositionsPanel';
import { ScreenerPanel } from '@/components/trading/ScreenerPanel';
import { AlertsPanel } from '@/components/trading/AlertsPanel';
import { CalendarPanel } from '@/components/trading/CalendarPanel';
import { NewsPanel } from '@/components/trading/NewsPanel';
import { OptionsScreenerPanel, OptionsStrategyBuilder } from '@/components/options';
import { PresetGrid } from './PresetGrid';
import { HomeWidgets } from './HomeWidgets';
import { cn } from '@/lib/utils';
import { LineChart, X, Maximize2, Minimize2, Square, RectangleHorizontal, Search, Loader2 } from 'lucide-react';

// Simple message type for our use case
type SimpleMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: Date;
    toolInvocations?: any[];
    thinking?: string;
};

export function ConversationView() {
    const { activeProvider, setIsStreaming, useExtendedThinking } = useChatStore();
    const { activeContent, setActiveContent } = useUIStore();
    const { activeSymbol, setActiveSymbol } = useTradingStore();
    const { isLoadingBars, bars } = useMarketDataStore();
    const { isMobile, isDesktop } = useIsMobile();
    const { requireAuth } = useRequireAuth();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Chart loading state
    const isChartLoading = activeSymbol ? isLoadingBars[activeSymbol] ?? false : false;
    const hasChartData = activeSymbol ? (bars[activeSymbol]?.length ?? 0) > 0 : false;

    // Panel size presets (in pixels)
    type PanelSize = 'compact' | 'default' | 'large' | 'full';
    const PANEL_SIZES: Record<PanelSize, number> = {
        compact: 300,
        default: 600,
        large: 800,
        full: 1000,
    };
    const [panelSize, setPanelSize] = useState<PanelSize>('default');

    // Symbol search state
    const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
    const [symbolSearchValue, setSymbolSearchValue] = useState('');
    const symbolInputRef = useRef<HTMLInputElement>(null);

    // Focus symbol input when search opens
    useEffect(() => {
        if (isSearchingSymbol && symbolInputRef.current) {
            symbolInputRef.current.focus();
        }
    }, [isSearchingSymbol]);

    const handleSymbolSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const symbol = symbolSearchValue.trim().toUpperCase();
        if (symbol) {
            setActiveSymbol(symbol);
            setSymbolSearchValue('');
            setIsSearchingSymbol(false);
        }
    };

    const handleSymbolKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSymbolSearchValue('');
            setIsSearchingSymbol(false);
        }
    };

    // Basic intent detection
    const detectIntent = (content: string) => {
        const lower = content.toLowerCase();
        if (lower.includes('chart') || lower.includes('spy') || lower.includes('aapl') || lower.includes('nvda')) {
            setActiveContent('chart');
            if (lower.includes('spy')) setActiveSymbol('SPY');
            if (lower.includes('aapl')) setActiveSymbol('AAPL');
            if (lower.includes('nvda')) setActiveSymbol('NVDA');
        } else if (lower.includes('portfolio') || lower.includes('positions')) {
            setActiveContent('portfolio');
        } else if (lower.includes('buy') || lower.includes('sell') || lower.includes('order')) {
            setActiveContent('orders');
        } else if (lower.includes('deep value') || lower.includes('value screen')) {
            setActiveContent('deep-value');
        } else if (lower.includes('hedged') || lower.includes('conviction')) {
            setActiveContent('hedged-positions');
        }
    };

    // Handle tool results that control UI
    const handleToolResult = useCallback((toolName: string, result: any) => {
        if (result?.action === 'show_panel') {
            const panelMap: Record<string, typeof activeContent> = {
                'chart': 'chart',
                'portfolio': 'portfolio',
                'orders': 'orders',
                'screener': 'screener',
                'alerts': 'alerts',
                'calendar': 'calendar',
                'news': 'news',
                'deep-value': 'deep-value',
                'hedged-positions': 'hedged-positions',
                'options-screener': 'options-screener',
                'options-builder': 'options-builder',
            };

            if (result.panel && panelMap[result.panel]) {
                setActiveContent(panelMap[result.panel]);
            }

            if (result.symbol) {
                setActiveSymbol(result.symbol);
            }
        }
    }, [setActiveContent, setActiveSymbol]);

    const handleSend = useCallback(async (content: string) => {
        // Require authentication to use AI Chat
        if (!requireAuth('AI Chat')) return;

        detectIntent(content);

        const userMessage: SimpleMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setIsStreaming(true);

        try {
            // Build context for the AI
            const context = {
                activeSymbol,
                activePanel: activeContent,
                // Could add more context here like positions, watchlist, etc.
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    provider: activeProvider,
                    context,
                    useExtendedThinking,
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            let thinkingContent = '';
            const assistantId = crypto.randomUUID();
            const toolInvocations: any[] = [];
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete lines from buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        // AI SDK data stream format: "0:text" or "9:tool_call" etc.
                        const colonIndex = line.indexOf(':');
                        if (colonIndex === -1) {
                            // Plain text (fallback)
                            assistantContent += line;
                            continue;
                        }

                        const prefix = line.substring(0, colonIndex);
                        const data = line.substring(colonIndex + 1);

                        try {
                            if (prefix === '0') {
                                // Text chunk
                                const text = JSON.parse(data);
                                assistantContent += text;
                            } else if (prefix === '3') {
                                // Thinking chunk (extended thinking)
                                const text = JSON.parse(data);
                                thinkingContent += text;
                            } else if (prefix === '9') {
                                // Tool call
                                const toolCall = JSON.parse(data);
                                toolInvocations.push(toolCall);
                            } else if (prefix === 'a') {
                                // Tool result
                                const toolResult = JSON.parse(data);
                                // Handle UI-controlling tool results
                                if (toolResult?.result) {
                                    handleToolResult(toolResult.toolName || '', toolResult.result);
                                }
                            } else if (prefix === 'e') {
                                // Error
                                const errorData = JSON.parse(data);
                                console.error('Stream error:', errorData);
                            }
                            // Ignore other prefixes (d=done, etc.)
                        } catch {
                            // If parsing fails, treat as plain text
                            if (prefix === '0') {
                                assistantContent += data;
                            }
                        }
                    }

                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId);
                        const newMessage = {
                            id: assistantId,
                            role: 'assistant' as const,
                            content: assistantContent,
                            createdAt: new Date(),
                            toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
                            thinking: thinkingContent || undefined,
                        };

                        if (existing) {
                            return prev.map(m => m.id === assistantId ? newMessage : m);
                        } else {
                            return [...prev, newMessage];
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your message. Please try again.',
                createdAt: new Date(),
            }]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, [messages, activeProvider, activeSymbol, activeContent, setIsStreaming, setActiveContent, setActiveSymbol, handleToolResult]);

    const hasMessages = messages.length > 0;
    const hasActiveContent = activeContent !== 'none';

    const handlePresetClick = (prompt: string) => {
        handleSend(prompt);
    };

    const closeContentZone = () => {
        setActiveContent('none');
        setPanelSize('default');
    };

    // Render the active content (chart, orders, etc.)
    // Note: Parent container must have explicit height for flex-1 to work
    const renderActiveContent = () => {
        if (activeContent === 'chart') {
            return (
                <div className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-card border border-border/50 relative">
                    <TradingChart className="w-full h-full" />
                    {/* Loading overlay */}
                    {isChartLoading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Loading {activeSymbol}...</span>
                            </div>
                        </div>
                    )}
                    {/* No data message */}
                    {!isChartLoading && !hasChartData && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <LineChart className="h-8 w-8 opacity-50" />
                                <span className="text-sm">No data available for {activeSymbol}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        if (activeContent === 'orders') {
            return (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <div className="w-full max-w-md">
                        <OrderPanel />
                    </div>
                </div>
            );
        }
        if (activeContent === 'portfolio') {
            return (
                <div className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-card border border-border/50">
                    <PositionsList />
                </div>
            );
        }
        if (activeContent === 'deep-value') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <DeepValuePanel />
                </div>
            );
        }
        if (activeContent === 'hedged-positions') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <HedgedPositionsPanel />
                </div>
            );
        }
        if (activeContent === 'options-screener') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <OptionsScreenerPanel />
                </div>
            );
        }
        if (activeContent === 'options-builder') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <OptionsStrategyBuilder />
                </div>
            );
        }
        if (activeContent === 'screener') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <ScreenerPanel />
                </div>
            );
        }
        if (activeContent === 'alerts') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <AlertsPanel />
                </div>
            );
        }
        if (activeContent === 'calendar') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <CalendarPanel />
                </div>
            );
        }
        if (activeContent === 'news') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-card border-t border-border/50">
                    <NewsPanel />
                </div>
            );
        }
        return null;
    };

    // Home state - no messages, no active content
    // Centered both horizontally and vertically on the page
    if (!hasMessages && !hasActiveContent) {
        return (
            <div className={cn(
                "flex flex-col h-full",
                isMobile ? "p-3" : "p-8"
            )}>
                {/* Top Widgets Section - hide on mobile to save space */}
                {isDesktop && <HomeWidgets />}

                {/* Centered Welcome Message */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-center space-y-3 max-w-2xl px-4">
                        <div className="flex justify-center mb-4">
                            <div className={cn(
                                "rounded-2xl bg-primary/10",
                                isMobile ? "p-2" : "p-3"
                            )}>
                                <svg className={cn(
                                    "text-primary",
                                    isMobile ? "h-6 w-6" : "h-8 w-8"
                                )} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                        </div>
                        <h2 className={cn(
                            "font-semibold text-foreground",
                            isMobile ? "text-xl" : "text-2xl"
                        )}>
                            Welcome to DeepStack
                        </h2>
                        <p className={cn(
                            "text-muted-foreground max-w-md mx-auto leading-relaxed",
                            isMobile ? "text-sm" : "text-base"
                        )}>
                            {isMobile
                                ? "Your AI trading assistant for charts, portfolio, and trades."
                                : "I can analyze charts, review your portfolio, find trading setups, and help you execute trades."
                            }
                        </p>
                    </div>
                </div>

                {/* Bottom Section: Presets and Input */}
                <div className={cn(
                    "flex flex-col items-center w-full max-w-2xl mx-auto",
                    isMobile ? "gap-3" : "gap-6"
                )}>
                    {/* Preset Cards - simplified on mobile */}
                    <div className="w-full">
                        <PresetGrid onSelect={handlePresetClick} />
                    </div>

                    {/* Chat Input */}
                    <div className="w-full">
                        <ChatInput onSend={handleSend} disabled={isLoading} />
                    </div>
                </div>
            </div>
        );
    }

    // Workspace view with active content and/or messages
    // Layout: Fixed height page, tool panel slides down from top, chat scrolls in middle, input at bottom
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tool Panel - Slides down from top when active - smaller on mobile */}
            {/* Using fixed pixel heights since percentage heights don't work well in nested flex contexts */}
            {hasActiveContent && (
                <div
                    className={cn(
                        "flex-shrink-0 bg-background border-b border-border/30 transition-all duration-300 ease-in-out",
                        isMobile ? "p-2" : "p-3"
                    )}
                    style={{ height: isMobile ? `${Math.min(PANEL_SIZES[panelSize], 400)}px` : `${PANEL_SIZES[panelSize]}px` }}
                >
                    <div className="h-full flex flex-col min-h-0">
                        {/* Tool Header with controls */}
                        <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0 h-8">
                            <div className="flex items-center gap-2">
                                {activeContent === 'chart' ? (
                                    isSearchingSymbol ? (
                                        <form onSubmit={handleSymbolSearch} className="flex items-center gap-1">
                                            <Input
                                                ref={symbolInputRef}
                                                type="text"
                                                value={symbolSearchValue}
                                                onChange={(e) => setSymbolSearchValue(e.target.value.toUpperCase())}
                                                onKeyDown={handleSymbolKeyDown}
                                                placeholder="Symbol..."
                                                className="h-6 w-20 text-xs uppercase px-2"
                                                maxLength={10}
                                            />
                                            <Button
                                                type="submit"
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                disabled={!symbolSearchValue.trim()}
                                            >
                                                <Search className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    setSymbolSearchValue('');
                                                    setIsSearchingSymbol(false);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => setIsSearchingSymbol(true)}
                                            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-0.5 rounded transition-colors group"
                                            title="Click to search symbol"
                                        >
                                            <Search className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                            <span>Chart: {activeSymbol}</span>
                                        </button>
                                    )
                                ) : (
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {activeContent === 'orders' && 'Order Entry'}
                                        {activeContent === 'portfolio' && 'Positions'}
                                        {activeContent === 'deep-value' && 'Deep Value Screener'}
                                        {activeContent === 'hedged-positions' && 'Hedged Position Manager'}
                                        {activeContent === 'options-screener' && 'Options Screener'}
                                        {activeContent === 'options-builder' && 'Strategy Builder'}
                                        {activeContent === 'screener' && 'Stock Screener'}
                                        {activeContent === 'alerts' && 'Price Alerts'}
                                        {activeContent === 'calendar' && 'Market Calendar'}
                                        {activeContent === 'news' && 'Market News'}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Size preset buttons - Available for ALL panels */}
                                <div className="flex items-center gap-0.5 mr-1 border-r border-border/50 pr-2">
                                    <Button
                                        variant={panelSize === 'compact' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-6 w-6 rounded"
                                        onClick={() => setPanelSize('compact')}
                                        title="Compact"
                                    >
                                        <Minimize2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant={panelSize === 'default' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-6 w-6 rounded"
                                        onClick={() => setPanelSize('default')}
                                        title="Default"
                                    >
                                        <Square className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant={panelSize === 'large' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-6 w-6 rounded"
                                        onClick={() => setPanelSize('large')}
                                        title="Large"
                                    >
                                        <RectangleHorizontal className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant={panelSize === 'full' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-6 w-6 rounded"
                                        onClick={() => setPanelSize('full')}
                                        title="Full"
                                    >
                                        <Maximize2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg"
                                    onClick={closeContentZone}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Tool Content Area */}
                        {renderActiveContent()}
                    </div>
                </div>
            )}

            {/* Chat Area - Scrollable, takes remaining space */}
            <div className="flex-1 overflow-hidden min-h-0 relative">
                <ScrollArea className="h-full" viewportRef={chatScrollRef} hideScrollbar>
                    <div className="p-4 min-h-full flex flex-col">
                        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                            <MessageList
                                messages={messages as any}
                                isStreaming={isLoading}
                            />
                        </div>
                    </div>
                </ScrollArea>
                <DotScrollIndicator
                    scrollRef={chatScrollRef}
                    maxDots={7}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    minHeightGrowth={0}
                />
            </div>

            {/* Input Bar - Fixed at bottom */}
            <div className="flex-shrink-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/30">
                <div className="max-w-3xl mx-auto w-full space-y-3">
                    <PresetGrid onSelect={handlePresetClick} />
                    <ChatInput onSend={handleSend} disabled={isLoading} />
                </div>
            </div>
        </div>
    );
}
