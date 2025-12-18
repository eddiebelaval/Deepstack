'use client';

import React, { useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { UserMenu } from '@/components/auth/UserMenu';
import { WatchlistManagementDialog } from '@/components/trading/WatchlistManagementDialog';
import { SidebarUpgradeBanner } from '@/components/ui/upgrade-banner';
import { useUser } from '@/hooks/useUser';
import { useChatLimit } from '@/hooks/useChatLimit';
import {
    MessageSquare,
    Plus,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Lightbulb,
    BookOpen,
    Brain,
    ListChecks,
    Coins,
    Sparkles,
    FileSearch,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTourStep, TourPing } from '@/components/onboarding';

export function LeftSidebar() {
    const { leftSidebarOpen, toggleLeftSidebar, setLeftSidebarOpen, toggleProfile, toggleSettings, toggleUsage, profileOpen, settingsOpen, usageOpen, activeContent, setActiveContent } = useUIStore();
    const { conversations, currentConversationId, setCurrentConversation } = useChatStore();
    const { isMobile, isTablet, isDesktop } = useIsMobile();
    const { tier } = useUser();
    const { chatsToday, dailyLimit, isLoading: chatLimitLoading } = useChatLimit();
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);

    // Tour integration
    const { isActive: isThesisTourActive, step: thesisTourStep, dismiss: dismissThesisTour } = useTourStep('thesis');
    const { isActive: isJournalTourActive, step: journalTourStep, dismiss: dismissJournalTour } = useTourStep('journal');

    // Show upgrade banner for free tier users
    const showUpgradeBanner = tier === 'free';

    const handleNewChat = () => {
        setCurrentConversation(null);
        // Close sidebar on mobile after action
        if (isMobile || isTablet) {
            setLeftSidebarOpen(false);
        }
    };

    const handleConversationClick = (id: string) => {
        setCurrentConversation(id);
        // Close sidebar on mobile after selection
        if (isMobile || isTablet) {
            setLeftSidebarOpen(false);
        }
    };

    // Group conversations by date
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groupedConversations = {
        today: conversations.filter(c => c.created_at && new Date(c.created_at) >= todayStart),
        yesterday: conversations.filter(c => c.created_at && new Date(c.created_at) >= yesterdayStart && new Date(c.created_at) < todayStart),
        thisWeek: conversations.filter(c => c.created_at && new Date(c.created_at) >= weekStart && new Date(c.created_at) < yesterdayStart),
        older: conversations.filter(c => !c.created_at || new Date(c.created_at) < weekStart),
    };

    // Determine if sidebar should show expanded mode
    const showExpanded = isDesktop ? leftSidebarOpen : true; // Always expanded content on mobile when open

    const renderConversationGroup = (title: string, convs: typeof conversations) => {
        if (convs.length === 0) return null;
        return (
            <div className="mb-4">
                {showExpanded && (
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </div>
                )}
                <div className="space-y-0.5">
                    {convs.map((conv) => (
                        <TooltipProvider key={conv.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={currentConversationId === conv.id ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                            !showExpanded && "justify-center px-2"
                                        )}
                                        onClick={() => handleConversationClick(conv.id)}
                                    >
                                        <MessageSquare className="h-4 w-4 shrink-0" />
                                        {showExpanded && (
                                            <span className="ml-2 truncate">{conv.title || "Untitled Chat"}</span>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                {!showExpanded && (
                                    <TooltipContent side="right">
                                        {conv.title || "Untitled Chat"}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </div>
        );
    };

    // Mobile/Tablet: Full-width drawer, hidden when closed
    // Desktop: Original collapsible sidebar behavior
    const sidebarClasses = cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-40",
        // Mobile/Tablet: Full-width drawer that slides in
        (isMobile || isTablet) && [
            "w-80 max-w-[85vw]",
            leftSidebarOpen ? "translate-x-0" : "-translate-x-full",
            "shadow-2xl"
        ],
        // Desktop: Original collapsible behavior
        isDesktop && [
            leftSidebarOpen ? "w-64" : "w-14",
            "translate-x-0"
        ]
    );

    // Don't render on mobile/tablet if closed (for performance)
    if ((isMobile || isTablet) && !leftSidebarOpen) {
        return null;
    }

    return (
        <TooltipProvider>
            <aside className={sidebarClasses}>
                {/* Header with Logo & Toggle/Close */}
                <div className={cn(
                    "flex items-center h-14 border-b border-sidebar-border px-3",
                    showExpanded ? "justify-between" : "justify-center"
                )}>
                    {showExpanded && (
                        <Logo size="lg" />
                    )}

                    {/* Mobile: Close button / Desktop: Collapse toggle */}
                    {(isMobile || isTablet) ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLeftSidebarOpen(false)}
                            className="h-10 w-10 rounded-xl tap-target"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleLeftSidebar}
                                    className="h-8 w-8 rounded-lg"
                                >
                                    {leftSidebarOpen ? (
                                        <PanelLeftClose className="h-4 w-4" />
                                    ) : (
                                        <PanelLeftOpen className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {leftSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* New Chat Button */}
                <div className="p-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="default"
                                className={cn(
                                    "w-full rounded-xl h-11 tap-target",
                                    showExpanded ? "justify-start" : "justify-center px-0"
                                )}
                                onClick={handleNewChat}
                            >
                                <Plus className="h-4 w-4" />
                                {showExpanded && <span className="ml-2">New Chat</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">New Chat</TooltipContent>}
                    </Tooltip>
                </div>

                {/* Thesis Engine & Journal Section */}
                <div className="px-2 space-y-1 border-b border-sidebar-border pb-3 mb-3">
                    {showExpanded && (
                        <div className="px-1 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Research Tools
                        </div>
                    )}
                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={activeContent === 'thesis' ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                        !showExpanded && "justify-center px-2",
                                        activeContent === 'thesis' && "bg-primary/20 text-primary"
                                    )}
                                    onClick={() => {
                                        setActiveContent(activeContent === 'thesis' ? 'none' : 'thesis');
                                        if (isMobile || isTablet) setLeftSidebarOpen(false);
                                    }}
                                >
                                    <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
                                    {showExpanded && <span className="ml-2">Thesis Engine</span>}
                                </Button>
                            </TooltipTrigger>
                            {!showExpanded && <TooltipContent side="right">Thesis Engine</TooltipContent>}
                        </Tooltip>
                        {/* Tour Ping for Thesis Step - shows even when sidebar is collapsed */}
                        {isThesisTourActive && thesisTourStep && (
                            <div className={cn(
                                "absolute top-1/2 -translate-y-1/2 z-50",
                                showExpanded ? "-right-2" : "left-full ml-2"
                            )}>
                                <TourPing
                                    isActive={isThesisTourActive}
                                    title={thesisTourStep.title}
                                    description={thesisTourStep.description}
                                    tip={thesisTourStep.tip}
                                    position="right"
                                    onDismiss={dismissThesisTour}
                                />
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={activeContent === 'journal' ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                        !showExpanded && "justify-center px-2",
                                        activeContent === 'journal' && "bg-primary/20 text-primary"
                                    )}
                                    onClick={() => {
                                        setActiveContent(activeContent === 'journal' ? 'none' : 'journal');
                                        if (isMobile || isTablet) setLeftSidebarOpen(false);
                                    }}
                                >
                                    <BookOpen className="h-4 w-4 shrink-0 text-blue-500" />
                                    {showExpanded && <span className="ml-2">Trade Journal</span>}
                                </Button>
                            </TooltipTrigger>
                            {!showExpanded && <TooltipContent side="right">Trade Journal</TooltipContent>}
                        </Tooltip>
                        {/* Tour Ping for Journal Step - shows even when sidebar is collapsed */}
                        {isJournalTourActive && journalTourStep && (
                            <div className={cn(
                                "absolute top-1/2 -translate-y-1/2 z-50",
                                showExpanded ? "-right-2" : "left-full ml-2"
                            )}>
                                <TourPing
                                    isActive={isJournalTourActive}
                                    title={journalTourStep.title}
                                    description={journalTourStep.description}
                                    tip={journalTourStep.tip}
                                    position="right"
                                    onDismiss={dismissJournalTour}
                                />
                            </div>
                        )}
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={activeContent === 'insights' ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                    !showExpanded && "justify-center px-2",
                                    activeContent === 'insights' && "bg-primary/20 text-primary"
                                )}
                                onClick={() => {
                                    setActiveContent(activeContent === 'insights' ? 'none' : 'insights');
                                    if (isMobile || isTablet) setLeftSidebarOpen(false);
                                }}
                            >
                                <Brain className="h-4 w-4 shrink-0 text-purple-500" />
                                {showExpanded && <span className="ml-2">Insights</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">AI Insights</TooltipContent>}
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={activeContent === 'research-hub' ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                    !showExpanded && "justify-center px-2",
                                    activeContent === 'research-hub' && "bg-primary/20 text-primary"
                                )}
                                onClick={() => {
                                    setActiveContent(activeContent === 'research-hub' ? 'none' : 'research-hub');
                                    if (isMobile || isTablet) setLeftSidebarOpen(false);
                                }}
                            >
                                <FileSearch className="h-4 w-4 shrink-0 text-cyan-500" />
                                {showExpanded && <span className="ml-2">Research Hub</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Research Hub (SEC, Earnings, Profiles)</TooltipContent>}
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={activeContent === 'deep-research' ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                    !showExpanded && "justify-center px-2",
                                    activeContent === 'deep-research' && "bg-primary/20 text-primary"
                                )}
                                onClick={() => {
                                    setActiveContent(activeContent === 'deep-research' ? 'none' : 'deep-research');
                                    if (isMobile || isTablet) setLeftSidebarOpen(false);
                                }}
                            >
                                <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
                                {showExpanded && <span className="ml-2">Deep Research</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Deep Research (Premium)</TooltipContent>}
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                    !showExpanded && "justify-center px-2"
                                )}
                                onClick={() => {
                                    setWatchlistDialogOpen(true);
                                    if (isMobile || isTablet) setLeftSidebarOpen(false);
                                }}
                            >
                                <ListChecks className="h-4 w-4 shrink-0 text-green-500" />
                                {showExpanded && <span className="ml-2">Watchlists</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Manage Watchlist</TooltipContent>}
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={usageOpen ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-sm font-normal rounded-xl h-10 tap-target",
                                    !showExpanded && "justify-center px-2",
                                    usageOpen && "bg-primary/20 text-primary"
                                )}
                                onClick={() => {
                                    toggleUsage();
                                    if (isMobile || isTablet) setLeftSidebarOpen(false);
                                }}
                            >
                                <Coins className="h-4 w-4 shrink-0 text-amber-500" />
                                {showExpanded && <span className="ml-2">Usage & Credits</span>}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Usage & Credits</TooltipContent>}
                    </Tooltip>
                </div>

                {/* Chat History */}
                <div className="flex-1 relative overflow-hidden">
                    <ScrollArea className="h-full px-2" viewportRef={chatHistoryRef} hideScrollbar>
                        {conversations.length === 0 ? (
                            showExpanded && (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No conversations yet</p>
                                    <p className="text-xs mt-1">Start a new chat to begin</p>
                                </div>
                            )
                        ) : (
                            <>
                                {renderConversationGroup("Today", groupedConversations.today)}
                                {renderConversationGroup("Yesterday", groupedConversations.yesterday)}
                                {renderConversationGroup("This Week", groupedConversations.thisWeek)}
                                {renderConversationGroup("Older", groupedConversations.older)}
                            </>
                        )}
                    </ScrollArea>
                    {showExpanded && (
                        <DotScrollIndicator
                            scrollRef={chatHistoryRef}
                            maxDots={5}
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                            minHeightGrowth={0}
                        />
                    )}
                </div>

                {/* Upgrade Banner for Free Users */}
                {showUpgradeBanner && showExpanded && (
                    <div className="px-2 pb-2">
                        <SidebarUpgradeBanner
                            showUsage={!chatLimitLoading ? { used: chatsToday, limit: dailyLimit } : undefined}
                        />
                    </div>
                )}

                {/* Bottom Section - User Menu with Profile & Settings */}
                <div className="mt-auto border-t border-sidebar-border p-2">
                    <UserMenu
                        expanded={showExpanded}
                        onProfileClick={toggleProfile}
                        onSettingsClick={toggleSettings}
                        profileOpen={profileOpen}
                        settingsOpen={settingsOpen}
                    />
                    {showExpanded && (
                        <div className="mt-2 text-center space-y-1">
                            <span className="text-[10px] text-muted-foreground/40 font-mono block">
                                v{process.env.NEXT_PUBLIC_APP_VERSION}
                            </span>
                            <a
                                href="https://id8labs.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors font-mono"
                            >
                                made by id8labs.app
                            </a>
                        </div>
                    )}
                </div>
            </aside>

            {/* Watchlist Management Dialog */}
            <WatchlistManagementDialog
                open={watchlistDialogOpen}
                onOpenChange={setWatchlistDialogOpen}
            />
        </TooltipProvider>
    );
}
