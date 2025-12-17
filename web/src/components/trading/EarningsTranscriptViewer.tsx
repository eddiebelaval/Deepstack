'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Search,
  Mic,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Calendar,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEarningsTranscripts } from '@/lib/stores/perplexity-finance-store';
import { ResearchMarkdown } from '@/components/research/ResearchMarkdown';

/**
 * EarningsTranscriptViewer - View and analyze S&P 500 earnings call transcripts
 *
 * Features:
 * - Search by symbol and quarter
 * - AI-summarized key points from earnings calls
 * - Sentiment analysis indicators
 * - Management guidance highlights
 */

// Quarter options
const QUARTERS = [
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
];

// Generate year options (last 3 years)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

interface EarningsTranscriptViewerProps {
  className?: string;
  initialSymbol?: string;
}

export function EarningsTranscriptViewer({
  className,
  initialSymbol,
}: EarningsTranscriptViewerProps) {
  const [symbol, setSymbol] = useState(initialSymbol || '');
  const [quarter, setQuarter] = useState<string>('any');
  const [year, setYear] = useState<string>(String(currentYear));

  const {
    earnings,
    earningsLoading,
    earningsError,
    getEarningsTranscript,
    clearEarnings,
  } = useEarningsTranscripts();

  const handleSearch = () => {
    if (!symbol.trim()) return;
    getEarningsTranscript(
      symbol.trim().toUpperCase(),
      quarter && quarter !== 'any' ? quarter : undefined,
      year ? parseInt(year) : undefined
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Detect sentiment from content
  const detectSentiment = (content: string): 'bullish' | 'bearish' | 'neutral' => {
    const lower = content.toLowerCase();
    const bullishWords = ['growth', 'exceeded', 'strong', 'positive', 'outperform', 'record', 'momentum'];
    const bearishWords = ['decline', 'missed', 'weak', 'negative', 'underperform', 'concern', 'challenge'];

    const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
    const bearishCount = bearishWords.filter(w => lower.includes(w)).length;

    if (bullishCount > bearishCount + 1) return 'bullish';
    if (bearishCount > bullishCount + 1) return 'bearish';
    return 'neutral';
  };

  const SentimentBadge = ({ sentiment }: { sentiment: 'bullish' | 'bearish' | 'neutral' }) => {
    const config = {
      bullish: {
        icon: TrendingUp,
        className: 'bg-green-500/20 text-green-600 dark:text-green-400',
        label: 'Bullish',
      },
      bearish: {
        icon: TrendingDown,
        className: 'bg-red-500/20 text-red-600 dark:text-red-400',
        label: 'Bearish',
      },
      neutral: {
        icon: Minus,
        className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
        label: 'Neutral',
      },
    };

    const { icon: Icon, className: badgeClass, label } = config[sentiment];

    return (
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1', badgeClass)}>
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  };

  // Parse key points from content
  const parseKeyPoints = (content: string) => {
    const points: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for bullet points or numbered items
      const match = line.match(/^[\-\*•]\s*(.+)$/) || line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        points.push(match[1]);
      }
    }

    return points.length > 0 ? points : null;
  };

  return (
    <div className={cn('h-full flex flex-col p-4 gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Earnings Transcripts</h2>
        </div>
        {earnings && (
          <Button variant="ghost" size="sm" onClick={clearEarnings}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Form */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Search Earnings Calls
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Symbol Input */}
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <Label htmlFor="symbol" className="text-xs">Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
              />
            </div>

            {/* Quarter Select */}
            <div className="space-y-1.5">
              <Label htmlFor="quarter" className="text-xs">Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger id="quarter" className="h-8 text-sm">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Quarter</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Select */}
            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year" className="h-8 text-sm">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="space-y-1.5 flex items-end">
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={!symbol.trim() || earningsLoading}
                className="w-full h-8"
              >
                {earningsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5 mr-1" />
                )}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {earningsError ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">{earningsError}</span>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Retry
              </Button>
            </div>
          </Card>
        ) : earningsLoading ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Analyzing earnings call...
              </span>
            </div>
          </Card>
        ) : earnings ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span>{earnings.symbol}</span>
                  {earnings.quarter && (
                    <span className="text-muted-foreground">
                      - {earnings.quarter} {earnings.year}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={detectSentiment(earnings.content)} />
                  {earnings.mock && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                      Mock
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            <Separator />

            <ScrollArea className="flex-1 p-3">
              {/* Key Points */}
              {parseKeyPoints(earnings.content) && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Key Takeaways
                  </h3>
                  <ul className="space-y-1.5">
                    {parseKeyPoints(earnings.content)!.map((point, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Summary */}
              <div className="mb-4">
                <ResearchMarkdown content={earnings.content} />
              </div>

              {/* Citations */}
              {earnings.citations && earnings.citations.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {earnings.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Transcript Source {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-3 py-2 border-t flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                AI-analyzed by Perplexity Finance
              </span>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Mic className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="text-sm font-medium">Search Earnings Transcripts</p>
                <p className="text-xs">
                  Enter a stock symbol to analyze earnings call transcripts
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default EarningsTranscriptViewer;
