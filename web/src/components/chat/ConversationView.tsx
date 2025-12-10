'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUser } from '@/hooks/useUser';
import { useChatLimit } from '@/hooks/useChatLimit';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TradingChart } from '@/components/charts/TradingChart';
import { ChartToolbar } from '@/components/charts/ChartToolbar';
import { DrawingToolbar } from '@/components/charts/DrawingToolbar';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { DeepValuePanel } from '@/components/trading/DeepValuePanel';
import { HedgedPositionsPanel } from '@/components/trading/HedgedPositionsPanel';
import { ScreenerPanel } from '@/components/trading/ScreenerPanel';
import { AlertsPanel } from '@/components/trading/AlertsPanel';
import { CalendarPanel } from '@/components/trading/CalendarPanel';
import { NewsPanel } from '@/components/trading/NewsPanel';
import { OptionsScreenerPanel, OptionsStrategyBuilder } from '@/components/options';
import { PredictionMarketsPanel } from '@/components/prediction-markets';
import { JournalList } from '@/components/journal/JournalList';
import { ThesisList } from '@/components/thesis/ThesisList';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { PresetGrid } from './PresetGrid';
// HomeWidgets moved to global MarketWatchPanel in DeepStackLayout
import { cn } from '@/lib/utils';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { LineChart, X, Search, Loader2 } from 'lucide-react';

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
    const { tier } = useUser();
    const { chatsToday, isAtLimit, remaining, canChat } = useChatLimit();
    const { activeProvider, setIsStreaming, useExtendedThinking } = useChatStore();
    const { activeContent, setActiveContent, chartPanelOpen, chartPanelCollapsed } = useUIStore();
    const { activeSymbol, setActiveSymbol } = useTradingStore();
    const { isLoadingBars, bars } = useMarketDataStore();
    const { isMobile, isDesktop } = useIsMobile();
    const { requireAuth } = useRequireAuth();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showChatLimitPrompt, setShowChatLimitPrompt] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Chart loading state
    const isChartLoading = activeSymbol ? isLoadingBars[activeSymbol] ?? false : false;
    const hasChartData = activeSymbol ? (bars[activeSymbol]?.length ?? 0) > 0 : false;

    // Symbol search state

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
    // NOTE: We intentionally do NOT set activeContent to 'chart' here.
    // The front page HomeWidgets chart should persist when mentioning stocks.
    // We only update activeSymbol so the sidebar chart can react to it.
    // For other tools (portfolio, orders, etc.) we still set activeContent as those
    // should replace the content area.
    const detectIntent = (content: string) => {
        const lower = content.toLowerCase();
        // For stock mentions, only update activeSymbol (sidebar chart updates)
        // Don't replace the front page chart by setting activeContent='chart'
        if (lower.includes('spy')) setActiveSymbol('SPY');
        if (lower.includes('aapl')) setActiveSymbol('AAPL');
        if (lower.includes('nvda')) setActiveSymbol('NVDA');
        if (lower.includes('tsla')) setActiveSymbol('TSLA');
        if (lower.includes('msft')) setActiveSymbol('MSFT');

        // For explicit tool panels, we do want to show them
        if (lower.includes('portfolio') || lower.includes('positions')) {
            setActiveContent('portfolio');
        } else if (lower.includes('buy') || lower.includes('sell') || lower.includes('order')) {
            setActiveContent('orders');
        } else if (lower.includes('deep value') || lower.includes('value screen')) {
            setActiveContent('deep-value');
        } else if (lower.includes('hedged') || lower.includes('conviction')) {
            setActiveContent('hedged-positions');
        } else if (lower.includes('prediction') || lower.includes('kalshi') || lower.includes('polymarket') || lower.includes('betting market')) {
            setActiveContent('prediction-markets');
        }
    };

    // Handle tool results that control UI
    // NOTE: 'show_chart' tool explicitly swaps to the TradingChart view.
    // 'detectIntent' (mentions) does NOT swap, keeping HomeWidgets visible.
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
                'prediction-markets': 'prediction-markets',
            };

            // Allow tool calls to switch content (including to 'chart')
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

        // Check daily chat limit for free users
        if (!canChat && tier === 'free') {
            setShowChatLimitPrompt(true);
            return;
        }

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
    };

    // Render the active content (chart, orders, etc.)
    // Note: Parent container must have explicit height for flex-1 to work
    const renderActiveContent = () => {
        // NOTE: 'chart' content is now rendered in the persistent panel above
        // But if we ever need it here (e.g. mobile?), we can keep it
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
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <DeepValuePanel />
                </div>
            );
        }
        if (activeContent === 'hedged-positions') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <HedgedPositionsPanel />
                </div>
            );
        }
        if (activeContent === 'options-screener') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <OptionsScreenerPanel />
                </div>
            );
        }
        if (activeContent === 'options-builder') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <OptionsStrategyBuilder />
                </div>
            );
        }
        if (activeContent === 'screener') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <ScreenerPanel />
                </div>
            );
        }
        if (activeContent === 'alerts') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <AlertsPanel />
                </div>
            );
        }
        if (activeContent === 'calendar') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <CalendarPanel />
                </div>
            );
        }
        if (activeContent === 'news') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <NewsPanel />
                </div>
            );
        }
        if (activeContent === 'prediction-markets') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <PredictionMarketsPanel />
                </div>
            );
        }
        if (activeContent === 'thesis') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <ThesisList />
                </div>
            );
        }
        if (activeContent === 'journal') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <JournalList />
                </div>
            );
        }
        if (activeContent === 'insights') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <InsightsPanel />
                </div>
            );
        }
        return null;
    };

    // Home state - no messages, no active content
    // Centered both horizontally and vertically on the page
    // Note: HomeWidgets now lives in the global MarketWatchPanel (top of page)
    if (!hasMessages && !hasActiveContent) {
        return (
            <div className={cn(
                "flex flex-col h-full overflow-hidden",
                isMobile ? "p-3" : "p-8"
            )}>
                {/* HomeWidgets moved to global MarketWatchPanel in DeepStackLayout */}

                {/* Centered Welcome Message - scrollable if content overflows */}
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center" style={{ overscrollBehavior: 'contain' }}>
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
                        {tier === 'free' && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {remaining} AI chats remaining today
                            </p>
                        )}
                    </div>
                </div>

                {/* Chat Limit Upgrade Prompt */}
                {showChatLimitPrompt && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="max-w-md">
                            <UpgradePrompt
                                feature="Unlimited AI Chat"
                                requiredTier="pro"
                                description={`You've used all ${chatsToday} of your free AI chats today. Upgrade to Pro for unlimited conversations with our AI assistant.`}
                            />
                            <Button
                                variant="ghost"
                                className="w-full mt-4"
                                onClick={() => setShowChatLimitPrompt(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}

                {/* Bottom Section: Presets and Input - Fixed at bottom */}
                <div className={cn(
                    "flex flex-col items-center w-full max-w-2xl mx-auto flex-shrink-0",
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
    // Note: HomeWidgets moved to global MarketWatchPanel - this panel only shows TradingChart
    // On mobile, we hide the chart panel entirely for better usability
    const showPersistentChart = !isMobile && chartPanelOpen && !chartPanelCollapsed && activeContent === 'chart';
    const chartPanelHeight = 350;
    const collapsedBarHeight = 40;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Persistent Trading Chart Panel - Only shows when activeContent is 'chart' */}
            {!isMobile && chartPanelOpen && activeContent === 'chart' && (
                <div
                    className="flex-shrink-0 border-b border-border/30 transition-all duration-300 ease-in-out overflow-hidden"
                    style={{ height: showPersistentChart ? chartPanelHeight : collapsedBarHeight }}
                >
                    <ChartToolbar />
                    {showPersistentChart && <DrawingToolbar />}
                    {showPersistentChart && (
                        <div className="h-[calc(100%-80px)] relative">
                            <TradingChart className="w-full h-full" />
                            {isChartLoading && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">Loading {activeSymbol}...</span>
                                    </div>
                                </div>
                            )}
                            {!isChartLoading && !hasChartData && (
                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <LineChart className="h-8 w-8 opacity-50" />
                                        <span className="text-sm">No data available for {activeSymbol}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Mobile: Full-screen tool panel with close button, no resizable split */}
            {/* Desktop: Resizable split between tool panel and chat */}
            {hasActiveContent && activeContent !== 'chart' && isMobile ? (
                // Mobile: Full-height tool panel with close button
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Tool Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 flex-shrink-0 h-12 bg-background/95 backdrop-blur-sm">
                        <span className="text-sm font-semibold text-foreground">
                            {activeContent === 'orders' && 'Order Entry'}
                            {activeContent === 'portfolio' && 'Positions'}
                            {activeContent === 'deep-value' && 'Deep Value'}
                            {activeContent === 'hedged-positions' && 'Hedged Positions'}
                            {activeContent === 'options-screener' && 'Options'}
                            {activeContent === 'options-builder' && 'Strategy Builder'}
                            {activeContent === 'screener' && 'Screener'}
                            {activeContent === 'alerts' && 'Alerts'}
                            {activeContent === 'calendar' && 'Calendar'}
                            {activeContent === 'news' && 'News'}
                            {activeContent === 'prediction-markets' && 'Markets'}
                            {activeContent === 'thesis' && 'Thesis'}
                            {activeContent === 'journal' && 'Journal'}
                            {activeContent === 'insights' && 'Insights'}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive tap-target"
                            onClick={closeContentZone}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    {/* Tool Content - Full height on mobile */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {renderActiveContent()}
                    </div>
                </div>
            ) : hasActiveContent && activeContent !== 'chart' ? (
                // Desktop: Resizable split panels
                <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                    {/* Tool Panel (Top) */}
                    <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0">
                        <div className="flex flex-col h-full bg-background border-b border-border/30">
                            {/* Tool Header */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 flex-shrink-0 h-10">
                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
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
                                    {activeContent === 'prediction-markets' && 'Prediction Markets'}
                                    {activeContent === 'thesis' && 'Thesis Engine'}
                                    {activeContent === 'journal' && 'Trade Journal'}
                                    {activeContent === 'insights' && 'AI Insights'}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                    onClick={closeContentZone}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            {/* Tool Content */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {renderActiveContent()}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Chat Area (Bottom) */}
                    <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0">
                        {/* Chat Messages */}
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

                        {/* Chat Input */}
                        <div className="flex-shrink-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/30">
                            <div className="max-w-3xl mx-auto w-full space-y-3">
                                <PresetGrid onSelect={handlePresetClick} />
                                <ChatInput onSend={handleSend} disabled={isLoading} />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                /* Chat Only View (Full Height) - Used when chart is top panel or no active content */
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Messages */}
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

                    {/* Chat Input */}
                    <div className="flex-shrink-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/30">
                        <div className="max-w-3xl mx-auto w-full space-y-3">
                            <PresetGrid onSelect={handlePresetClick} />
                            <ChatInput onSend={handleSend} disabled={isLoading} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
