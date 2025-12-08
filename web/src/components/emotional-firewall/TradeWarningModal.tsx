'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ShieldOff, Clock, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FirewallCheckResult } from '@/hooks/useEmotionalFirewall';

interface TradeWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firewallResult: FirewallCheckResult | null;
  tradeDetails: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price?: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function TradeWarningModal({
  open,
  onOpenChange,
  firewallResult,
  tradeDetails,
  onConfirm,
  onCancel,
}: TradeWarningModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [cooldownWaived, setCooldownWaived] = useState(false);

  const isBlocked = firewallResult?.blocked ?? false;
  const patterns = firewallResult?.patterns_detected ?? [];

  const getPatternAdvice = (pattern: string): string => {
    const advice: Record<string, string> = {
      revenge_trading:
        'You recently had a losing trade. Take a break to avoid emotional decisions.',
      overtrading:
        "You've been trading frequently. More trades don't mean more profits.",
      win_streak:
        "You're on a winning streak. Overconfidence can lead to larger losses.",
      loss_streak:
        "You've had several losses in a row. Step back and reassess your strategy.",
      late_night_trading:
        'Late-night trading often leads to poor decisions due to fatigue.',
      weekend_trading:
        'Markets are closed. Any trades will execute at market open with potential gaps.',
      size_increase_after_loss:
        "Increasing position size after a loss is a common mistake. Don't chase losses.",
      panic_mode:
        "You're making rapid changes. Take a breath and stick to your plan.",
    };
    return advice[pattern] || 'Please review this pattern before proceeding.';
  };

  const handleConfirm = () => {
    if (isBlocked && !cooldownWaived) {
      return; // Can't proceed without waiving cooldown
    }
    setAcknowledged(false);
    setCooldownWaived(false);
    onConfirm();
  };

  const handleCancel = () => {
    setAcknowledged(false);
    setCooldownWaived(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle
            className={cn(
              'flex items-center gap-2',
              isBlocked ? 'text-red-500' : 'text-yellow-500'
            )}
          >
            {isBlocked ? (
              <>
                <ShieldOff className="h-5 w-5" />
                Trade Blocked
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                Trading Caution
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? 'This trade has been blocked by the Emotional Firewall.'
              : 'The Emotional Firewall has detected patterns that warrant caution.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trade Details */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-1">Proposed Trade</div>
            <div className="text-lg font-mono">
              {tradeDetails.action.toUpperCase()} {tradeDetails.quantity}{' '}
              {tradeDetails.symbol}
              {tradeDetails.price && (
                <span className="text-muted-foreground ml-2">
                  @ ${tradeDetails.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Patterns Detected */}
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Patterns Detected
            </div>
            {patterns.map((pattern) => (
              <div
                key={pattern}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                <div className="font-medium text-red-400 capitalize mb-1">
                  {pattern.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getPatternAdvice(pattern)}
                </div>
              </div>
            ))}
          </div>

          {/* Cooldown Info */}
          {firewallResult?.cooldown_expires && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Clock className="h-4 w-4" />
              <span>
                Cooldown until:{' '}
                {new Date(firewallResult.cooldown_expires).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Acknowledgment Checkboxes */}
          <div className="space-y-3 pt-2">
            {!isBlocked && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) =>
                    setAcknowledged(checked as boolean)
                  }
                />
                <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
                  I understand the risks and want to proceed with this trade
                  anyway.
                </Label>
              </div>
            )}

            {isBlocked && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="waive-cooldown"
                  checked={cooldownWaived}
                  onCheckedChange={(checked) =>
                    setCooldownWaived(checked as boolean)
                  }
                />
                <Label
                  htmlFor="waive-cooldown"
                  className="text-sm leading-relaxed text-red-400"
                >
                  I want to override the cooldown and proceed (not recommended).
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel Trade
          </Button>
          <Button
            variant={isBlocked ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isBlocked ? !cooldownWaived : !acknowledged}
          >
            {isBlocked ? 'Override & Proceed' : 'Proceed Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified hook for using the modal
export function useTradeWarningModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price?: number;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const [firewallResult, setFirewallResult] =
    useState<FirewallCheckResult | null>(null);

  const showWarning = (
    trade: {
      symbol: string;
      action: 'buy' | 'sell';
      quantity: number;
      price?: number;
    },
    result: FirewallCheckResult,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    setPendingTrade({ ...trade, onConfirm, onCancel });
    setFirewallResult(result);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    pendingTrade?.onConfirm();
    setIsOpen(false);
    setPendingTrade(null);
    setFirewallResult(null);
  };

  const handleCancel = () => {
    pendingTrade?.onCancel();
    setIsOpen(false);
    setPendingTrade(null);
    setFirewallResult(null);
  };

  return {
    isOpen,
    setIsOpen,
    pendingTrade,
    firewallResult,
    showWarning,
    handleConfirm,
    handleCancel,
  };
}
