'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useThesisStore } from '@/lib/stores/thesis-store';
import { useJournalStore } from '@/lib/stores/journal-store';
import { usePersonaStore } from '@/lib/stores/persona-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUser } from '@/hooks/useUser';
import { useChatLimit } from '@/hooks/useChatLimit';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { ChatLimitBanner } from '@/components/ui/upgrade-banner';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Button } from '@/components/ui/button';
import { ChartPanel } from '@/components/trading/ChartPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { PositionsPanel } from '@/components/trading/PositionsPanel';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EmotionalFirewallBanner } from '@/components/emotional-firewall';
import { X, ArrowDown } from 'lucide-react';

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
    const { chatsToday, dailyLimit, remaining, canChat } = useChatLimit();
    const { activeProvider, setIsStreaming, useExtendedThinking } = useChatStore();
    const { activeContent, setActiveContent } = useUIStore();
    const { activeSymbol, setActiveSymbol } = useTradingStore();
    const { theses: thesisEntries } = useThesisStore();
    const { entries: journalEntries } = useJournalStore();
    const { activePersonaId } = usePersonaStore();
    const { isMobile } = useIsMobile();
    const { requireAuth } = useRequireAuth();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showChatLimitPrompt, setShowChatLimitPrompt] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Track scroll position to show/hide scroll-to-bottom button
    useEffect(() => {
        const scrollElement = chatScrollRef.current;
        if (!scrollElement) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollElement;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            // Show button if scrolled up more than 200px from bottom
            setShowScrollToBottom(distanceFromBottom > 200);
        };

        scrollElement.addEventListener('scroll', handleScroll);
        return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        chatScrollRef.current?.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    };

    // Symbol search state - Reserved for future implementation
    // const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
    // const [symbolSearchValue, setSymbolSearchValue] = useState('');
    // const symbolInputRef = useRef<HTMLInputElement>(null);

    // // Focus symbol input when search opens
    // useEffect(() => {
    //     if (isSearchingSymbol && symbolInputRef.current) {
    //         symbolInputRef.current.focus();
    //     }
    // }, [isSearchingSymbol]);

    // const handleSymbolSearch = (e: React.FormEvent) => {
    //     e.preventDefault();
    //     const symbol = symbolSearchValue.trim().toUpperCase();
    //     if (symbol) {
    //         setActiveSymbol(symbol);
    //         setSymbolSearchValue('');
    //         setIsSearchingSymbol(false);
    //     }
    // };

    // const handleSymbolKeyDown = (e: React.KeyboardEvent) => {
    //     if (e.key === 'Escape') {
    //         setSymbolSearchValue('');
    //         setIsSearchingSymbol(false);
    //     }
    // };

    // Basic intent detection
    // NOTE: We intentionally do NOT set activeContent to 'chart' here.
    // The front page HomeWidgets chart should persist when mentioning stocks.
    // We only update activeSymbol so the sidebar chart can react to it.
    // For other tools (portfolio, orders, etc.) we still set activeContent as those
    // should replace the content area.
    const detectIntent = useCallback((content: string) => {
        const lower = content.toLowerCase();
        // For stock mentions, only update activeSymbol (sidebar chart updates)
        // Don't replace the front page chart by setting activeContent='chart'
        if (lower.includes('spy')) setActiveSymbol('SPY');
        if (lower.includes('aapl')) setActiveSymbol('AAPL');
        if (lower.includes('nvda')) setActiveSymbol('NVDA');
        if (lower.includes('tsla')) setActiveSymbol('TSLA');
        if (lower.includes('msft')) setActiveSymbol('MSFT');

        // For explicit tool panels, we do want to show them
        if (lower.includes('portfolio') || lower.includes('positions') || lower.includes('buy') || lower.includes('sell') || lower.includes('order')) {
            setActiveContent('portfolio');
        } else if (lower.includes('deep value') || lower.includes('value screen')) {
            setActiveContent('deep-value');
        } else if (lower.includes('hedged') || lower.includes('conviction')) {
            setActiveContent('hedged-positions');
        } else if (lower.includes('prediction') || lower.includes('kalshi') || lower.includes('polymarket') || lower.includes('betting market')) {
            setActiveContent('prediction-markets');
        }

    }, []);

    // Handle tool results that control UI
    // NOTE: 'show_chart' tool explicitly swaps to the TradingChart view.
    // 'detectIntent' (mentions) does NOT swap, keeping HomeWidgets visible.
    const handleToolResult = useCallback((toolName: string, result: any) => {
        if (result?.action === 'show_panel') {
            const panelMap: Record<string, typeof activeContent> = {
                'chart': 'chart',
                'portfolio': 'portfolio',
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

    }, []);

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
            // Build context for the AI with full semantic awareness
            const activeTheses = thesisEntries
                .filter((t) => t.status === 'active' || t.status === 'drafting')
                .slice(0, 5)
                .map((t) => ({
                    id: t.id,
                    symbol: t.symbol,
                    hypothesis: t.hypothesis,
                    timeframe: t.timeframe,
                    targetEntry: t.entryTarget,
                    targetExit: t.exitTarget,
                    stopLoss: t.stopLoss,
                    confidence: t.validationScore || 50, // Use validation score as confidence proxy
                    status: t.status,
                }));

            const recentJournal = journalEntries
                .slice(0, 10)
                .map((j) => ({
                    id: j.id,
                    symbol: j.symbol,
                    content: j.notes, // Use notes as the main content
                    emotions: [j.emotionAtEntry, j.emotionAtExit].filter(Boolean) as string[],
                    createdAt: j.createdAt,
                }));

            const context = {
                activeSymbol,
                activePanel: activeContent,
                activeTheses: activeTheses.length > 0 ? activeTheses : undefined,
                recentJournal: recentJournal.length > 0 ? recentJournal : undefined,
                // Note: positions, watchlist, emotionalState can be added when those stores are connected
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    provider: activeProvider,
                    context,
                    useExtendedThinking,
                    personaId: activePersonaId,
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            let thinkingContent = '';
            const assistantId = crypto.randomUUID();
            const toolInvocations: any[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // Decode the chunk and accumulate directly
                    // toTextStreamResponse() sends raw UTF-8 text, not prefixed data stream
                    const chunk = decoder.decode(value, { stream: true });
                    assistantContent += chunk;

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
    }, [messages, activeProvider, activeSymbol, activeContent, thesisEntries, journalEntries, setIsStreaming, setActiveContent, setActiveSymbol, handleToolResult, requireAuth, canChat, tier, detectIntent, useExtendedThinking, activePersonaId]);

    const hasMessages = messages.length > 0;
    const hasActiveContent = activeContent !== 'none';

    // Show chat limit indicator for free users near or at limit
    const showChatLimitIndicator = tier === 'free' && (remaining <= 2 || chatsToday >= dailyLimit);

    const handlePresetClick = (prompt: string) => {
        handleSend(prompt);
    };

    const closeContentZone = () => {
        setActiveContent('none');
    };

    // Render the active content (chart, orders, etc.)
    // Note: Parent container must have explicit height for flex-1 to work
    const renderActiveContent = () => {
        // Full Chart with toolbar, timeframes, indicators
        if (activeContent === 'chart') {
            return (
                <div className="h-full overflow-hidden bg-card">
                    <ChartPanel />
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
        if (activeContent === 'positions') {
            return (
                <div className="h-full overflow-hidden bg-card border-t border-border/50">
                    <PositionsPanel />
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
                    <div className="text-center max-w-2xl px-4">
                        <EmptyState
                            subtitle={isMobile
                                ? "Your AI trading assistant"
                                : "I can analyze charts, review your portfolio, and find trading setups."
                            }
                            size={isMobile ? "md" : "lg"}
                        />
                        {tier === 'free' && (
                            <p className="text-xs text-muted-foreground mt-4">
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

                    {/* Emotional Firewall Banner */}
                    <div className="w-full">
                        <EmotionalFirewallBanner compact />
                    </div>

                    {/* Chat Limit Indicator */}
                    {showChatLimitIndicator && (
                        <div className="w-full max-w-md mx-auto">
                            <ChatLimitBanner used={chatsToday} limit={dailyLimit} />
                        </div>
                    )}

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

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Mobile: Full-screen tool panel with close button, no resizable split */}
            {/* Desktop: Resizable split between tool panel and chat */}
            {hasActiveContent && isMobile ? (
                // Mobile: Full-height tool panel with close button
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Tool Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 flex-shrink-0 h-12 bg-background/95 backdrop-blur-sm">
                        <span className="text-sm font-semibold text-foreground">
                            {activeContent === 'chart' && 'Chart'}
                            {activeContent === 'portfolio' && 'Positions'}
                            {activeContent === 'deep-value' && 'Deep Value'}
                            {activeContent === 'hedged-positions' && 'Hedged Positions'}
                            {activeContent === 'options-screener' && 'Options'}
                            {activeContent === 'options-builder' && 'Strategy Builder'}
                            {activeContent === 'screener' && 'Screener'}
                            {activeContent === 'alerts' && 'Alerts'}
                            {activeContent === 'positions' && 'Positions'}
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
            ) : hasActiveContent ? (
                // Desktop: Resizable split panels
                <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                    {/* Tool Panel (Top) */}
                    <ResizablePanel defaultSize={55} minSize={25} className="flex flex-col min-h-0">
                        <div className="flex flex-col h-full bg-background border-b border-border/30">
                            {/* Tool Header */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 flex-shrink-0 h-10">
                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    {activeContent === 'chart' && 'Full Chart'}
                                    {activeContent === 'portfolio' && 'Positions'}
                                    {activeContent === 'deep-value' && 'Deep Value Screener'}
                                    {activeContent === 'hedged-positions' && 'Hedged Position Manager'}
                                    {activeContent === 'options-screener' && 'Options Screener'}
                                    {activeContent === 'options-builder' && 'Strategy Builder'}
                                    {activeContent === 'screener' && 'Stock Screener'}
                                    {activeContent === 'alerts' && 'Price Alerts'}
                                    {activeContent === 'positions' && 'Portfolio Positions'}
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
                            {/* Scroll to bottom FAB */}
                            {showScrollToBottom && (
                                <Button
                                    onClick={scrollToBottom}
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground transition-all animate-in fade-in slide-in-from-bottom-2"
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex-shrink-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/30">
                            <div className="max-w-3xl mx-auto w-full space-y-2">
                                <EmotionalFirewallBanner compact className="mb-2" />
                                {showChatLimitIndicator && (
                                    <ChatLimitBanner used={chatsToday} limit={dailyLimit} className="mb-2" />
                                )}
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
                        {/* Scroll to bottom FAB */}
                        {showScrollToBottom && (
                            <Button
                                onClick={scrollToBottom}
                                size="icon"
                                variant="secondary"
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground transition-all animate-in fade-in slide-in-from-bottom-2"
                            >
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex-shrink-0 p-3 bg-background/90 backdrop-blur-md border-t border-border/30">
                        <div className="max-w-3xl mx-auto w-full space-y-2">
                            <EmotionalFirewallBanner compact className="mb-2" />
                            {showChatLimitIndicator && (
                                <ChatLimitBanner used={chatsToday} limit={dailyLimit} className="mb-2" />
                            )}
                            <ChatInput onSend={handleSend} disabled={isLoading} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
