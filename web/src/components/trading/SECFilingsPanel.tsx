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
  FileText,
  ExternalLink,
  Sparkles,
  AlertCircle,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSECFilings } from '@/lib/stores/perplexity-finance-store';

/**
 * SECFilingsPanel - Search and analyze SEC filings
 *
 * Features:
 * - Search by symbol and filing type (10-K, 10-Q, 8-K, S-1, etc.)
 * - Optional keyword query within filings
 * - AI-summarized results from Perplexity Finance
 * - Direct links to SEC EDGAR
 * - Mock mode indicator when API not configured
 */

// Filing type options
const FILING_TYPES = [
  { value: 'all', label: 'All Filings' },
  { value: '10-K', label: '10-K (Annual Report)' },
  { value: '10-Q', label: '10-Q (Quarterly Report)' },
  { value: '8-K', label: '8-K (Current Report)' },
  { value: 'S-1', label: 'S-1 (Registration)' },
  { value: '4', label: 'Form 4 (Insider Trading)' },
  { value: 'DEF 14A', label: 'DEF 14A (Proxy Statement)' },
  { value: '13F', label: '13F (Institutional Holdings)' },
];

interface SECFilingsPanelProps {
  className?: string;
  initialSymbol?: string;
}

export function SECFilingsPanel({
  className,
  initialSymbol,
}: SECFilingsPanelProps) {
  const [symbol, setSymbol] = useState(initialSymbol || '');
  const [filingType, setFilingType] = useState('all');
  const [query, setQuery] = useState('');

  const {
    secFilings,
    secLoading,
    secError,
    searchSECFilings,
    clearSECFilings,
  } = useSECFilings();

  const handleSearch = () => {
    if (!symbol.trim()) return;
    searchSECFilings(symbol.trim().toUpperCase(), filingType, query || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Format filing type for display
  const getFilingTypeLabel = (type: string) => {
    const found = FILING_TYPES.find(f => f.value === type);
    return found?.label || type;
  };

  // Parse content into sections (if markdown-style headers)
  const parseContentSections = (content: string) => {
    const lines = content.split('\n');
    const sections: { title: string; content: string }[] = [];
    let currentTitle = 'Summary';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^##?\s+(.+)$/) || line.match(/^\*\*(.+)\*\*:?$/);
      if (headerMatch) {
        if (currentContent.length > 0) {
          sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
        }
        currentTitle = headerMatch[1];
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
    }

    return sections.length > 0 ? sections : [{ title: 'Summary', content }];
  };

  return (
    <div className={cn('h-full flex flex-col p-4 gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">SEC Filing Search</h2>
        </div>
        {secFilings && (
          <Button variant="ghost" size="sm" onClick={clearSECFilings}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Form */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search Filings
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Symbol Input */}
            <div className="space-y-1.5">
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

            {/* Filing Type Select */}
            <div className="space-y-1.5">
              <Label htmlFor="filingType" className="text-xs">Filing Type</Label>
              <Select value={filingType} onValueChange={setFilingType}>
                <SelectTrigger id="filingType" className="h-8 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FILING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Query */}
            <div className="space-y-1.5">
              <Label htmlFor="query" className="text-xs">
                Search Within (optional)
              </Label>
              <Input
                id="query"
                placeholder="e.g., revenue growth"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={!symbol.trim() || secLoading}
            >
              {secLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1" />
              )}
              Search SEC Filings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {secError ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">{secError}</span>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Retry
              </Button>
            </div>
          </Card>
        ) : secLoading ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Analyzing SEC filings...
              </span>
            </div>
          </Card>
        ) : secFilings ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{secFilings.symbol}</span>
                  <span className="text-muted-foreground">
                    - {getFilingTypeLabel(secFilings.filingType)}
                  </span>
                </div>
                {secFilings.mock && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                    Mock Data
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <Separator />

            <ScrollArea className="flex-1 p-3">
              {parseContentSections(secFilings.content).map((section, idx) => (
                <div key={idx} className="mb-4">
                  <h3 className="text-sm font-medium mb-2">{section.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              ))}

              {/* Citations */}
              {secFilings.citations && secFilings.citations.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {secFilings.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {citation.includes('sec.gov') ? 'SEC EDGAR' : `Source ${idx + 1}`}
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
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${secFilings.symbol}&type=${filingType === 'all' ? '' : filingType}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View on SEC EDGAR
              </a>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="text-sm font-medium">Search SEC Filings</p>
                <p className="text-xs">
                  Enter a stock symbol to analyze SEC filings with AI
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default SECFilingsPanel;
