'use client';

import { useEmotionalFirewall } from '@/hooks/useEmotionalFirewall';
import { cn } from '@/lib/utils';
import {
  Brain,
  BrainCog,
  Coffee,
  Clock,
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

/**
 * Decision Fitness Banner - Shows cognitive state for quality decisions
 * Applies to all markets: stocks, crypto, prediction markets, etc.
 */
export function EmotionalFirewallBanner({
  className,
  compact = false,
}: EmotionalFirewallBannerProps) {
  const {
    status,
    loading,
    isCompromised,
    isCaution,
    isFocused,
    breakRemaining,
    patterns,
    session,
  } = useEmotionalFirewall();

  const [dismissed, setDismissed] = useState(false);
  const [breakDisplay, setBreakDisplay] = useState<string>('');

  // Update break timer display every second
  useEffect(() => {
    if (!breakRemaining) {
      setBreakDisplay('');
      return;
    }

    const updateDisplay = () => {
      const remaining = status?.break_recommended_until
        ? Math.max(0, new Date(status.break_recommended_until).getTime() - Date.now())
        : 0;

      if (remaining <= 0) {
        setBreakDisplay('');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (minutes > 0) {
        setBreakDisplay(`${minutes}m ${seconds}s`);
      } else {
        setBreakDisplay(`${seconds}s`);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [breakRemaining, status?.break_recommended_until]);

  // Don't show if dismissed and focused
  if (dismissed && isFocused) return null;

  // Don't show while loading
  if (loading) return null;

  // Don't show if focused and compact mode
  if (isFocused && compact) return null;

  const getStatusIcon = () => {
    if (isCompromised) return <Coffee className="h-4 w-4" />;
    if (isCaution) return <BrainCog className="h-4 w-4" />;
    return <Brain className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (isCompromised) return 'bg-red-500/10 border-red-500/50 text-red-400';
    if (isCaution) return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
    return 'bg-green-500/10 border-green-500/50 text-green-400';
  };

  const getStatusText = () => {
    if (isCompromised) return 'Break Recommended';
    if (isCaution) return 'Stay Mindful';
    return 'Focused';
  };

  const getPatternBadges = () => {
    const patternLabels: Record<string, string> = {
      late_night: 'Late Night',
      session_fatigue: 'Session Fatigue',
      extended_session: 'Extended Session',
      rapid_queries: 'Rushing',
      session_overload: 'High Activity',
    };

    return patterns.map((pattern) => (
      <span
        key={pattern}
        className="px-2 py-0.5 text-xs rounded-full bg-white/10"
      >
        {patternLabels[pattern] || pattern.replace(/_/g, ' ')}
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

        {/* Break Timer */}
        {breakDisplay && (
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>{breakDisplay}</span>
          </div>
        )}

        {/* Pattern Badges */}
        {patterns.length > 0 && (
          <div className="flex items-center gap-1">{getPatternBadges()}</div>
        )}

        {/* Session Stats */}
        {session && !compact && (
          <div className="flex items-center gap-3 ml-auto text-xs opacity-75">
            {session.duration_minutes > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{session.duration_minutes}m</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Session duration</p>
                </TooltipContent>
              </Tooltip>
            )}

            {session.queries_this_session > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>{session.queries_this_session} queries</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Queries this session</p>
                </TooltipContent>
              </Tooltip>
            )}

            {session.sessions_today > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <span>{session.sessions_today} sessions today</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Research sessions today</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Dismiss button (only for focused/caution) */}
        {!isCompromised && !compact && (
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
  const { isCompromised, isCaution, loading } = useEmotionalFirewall();

  if (loading) return null;

  const getColor = () => {
    if (isCompromised) return 'text-red-500';
    if (isCaution) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getIcon = () => {
    if (isCompromised) return <Coffee className="h-4 w-4" />;
    if (isCaution) return <BrainCog className="h-4 w-4" />;
    return <Brain className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('cursor-pointer', getColor())}>{getIcon()}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isCompromised
              ? 'Break recommended - protect your decision quality'
              : isCaution
                ? 'Stay mindful - early signs of fatigue'
                : 'Focused - clear state for analysis'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
