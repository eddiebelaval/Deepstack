'use client';

import { useRealtimeStatus } from '@/hooks/useRealtimePositions';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatusIndicator({
  className,
  showLabel = false,
}: ConnectionStatusIndicatorProps) {
  const status = useRealtimeStatus();

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-profit',
      bgColor: 'bg-profit/20',
      label: 'Connected',
      description: 'Real-time updates active',
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      label: 'Connecting',
      description: 'Establishing connection...',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      label: 'Disconnected',
      description: 'Real-time updates paused',
    },
    error: {
      icon: AlertCircle,
      color: 'text-loss',
      bgColor: 'bg-loss/20',
      label: 'Error',
      description: 'Connection error - retrying',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full',
              config.bgColor,
              className
            )}
          >
            <Icon
              className={cn(
                'h-3 w-3',
                config.color,
                status === 'connecting' && 'animate-spin'
              )}
            />
            {showLabel && (
              <span className={cn('text-xs font-medium', config.color)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Minimal dot indicator for tight spaces
 */
export function ConnectionDot({ className }: { className?: string }) {
  const status = useRealtimeStatus();

  const dotColors = {
    connected: 'bg-profit',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-muted-foreground',
    error: 'bg-loss animate-pulse',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              dotColors[status],
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {status === 'connected' && 'Real-time connected'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'disconnected' && 'Disconnected'}
            {status === 'error' && 'Connection error'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
