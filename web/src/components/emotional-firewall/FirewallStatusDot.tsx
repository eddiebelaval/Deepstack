'use client';

import { useEmotionalFirewall } from '@/hooks/useEmotionalFirewall';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FirewallStatusDotProps {
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Subtle LED-style dot indicator for emotional firewall status.
 * Designed to be "hidden in plain sight" - minimal but informative.
 */
export function FirewallStatusDot({
  className,
  size = 'sm',
  showLabel = false,
}: FirewallStatusDotProps) {
  const { isBlocked, isWarning, isSafe, loading, patterns } = useEmotionalFirewall();
  const [isHovered, setIsHovered] = useState(false);

  if (loading) return null;

  // Status colors and labels
  const getStatusConfig = () => {
    if (isBlocked) {
      return {
        dotColor: 'bg-red-500',
        glowColor: 'shadow-[0_0_8px_rgba(239,68,68,0.6),0_0_16px_rgba(239,68,68,0.3)]',
        pulseColor: 'bg-red-400',
        label: 'Blocked',
        description: 'Trading blocked - emotional pattern detected',
      };
    }
    if (isWarning) {
      return {
        dotColor: 'bg-yellow-500',
        glowColor: 'shadow-[0_0_8px_rgba(234,179,8,0.6),0_0_16px_rgba(234,179,8,0.3)]',
        pulseColor: 'bg-yellow-400',
        label: 'Caution',
        description: 'Caution advised - approaching limits',
      };
    }
    return {
      dotColor: 'bg-green-500',
      glowColor: 'shadow-[0_0_6px_rgba(34,197,94,0.5),0_0_12px_rgba(34,197,94,0.25)]',
      pulseColor: 'bg-green-400',
      label: 'Protected',
      description: 'Clear to trade',
    };
  };

  const config = getStatusConfig();
  const sizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const pulseSizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  const DotElement = (
    <div
      className={cn('flex items-center gap-1.5 cursor-pointer', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LED Dot with glow */}
      <div className="relative">
        {/* Pulse animation ring - only when warning or blocked */}
        {(isBlocked || isWarning) && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              config.pulseColor,
              pulseSizeClasses
            )}
          />
        )}
        {/* Core dot */}
        <span
          className={cn(
            'relative block rounded-full transition-shadow duration-300',
            config.dotColor,
            config.glowColor,
            sizeClasses
          )}
        />
      </div>

      {/* Optional label - shows keyword */}
      {showLabel && (
        <span
          className={cn(
            'text-[10px] font-medium tracking-wide uppercase opacity-60 transition-opacity',
            isHovered && 'opacity-100'
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{DotElement}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">{config.description}</p>
          {patterns.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {patterns.length} pattern{patterns.length > 1 ? 's' : ''} detected
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to get firewall status for applying glow effects to other elements.
 * Returns CSS class names for glow effects.
 */
export function useFirewallGlow() {
  const { isBlocked, isWarning, isSafe, loading } = useEmotionalFirewall();

  if (loading) {
    return {
      glowClass: '',
      borderClass: '',
      status: 'loading' as const,
    };
  }

  if (isBlocked) {
    return {
      glowClass: 'firewall-glow-blocked',
      borderClass: 'border-red-500/30',
      status: 'blocked' as const,
    };
  }

  if (isWarning) {
    return {
      glowClass: 'firewall-glow-warning',
      borderClass: 'border-yellow-500/30',
      status: 'warning' as const,
    };
  }

  return {
    glowClass: 'firewall-glow-safe',
    borderClass: 'border-green-500/20',
    status: 'safe' as const,
  };
}
