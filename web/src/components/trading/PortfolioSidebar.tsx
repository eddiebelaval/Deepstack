"use client"

import { useEffect, useState, useRef } from 'react';
import { api, type AccountSummary } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Separator } from '@/components/ui/separator';
import { PositionsList } from './PositionsList';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PortfolioSidebar() {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.account();
      setAccount(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAccount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !account) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-destructive">{error}</div>
        <Button onClick={fetchAccount} variant="outline" size="sm" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Portfolio</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchAccount}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full p-4" viewportRef={scrollRef} hideScrollbar>
          <div className="space-y-4">
            {/* Account Summary */}
            {account && (
              <Card className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Portfolio Value</div>
                  <div className="text-2xl font-bold">
                    ${account.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Cash</div>
                    <div className="text-sm font-medium">
                      ${account.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Buying Power</div>
                    <div className="text-sm font-medium">
                      ${account.buying_power.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-xs text-muted-foreground">Day P&L</div>
                  <div className={`text-lg font-bold ${account.day_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {account.day_pnl >= 0 ? '+' : ''}${account.day_pnl.toFixed(2)}
                  </div>
                </div>
              </Card>
            )}

            {/* Positions */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Positions</h3>
              <PositionsList />
            </div>
          </div>
        </ScrollArea>
        <DotScrollIndicator
          scrollRef={scrollRef}
          maxDots={5}
          className="absolute right-1 top-1/2 -translate-y-1/2"
          minHeightGrowth={0}
        />
      </div>
    </div>
  );
}
