'use client';

import { useEmotionalFirewall } from '@/hooks/useEmotionalFirewall';
import { cn } from '@/lib/utils';
import {
  Shield,
  ShieldAlert,
  ShieldOff,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmotionalFirewallBannerProps {
  className?: string;
  compact?: boolean;
}

export function EmotionalFirewallBanner({
  className,
  compact = false,
}: EmotionalFirewallBannerProps) {
  const {
    status,
    loading,
    isBlocked,
    isWarning,
    isSafe,
    cooldownRemaining,
    patterns,
    stats,
  } = useEmotionalFirewall();

  const [dismissed, setDismissed] = useState(false);
  const [cooldownDisplay, setCooldownDisplay] = useState<string>('');

  // Update cooldown display every second
  useEffect(() => {
    if (!cooldownRemaining) {
      setCooldownDisplay('');
      return;
    }

    const updateDisplay = () => {
      const remaining = status?.cooldown_expires
        ? Math.max(0, new Date(status.cooldown_expires).getTime() - Date.now())
        : 0;

      if (remaining <= 0) {
        setCooldownDisplay('');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (minutes > 0) {
        setCooldownDisplay(`${minutes}m ${seconds}s`);
      } else {
        setCooldownDisplay(`${seconds}s`);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining, status?.cooldown_expires]);

  // Don't show if dismissed and safe
  if (dismissed && isSafe) return null;

  // Don't show while loading
  if (loading) return null;

  // Don't show if safe and compact mode
  if (isSafe && compact) return null;

  const getStatusIcon = () => {
    if (isBlocked) return <ShieldOff className="h-4 w-4" />;
    if (isWarning) return <ShieldAlert className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (isBlocked) return 'bg-red-500/10 border-red-500/50 text-red-400';
    if (isWarning) return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
    return 'bg-green-500/10 border-green-500/50 text-green-400';
  };

  const getStatusText = () => {
    if (isBlocked) return 'Trading Blocked';
    if (isWarning) return 'Caution Advised';
    return 'Clear to Trade';
  };

  const getStreakIcon = () => {
    if (!stats?.streak_type) return null;
    if (stats.streak_type === 'win') {
      return <TrendingUp className="h-3 w-3 text-green-400" />;
    }
    return <TrendingDown className="h-3 w-3 text-red-400" />;
  };

  const getPatternBadges = () => {
    const patternLabels: Record<string, string> = {
      revenge_trading: 'Revenge Trading',
      overtrading: 'Overtrading',
      win_streak: 'Win Streak',
      loss_streak: 'Loss Streak',
      late_night_trading: 'Late Night',
      weekend_trading: 'Weekend',
      size_increase_after_loss: 'Size Increase',
      panic_mode: 'Panic Mode',
    };

    return patterns.map((pattern) => (
      <span
        key={pattern}
        className="px-2 py-0.5 text-xs rounded-full bg-white/10"
      >
        {patternLabels[pattern] || pattern}
      </span>
    ));
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 border rounded-lg transition-all',
          getStatusColor(),
          className
        )}
      >
        {/* Status Icon */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{getStatusText()}</span>
        </div>

        {/* Cooldown Timer */}
        {cooldownDisplay && (
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>{cooldownDisplay}</span>
          </div>
        )}

        {/* Pattern Badges */}
        {patterns.length > 0 && (
          <div className="flex items-center gap-1">{getPatternBadges()}</div>
        )}

        {/* Stats */}
        {stats && !compact && (
          <div className="flex items-center gap-3 ml-auto text-xs opacity-75">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>
                    {stats.trades_this_hour}/{3} hr
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trades this hour (limit: 3)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>
                    {stats.trades_today}/{10} day
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trades today (limit: 10)</p>
              </TooltipContent>
            </Tooltip>

            {stats.current_streak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    {getStreakIcon()}
                    <span>{stats.current_streak} streak</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {stats.current_streak} consecutive{' '}
                    {stats.streak_type === 'win' ? 'wins' : 'losses'}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Dismiss button (only for safe/warning) */}
        {!isBlocked && !compact && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-2 opacity-50 hover:opacity-100"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact version for embedding in other components
export function EmotionalFirewallIndicator() {
  const { isBlocked, isWarning, loading } = useEmotionalFirewall();

  if (loading) return null;

  const getColor = () => {
    if (isBlocked) return 'text-red-500';
    if (isWarning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getIcon = () => {
    if (isBlocked) return <ShieldOff className="h-4 w-4" />;
    if (isWarning) return <ShieldAlert className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('cursor-pointer', getColor())}>{getIcon()}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isBlocked
              ? 'Trading blocked - emotional pattern detected'
              : isWarning
                ? 'Caution advised - approaching limits'
                : 'Clear to trade'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
