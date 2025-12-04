'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
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
import { OptionsScreenerPanel, OptionsStrategyBuilder } from '@/components/options';
import { Briefcase, LineChart, TrendingUp, Target, X, Maximize2, Minimize2, Square, RectangleHorizontal, Search, Loader2 } from 'lucide-react';

// Simple message type for our use case
type SimpleMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: Date;
    toolInvocations?: any[];
};

export function ConversationView() {
    const { activeProvider, setIsStreaming } = useChatStore();
    const { activeContent, setActiveContent } = useUIStore();
    const { activeSymbol, setActiveSymbol } = useTradingStore();
    const { isLoadingBars, bars } = useMarketDataStore();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Chart loading state
    const isChartLoading = activeSymbol ? isLoadingBars[activeSymbol] ?? false : false;
    const hasChartData = activeSymbol ? (bars[activeSymbol]?.length ?? 0) > 0 : false;

    // Chart size presets (in pixels)
    type ChartSize = 'compact' | 'default' | 'large' | 'full';
    const CHART_SIZES: Record<ChartSize, number> = {
        compact: 200,
        default: 280,
        large: 400,
        full: 550,
    };
    // Options panels need more height - use 'full' height for them
    const OPTIONS_PANEL_HEIGHT = 600;
    const [chartSize, setChartSize] = useState<ChartSize>('default');

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

    const handleSend = useCallback(async (content: string) => {
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
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    provider: activeProvider,
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            const assistantId = crypto.randomUUID();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    assistantContent += chunk;

                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId);
                        if (existing) {
                            return prev.map(m =>
                                m.id === assistantId ? { ...m, content: assistantContent } : m
                            );
                        } else {
                            return [...prev, {
                                id: assistantId,
                                role: 'assistant' as const,
                                content: assistantContent,
                                createdAt: new Date(),
                            }];
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
    }, [messages, activeProvider, setIsStreaming, setActiveContent, setActiveSymbol]);

    const hasMessages = messages.length > 0;
    const hasActiveContent = activeContent !== 'none';

    // Quick action presets
    const presets = [
        { prompt: "Analyze my portfolio", icon: Briefcase, desc: "Performance and risk" },
        { prompt: "Show me SPY chart", icon: LineChart, desc: "Real-time with indicators" },
        { prompt: "What's moving today?", icon: TrendingUp, desc: "Volume leaders" },
        { prompt: "Find asymmetric setups", icon: Target, desc: "Risk/reward plays" },
    ];

    const handlePresetClick = (prompt: string) => {
        handleSend(prompt);
    };

    const closeContentZone = () => {
        setActiveContent('none');
        setChartSize('default');
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
                <div className="flex-1 min-h-0 overflow-y-auto bg-card border-t border-border/50">
                    <DeepValuePanel />
                </div>
            );
        }
        if (activeContent === 'hedged-positions') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto bg-card border-t border-border/50">
                    <HedgedPositionsPanel />
                </div>
            );
        }
        if (activeContent === 'options-screener') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto bg-card border-t border-border/50">
                    <OptionsScreenerPanel />
                </div>
            );
        }
        if (activeContent === 'options-builder') {
            return (
                <div className="flex-1 min-h-0 overflow-y-auto bg-card border-t border-border/50">
                    <OptionsStrategyBuilder />
                </div>
            );
        }
        return null;
    };

    // Home state - no messages, no active content
    // Centered both horizontally and vertically on the page
    if (!hasMessages && !hasActiveContent) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8">
                {/* Centered content container */}
                <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
                    {/* Welcome Message - Floating on background */}
                    <div className="text-center space-y-3">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-2xl bg-primary/10">
                                <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground">
                            Welcome to DeepStack
                        </h2>
                        <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                            I can analyze charts, review your portfolio, find trading setups, and help you execute trades.
                        </p>
                    </div>

                    {/* Chat Input - Centered with clear separation */}
                    <div className="w-full">
                        <ChatInput onSend={handleSend} disabled={isLoading} />
                    </div>

                    {/* Preset Cards - Visually separated below */}
                    <div className="w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {presets.map((preset) => (
                                <button
                                    key={preset.prompt}
                                    onClick={() => handlePresetClick(preset.prompt)}
                                    className="group bg-card/40 hover:bg-card/60 border border-border/40 hover:border-border/60 rounded-xl p-4 flex items-center gap-3 transition-all duration-200 text-left"
                                >
                                    <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                                        <preset.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                            {preset.prompt}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {preset.desc}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Workspace view with active content and/or messages
    // Layout: Fixed height page, tool panel slides down from top, chat scrolls in middle, input at bottom
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tool Panel - Slides down from top when active */}
            {/* Using fixed pixel heights since percentage heights don't work well in nested flex contexts */}
            {hasActiveContent && (
                <div
                    className="flex-shrink-0 p-3 bg-background border-b border-border/30 transition-all duration-300 ease-in-out"
                    style={{ height: `${(activeContent === 'options-screener' || activeContent === 'options-builder') ? OPTIONS_PANEL_HEIGHT : CHART_SIZES[chartSize]}px` }}
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
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {activeContent === 'chart' && (
                                    <>
                                        {/* Size preset buttons */}
                                        <div className="flex items-center gap-0.5 mr-1 border-r border-border/50 pr-2">
                                            <Button
                                                variant={chartSize === 'compact' ? 'secondary' : 'ghost'}
                                                size="icon"
                                                className="h-6 w-6 rounded"
                                                onClick={() => setChartSize('compact')}
                                                title="Compact"
                                            >
                                                <Minimize2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant={chartSize === 'default' ? 'secondary' : 'ghost'}
                                                size="icon"
                                                className="h-6 w-6 rounded"
                                                onClick={() => setChartSize('default')}
                                                title="Default"
                                            >
                                                <Square className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant={chartSize === 'large' ? 'secondary' : 'ghost'}
                                                size="icon"
                                                className="h-6 w-6 rounded"
                                                onClick={() => setChartSize('large')}
                                                title="Large"
                                            >
                                                <RectangleHorizontal className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant={chartSize === 'full' ? 'secondary' : 'ghost'}
                                                size="icon"
                                                className="h-6 w-6 rounded"
                                                onClick={() => setChartSize('full')}
                                                title="Full"
                                            >
                                                <Maximize2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </>
                                )}
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
                    <div className="p-4">
                        <div className="max-w-3xl mx-auto">
                            <MessageList messages={messages as any} isStreaming={isLoading} />
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
                <div className="max-w-3xl mx-auto w-full">
                    <ChatInput onSend={handleSend} disabled={isLoading} />
                </div>
            </div>
        </div>
    );
}
