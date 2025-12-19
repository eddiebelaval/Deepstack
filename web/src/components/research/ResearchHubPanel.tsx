'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SECFilingsPanel } from '@/components/trading/SECFilingsPanel';
import { EarningsTranscriptViewer } from '@/components/trading/EarningsTranscriptViewer';
import { CompanyProfilePanel } from '@/components/trading/CompanyProfilePanel';
import { cn } from '@/lib/utils';
import { FileText, Mic, Building2, Sparkles } from 'lucide-react';
import { ChatTip } from '@/components/ui/chat-tip';

/**
 * ResearchHubPanel - Unified panel for Perplexity Finance research tools
 *
 * Combines SEC Filings, Earnings Transcripts, and Company Profiles
 * into a single tabbed interface for easy access.
 */

interface ResearchHubPanelProps {
  className?: string;
  initialTab?: 'sec' | 'earnings' | 'company';
  initialSymbol?: string;
}

export function ResearchHubPanel({
  className,
  initialTab = 'sec',
  initialSymbol,
}: ResearchHubPanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Research Hub</h2>
          </div>
          <ChatTip
            example="Research NVDA earnings and guidance"
            moreExamples={['Summarize Tesla 10-K', 'What did CEO say about AI?']}
            className="mt-0.5 ml-7"
          />
        </div>
        <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
          Powered by Perplexity
        </span>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-11 flex-shrink-0">
          <TabsTrigger
            value="sec"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 gap-2"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">SEC Filings</span>
            <span className="sm:hidden">SEC</span>
          </TabsTrigger>
          <TabsTrigger
            value="earnings"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 gap-2"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Earnings Calls</span>
            <span className="sm:hidden">Earnings</span>
          </TabsTrigger>
          <TabsTrigger
            value="company"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 gap-2"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Company Profiles</span>
            <span className="sm:hidden">Company</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="sec" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <SECFilingsPanel initialSymbol={initialSymbol} />
          </TabsContent>

          <TabsContent value="earnings" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <EarningsTranscriptViewer initialSymbol={initialSymbol} />
          </TabsContent>

          <TabsContent value="company" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <CompanyProfilePanel initialEntity={initialSymbol} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border/50 flex items-center justify-end text-[10px] text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI-powered research
        </span>
      </div>
    </div>
  );
}

export default ResearchHubPanel;
