'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { searchMarkets as apiSearchMarkets } from '@/lib/api/prediction-markets';
import type { PredictionMarket, ThesisMarketLink, Platform } from '@/lib/types/prediction-markets';
import { ThesisMarketLinker } from '@/components/prediction-markets/ThesisMarketLinker';
import {
  TrendingUp,
  TrendingDown,
  Link2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Shield,
  Repeat,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThesisRelatedMarketsProps {
  thesisId: string;
  symbol?: string;
  hypothesis: string;
}

interface LinkedMarket extends ThesisMarketLink {
  currentPrice?: number;
}

const RELATIONSHIP_CONFIG: Record<
  ThesisMarketLink['relationship'],
  { label: string; color: string; icon: React.ElementType; description: string }
> = {
  supports: {
    label: 'Supports',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: TrendingUp,
    description: 'Market outcome aligns with thesis',
  },
  contradicts: {
    label: 'Contradicts',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: TrendingDown,
    description: 'Market outcome opposes thesis',
  },
  correlates: {
    label: 'Correlates',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: Repeat,
    description: 'Market moves with thesis conditions',
  },
  hedges: {
    label: 'Hedges',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Shield,
    description: 'Market can offset thesis risk',
  },
};

export function ThesisRelatedMarkets({
  thesisId,
  symbol,
  hypothesis,
}: ThesisRelatedMarketsProps) {
  const [linkedMarkets, setLinkedMarkets] = useState<LinkedMarket[]>([]);
  const [suggestedMarkets, setSuggestedMarkets] = useState<PredictionMarket[]>([]);
  const [isLoadingLinked, setIsLoadingLinked] = useState(true);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const [linkerOpen, setLinkerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked markets from Supabase
  const fetchLinkedMarkets = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setIsLoadingLinked(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('thesis_prediction_market_links')
        .select('*')
        .eq('thesis_id', thesisId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform snake_case to camelCase
      const transformed: LinkedMarket[] = (data || []).map((row) => ({
        id: row.id,
        thesisId: row.thesis_id,
        platform: row.platform as Platform,
        externalMarketId: row.external_market_id,
        marketTitle: row.market_title,
        relationship: row.relationship as ThesisMarketLink['relationship'],
        aiAnalysis: row.ai_analysis,
        confidenceScore: row.confidence_score,
        userNotes: row.user_notes,
        priceAtLink: row.price_at_link,
        createdAt: row.created_at,
      }));

      setLinkedMarkets(transformed);
    } catch (err) {
      console.error('Failed to fetch linked markets:', err);
      setError('Failed to load linked markets');
    } finally {
      setIsLoadingLinked(false);
    }
  }, [thesisId]);

  // Fetch AI-suggested markets based on thesis
  const fetchSuggestedMarkets = useCallback(async () => {
    if (!hypothesis) return;

    setIsLoadingSuggested(true);
    try {
      // Build search terms from hypothesis and symbol
      const searchTerms: string[] = [];
      if (symbol) searchTerms.push(symbol);

      // Extract key terms from hypothesis
      const keywords = hypothesis.toLowerCase();
      if (keywords.includes('fed') || keywords.includes('rate') || keywords.includes('interest')) {
        searchTerms.push('fed rate');
      }
      if (keywords.includes('earnings') || keywords.includes('revenue')) {
        searchTerms.push('earnings');
      }
      if (keywords.includes('bitcoin') || keywords.includes('btc') || keywords.includes('crypto')) {
        searchTerms.push('bitcoin');
      }
      if (keywords.includes('recession') || keywords.includes('gdp')) {
        searchTerms.push('recession');
      }
      if (keywords.includes('tariff') || keywords.includes('trade')) {
        searchTerms.push('tariffs');
      }
      if (keywords.includes('inflation') || keywords.includes('cpi')) {
        searchTerms.push('inflation');
      }

      // If no specific terms, use first few words of hypothesis
      if (searchTerms.length === 0) {
        searchTerms.push(hypothesis.split(' ').slice(0, 3).join(' '));
      }

      // Search for markets
      const allMarkets: PredictionMarket[] = [];
      for (const term of searchTerms.slice(0, 2)) {
        try {
          const { markets } = await apiSearchMarkets(term);
          allMarkets.push(...markets);
        } catch {
          // Continue with other terms
        }
      }

      // Deduplicate and filter out already linked markets
      const linkedIds = new Set(linkedMarkets.map((m) => `${m.platform}-${m.externalMarketId}`));
      const uniqueMarkets = Array.from(
        new Map(allMarkets.map((m) => [`${m.platform}-${m.id}`, m])).values()
      ).filter((m) => !linkedIds.has(`${m.platform}-${m.id}`));

      setSuggestedMarkets(uniqueMarkets.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch suggested markets:', err);
    } finally {
      setIsLoadingSuggested(false);
    }
  }, [hypothesis, symbol, linkedMarkets]);

  // Initial load
  useEffect(() => {
    fetchLinkedMarkets();
  }, [fetchLinkedMarkets]);

  // Fetch suggestions after linked markets are loaded
  useEffect(() => {
    if (!isLoadingLinked) {
      fetchSuggestedMarkets();
    }
  }, [isLoadingLinked, fetchSuggestedMarkets]);

  // Handle unlinking a market
  const handleUnlink = async (linkId: string) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('thesis_prediction_market_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      setLinkedMarkets((prev) => prev.filter((m) => m.id !== linkId));
    } catch (err) {
      console.error('Failed to unlink market:', err);
    }
  };

  // Handle successful link from modal
  const handleMarketLinked = () => {
    fetchLinkedMarkets();
    setLinkerOpen(false);
  };

  // Format probability for display
  const formatProbability = (price: number) => `${(price * 100).toFixed(0)}%`;

  if (isLoadingLinked) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpDown className="h-4 w-4" />
          <h3 className="font-semibold">Related Prediction Markets</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <h3 className="font-semibold">Related Prediction Markets</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLinkerOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" />
            Link Market
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Linked Markets */}
        {linkedMarkets.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Linked Markets
            </h4>
            {linkedMarkets.map((market) => {
              const config = RELATIONSHIP_CONFIG[market.relationship];
              const RelIcon = config.icon;
              return (
                <div
                  key={market.id}
                  className="p-3 bg-muted/30 rounded-lg border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn('text-xs', config.color)}
                        >
                          <RelIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {market.platform}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{market.marketTitle}</p>
                      {market.userNotes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {market.userNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {market.priceAtLink !== undefined && market.priceAtLink !== null && (
                        <div className="text-sm font-medium">
                          {formatProbability(market.priceAtLink)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleUnlink(market.id)}
                        >
                          Unlink
                        </Button>
                        <a
                          href={`https://${market.platform}.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Suggested Markets */}
        {(isLoadingSuggested || suggestedMarkets.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Suggested
              </h4>
              {!isLoadingSuggested && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={fetchSuggestedMarkets}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              )}
            </div>

            {isLoadingSuggested ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : suggestedMarkets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No related markets found for this thesis.
              </p>
            ) : (
              suggestedMarkets.map((market) => (
                <div
                  key={`${market.platform}-${market.id}`}
                  className="p-3 bg-muted/20 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => setLinkerOpen(true)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {market.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {market.category}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{market.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'text-sm font-bold',
                          market.yesPrice >= 0.5 ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {formatProbability(market.yesPrice)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {linkedMarkets.length === 0 && suggestedMarkets.length === 0 && !isLoadingSuggested && (
          <div className="text-center py-8">
            <ArrowUpDown className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">
              No prediction markets linked to this thesis yet.
            </p>
            <Button variant="outline" size="sm" onClick={() => setLinkerOpen(true)}>
              <Link2 className="h-4 w-4 mr-1" />
              Link Your First Market
            </Button>
          </div>
        )}
      </Card>

      <ThesisMarketLinker
        open={linkerOpen}
        onOpenChange={setLinkerOpen}
        thesisId={thesisId}
        hypothesis={hypothesis}
        symbol={symbol}
        onMarketLinked={handleMarketLinked}
      />
    </>
  );
}
