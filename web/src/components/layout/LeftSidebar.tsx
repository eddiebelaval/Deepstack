'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
    MessageSquare,
    Plus,
    PanelLeftClose,
    PanelLeftOpen,
    User,
    Settings,
    ChevronRight,
    X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function LeftSidebar() {
    const { leftSidebarOpen, toggleLeftSidebar, setLeftSidebarOpen, toggleProfile, toggleSettings, profileOpen, settingsOpen } = useUIStore();
    const { conversations, currentConversationId, setCurrentConversation } = useChatStore();
    const { isMobile, isTablet, isDesktop } = useIsMobile();
    const chatHistoryRef = useRef<HTMLDivElement>(null);

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
                        <span className="font-semibold text-primary tracking-tight">DeepStack</span>
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

                {/* Bottom Section - Profile & Settings */}
                <div className="mt-auto border-t border-sidebar-border p-2 space-y-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={profileOpen ? "secondary" : "ghost"}
                                onClick={toggleProfile}
                                className={cn(
                                    "w-full rounded-xl h-11 tap-target",
                                    showExpanded ? "justify-start" : "justify-center px-0"
                                )}
                            >
                                <User className="h-4 w-4" />
                                {showExpanded && (
                                    <>
                                        <span className="ml-2 flex-1 text-left">Profile</span>
                                        <ChevronRight className="h-3 w-3 opacity-50" />
                                    </>
                                )}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Profile</TooltipContent>}
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={settingsOpen ? "secondary" : "ghost"}
                                onClick={toggleSettings}
                                className={cn(
                                    "w-full rounded-xl h-11 tap-target",
                                    showExpanded ? "justify-start" : "justify-center px-0"
                                )}
                            >
                                <Settings className="h-4 w-4" />
                                {showExpanded && (
                                    <>
                                        <span className="ml-2 flex-1 text-left">Settings</span>
                                        <ChevronRight className="h-3 w-3 opacity-50" />
                                    </>
                                )}
                            </Button>
                        </TooltipTrigger>
                        {!showExpanded && <TooltipContent side="right">Settings</TooltipContent>}
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    );
}
