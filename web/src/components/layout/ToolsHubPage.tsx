'use client';

import React, { useState } from 'react';
import { Settings, ArrowRight } from 'lucide-react';
import { useUIStore, ActiveContentType } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChatHistoryContent } from './ChatHistoryContent';
import { SwipeableToolbar, type ToolHubContentType } from './SwipeableToolbar';
import { ToolContentRenderer } from '@/components/shared/ToolContentRenderer';

/**
 * Tools Hub Page
 *
 * Replacement for ChatHistoryPage in mobile swipe navigation (index 0).
 * Serves as a tools hub where Chat History is the default view and users can
 * cycle through full-screen tools using the swipeable toolbar.
 *
 * Structure:
 * - Header: Settings (left), dynamic title (center), navigate to chat (right)
 * - Content: ChatHistoryContent (history) OR ToolContentRenderer (active tool)
 * - Bottom: SwipeableToolbar with all available tools
 *
 * Usage:
 * ```tsx
 * <ToolsHubPage
 *   onSelectConversation={(id) => loadConversation(id)}
 *   onNewChat={() => createNewChat()}
 * />
 * ```
 */

interface ToolsHubPageProps {
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export function ToolsHubPage({ onSelectConversation, onNewChat }: ToolsHubPageProps) {
  // State management
  const [activeToolId, setActiveToolId] = useState<ToolHubContentType>('history');
  const { toggleSettings } = useUIStore();
  const { setCurrentConversation } = useChatStore();

  // Get tool display name for header
  const getToolTitle = (toolId: ToolHubContentType): string => {
    const toolNames: Record<ToolHubContentType, string> = {
      history: 'Threads',
      chart: 'Chart',
      portfolio: 'Portfolio',
      news: 'News',
      calendar: 'Calendar',
      screener: 'Screener',
      alerts: 'Alerts',
      'deep-value': 'Deep Value',
      'hedged-positions': 'Hedged Positions',
      'options-screener': 'Options Screener',
      'options-builder': 'Options Builder',
      'prediction-markets': 'Prediction Markets',
      thesis: 'Thesis',
      journal: 'Journal',
      analysis: 'Analysis',
      positions: 'Positions',
      insights: 'Insights',
      none: 'Tools Hub',
    };
    return toolNames[toolId] || 'Tools Hub';
  };

  // Handlers
  const handleSettingsClick = () => {
    toggleSettings();
  };

  const handleForwardClick = () => {
    // Navigate to chat page (swipe right effect)
    (window as any).__mobileSwipeNav?.navigateTo(1);
  };

  const handleToolSelect = (toolId: ToolHubContentType) => {
    setActiveToolId(toolId);
  };

  const handleNewChat = () => {
    // Clear current conversation and navigate to chat
    setCurrentConversation(null);
    onNewChat?.();
    handleForwardClick();
  };

  const handleConversationSelect = (id: string) => {
    // When a conversation is selected from history, navigate to chat view
    onSelectConversation?.(id);
    handleForwardClick();
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Top Header Bar */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          {/* Settings Button - Left */}
          <button
            onClick={handleSettingsClick}
            className="p-2 -ml-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6 text-muted-foreground" />
          </button>

          {/* Dynamic Title - Center */}
          <h1 className="text-lg font-semibold">{getToolTitle(activeToolId)}</h1>

          {/* Forward Arrow - Right */}
          <button
            onClick={handleForwardClick}
            className="p-2 -mr-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
            aria-label="Go to Chat"
          >
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content Area - Full Height */}
      <div className="flex-1 min-h-0">
        {activeToolId === 'history' ? (
          <ChatHistoryContent
            onSelectConversation={handleConversationSelect}
            onNewChat={handleNewChat}
          />
        ) : (
          <ToolContentRenderer
            contentType={activeToolId as ActiveContentType}
            variant="fullscreen"
            className="h-full"
          />
        )}
      </div>

      {/* Swipeable Toolbar - Fixed at Bottom */}
      <SwipeableToolbar
        activeToolId={activeToolId}
        onToolSelect={handleToolSelect}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
