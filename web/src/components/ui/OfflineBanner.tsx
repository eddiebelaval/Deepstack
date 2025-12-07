'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  className?: string;
}

/**
 * Banner that shows when user is offline
 * Also shows a "reconnected" message briefly after coming back online
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOffline, wasOffline, clearWasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show reconnected message when coming back online
  useEffect(() => {
    if (!isOffline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, clearWasOffline]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center transition-colors',
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-green-600 text-white',
        className
      )}
    >
      {isOffline ? (
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline. Some features may not work.</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>You&apos;re back online!</span>
        </div>
      )}
    </div>
  );
}

/**
 * Session expired banner
 */
interface SessionExpiredBannerProps {
  onRefresh: () => void;
  onSignOut: () => void;
  className?: string;
}

export function SessionExpiredBanner({
  onRefresh,
  onSignOut,
  className,
}: SessionExpiredBannerProps) {
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-yellow-600 text-white text-sm font-medium text-center',
        className
      )}
    >
      <div className="flex items-center justify-center gap-4">
        <span>Your session has expired.</span>
        <button
          onClick={onRefresh}
          className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
        >
          Refresh Session
        </button>
        <button
          onClick={onSignOut}
          className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

/**
 * Rate limit banner
 */
interface RateLimitBannerProps {
  waitTime: number; // in ms
  className?: string;
}

export function RateLimitBanner({ waitTime, className }: RateLimitBannerProps) {
  const [remaining, setRemaining] = useState(waitTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (remaining <= 0) {
    return null;
  }

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-orange-600 text-white text-sm font-medium text-center',
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <span>Too many requests. Please wait {seconds} seconds...</span>
      </div>
    </div>
  );
}
