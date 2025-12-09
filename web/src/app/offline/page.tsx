'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-2xl bg-muted p-4">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            You're Offline
          </h1>
          <p className="text-muted-foreground">
            DeepStack requires an internet connection for real-time market data and trading.
          </p>
        </div>

        {/* Explanation */}
        <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground text-left space-y-2">
          <p className="font-medium text-foreground">While offline, you can't:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>View live market data</li>
            <li>Execute trades</li>
            <li>Chat with the AI assistant</li>
          </ul>
          <p className="mt-3 font-medium text-foreground">Your data is safe:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Watchlists sync when back online</li>
            <li>Journal entries are preserved locally</li>
          </ul>
        </div>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          className="w-full"
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>

        {/* Status indicator */}
        <p className="text-xs text-muted-foreground">
          Connection will automatically restore when available
        </p>
      </div>
    </div>
  );
}
