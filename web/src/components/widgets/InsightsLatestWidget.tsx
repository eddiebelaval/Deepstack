'use client';

import React from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';

/**
 * InsightsLatestWidget - AI-generated insights widget
 *
 * Features:
 * - Shows latest AI insights from chat conversations
 * - Empty state guides users to initiate AI analysis
 *
 * Note: Insights are generated through AI chat and not persisted yet.
 * Future: Add insights storage to persist valuable AI recommendations.
 */

export function InsightsLatestWidget() {
  // Currently no persistent insights storage - show empty/onboarding state
  // Future: Connect to an insights store to save valuable AI recommendations

  return (
    <div className="space-y-2">
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="mb-2">No saved insights yet</p>
        <p className="text-xs text-muted-foreground/70">
          Use the AI chat to analyze stocks and get personalized insights
        </p>
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary/70">
          <MessageCircle className="h-3 w-3" />
          <span>Try: &quot;Analyze NVDA&quot;</span>
        </div>
      </div>
    </div>
  );
}

// Named export for flexibility
export default InsightsLatestWidget;
