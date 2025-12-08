'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { searchMarkets as apiSearchMarkets } from '@/lib/api/prediction-markets';
import type { PredictionMarket, ThesisMarketLink } from '@/lib/types/prediction-markets';
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  Repeat,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThesisMarketLinkerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thesisId: string;
  hypothesis?: string; // Available for future AI-suggested search terms
  symbol?: string;
  onMarketLinked?: () => void;
}

type RelationshipType = ThesisMarketLink['relationship'];

const RELATIONSHIP_OPTIONS: {
  value: RelationshipType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: 'supports',
    label: 'Supports',
    icon: TrendingUp,
    description: 'Market outcome aligns with your thesis',
  },
  {
    value: 'contradicts',
    label: 'Contradicts',
    icon: TrendingDown,
    description: 'Market outcome would invalidate your thesis',
  },
  {
    value: 'correlates',
    label: 'Correlates',
    icon: Repeat,
    description: 'Market moves in tandem with thesis conditions',
  },
  {
    value: 'hedges',
    label: 'Hedges',
    icon: Shield,
    description: 'Market can offset risk if thesis fails',
  },
];

export function ThesisMarketLinker({
  open,
  onOpenChange,
  thesisId,
  // hypothesis prop available for future AI-enhanced search
  symbol,
  onMarketLinked,
}: ThesisMarketLinkerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PredictionMarket[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [relationship, setRelationship] = useState<RelationshipType>('supports');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Search handler (defined before useEffect that references it)
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);
      setHasSearched(true);

      try {
        const { markets } = await apiSearchMarkets(query);
        setSearchResults(markets);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to search markets. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery(symbol || '');
      setSearchResults([]);
      setSelectedMarket(null);
      setRelationship('supports');
      setNotes('');
      setError(null);
      setHasSearched(false);

      // Auto-search if symbol is provided
      if (symbol) {
        performSearch(symbol);
      }
    }
  }, [open, symbol, performSearch]);

  // Search with current query
  const handleSearch = useCallback(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMarket) {
      setError('Please select a market to link');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Database connection unavailable');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('thesis_prediction_market_links')
        .insert({
          thesis_id: thesisId,
          platform: selectedMarket.platform,
          external_market_id: selectedMarket.id,
          market_title: selectedMarket.title,
          relationship: relationship,
          user_notes: notes || null,
          price_at_link: selectedMarket.yesPrice,
        });

      if (insertError) {
        // Check for unique constraint violation
        if (insertError.code === '23505') {
          setError('This market is already linked to this thesis');
          return;
        }
        throw insertError;
      }

      // Success - notify parent and close
      onMarketLinked?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to link market:', err);
      setError('Failed to link market. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Format probability for display
  const formatProbability = (price: number) => `${(price * 100).toFixed(0)}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Prediction Market</DialogTitle>
          <DialogDescription>
            Connect a prediction market to validate or track your thesis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Markets</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by keyword, symbol, or topic..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            <Label>
              {selectedMarket ? 'Selected Market' : 'Search Results'}
            </Label>

            {isSearching ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : selectedMarket ? (
              <div className="p-4 bg-primary/5 border-2 border-primary rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {selectedMarket.platform}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedMarket.category}
                      </span>
                    </div>
                    <p className="font-medium">{selectedMarket.title}</p>
                    {selectedMarket.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {selectedMarket.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={cn(
                        'text-lg font-bold',
                        selectedMarket.yesPrice >= 0.5
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}
                    >
                      {formatProbability(selectedMarket.yesPrice)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMarket(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchResults.map((market) => (
                  <div
                    key={`${market.platform}-${market.id}`}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-colors',
                      'hover:bg-muted/50 border border-transparent hover:border-border'
                    )}
                    onClick={() => setSelectedMarket(market)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {market.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {market.category}
                          </span>
                        </div>
                        <p className="font-medium text-sm truncate">
                          {market.title}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'text-sm font-bold flex-shrink-0',
                          market.yesPrice >= 0.5 ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {formatProbability(market.yesPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No markets found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs mt-1">Try different keywords or topics</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Search for prediction markets above</p>
              </div>
            )}
          </div>

          {/* Relationship Selection */}
          {selectedMarket && (
            <div className="space-y-3">
              <Label>How does this market relate to your thesis?</Label>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIP_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = relationship === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRelationship(option.value)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <span className="font-medium text-sm">{option.label}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedMarket && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why are you linking this market? How does it validate or challenge your thesis?"
                rows={3}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMarket || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              'Link Market'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
