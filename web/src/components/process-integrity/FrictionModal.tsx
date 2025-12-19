'use client';

/**
 * FrictionModal Component
 *
 * Displays when process integrity friction is triggered before a trade.
 * Shows the friction level, reason, and allows override with confirmation.
 */

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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FrictionData {
  level: 'soft' | 'medium' | 'hard';
  dimension: string;
  message: string;
  suggestedAction: string;
  overrideWarning?: string;
}

export interface IntegrityScores {
  researchQuality: number;
  timeInThesisHours: number;
  conviction: number;
}

interface FrictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friction: FrictionData;
  scores: IntegrityScores;
  symbol: string;
  thesisId?: string;
  onOverride: (reasoning?: string) => void;
  onCancel: () => void;
  onDoTheWork: () => void;
}

const frictionConfig = {
  soft: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Consider',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Pause',
  },
  hard: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Stop',
  },
};

const dimensionLabels: Record<string, string> = {
  research_quality: 'Research Quality',
  time_in_thesis: 'Time in Thesis',
  conviction_integrity: 'Conviction Integrity',
  combined: 'Multiple Factors',
};

function ScoreGauge({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', color)}>{typeof value === 'number' ? (max === 100 ? `${value}%` : `${value.toFixed(1)}h`) : value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color.replace('text-', 'bg-'))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function FrictionModal({
  open,
  onOpenChange,
  friction,
  scores,
  symbol,
  onOverride,
  onCancel,
  onDoTheWork,
}: FrictionModalProps) {
  const [reasoning, setReasoning] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const config = frictionConfig[friction.level];
  const Icon = config.icon;

  const handleOverride = () => {
    if (friction.level === 'hard' && reasoning.length < 10) {
      return;
    }
    onOverride(reasoning || undefined);
    setReasoning('');
    setShowOverrideForm(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTimeColor = (hours: number) => {
    if (hours >= 24) return 'text-green-500';
    if (hours >= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-lg border-2', config.borderColor)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {config.label}: {symbol}
                <Badge variant="outline" className={config.color}>
                  {friction.level.toUpperCase()}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                {dimensionLabels[friction.dimension] || friction.dimension}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Main Message */}
          <p className="text-sm">{friction.message}</p>

          {/* Suggested Action */}
          <div className={cn('p-3 rounded-lg', config.bgColor)}>
            <p className="text-sm font-medium">Suggested Action:</p>
            <p className="text-sm text-muted-foreground mt-1">{friction.suggestedAction}</p>
          </div>

          {/* Process Integrity Scores */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your Process Metrics
            </p>
            <ScoreGauge
              label="Research Quality"
              value={scores.researchQuality}
              color={getScoreColor(scores.researchQuality)}
            />
            <ScoreGauge
              label="Time in Thesis"
              value={scores.timeInThesisHours}
              max={24}
              color={getTimeColor(scores.timeInThesisHours)}
            />
            <ScoreGauge
              label="Conviction"
              value={scores.conviction}
              color={getScoreColor(scores.conviction)}
            />
          </div>

          {/* Override Form (shown when user wants to proceed anyway) */}
          {showOverrideForm && (
            <div className="space-y-3 pt-2 border-t">
              {friction.overrideWarning && (
                <p className="text-sm text-destructive">{friction.overrideWarning}</p>
              )}

              {friction.level === 'hard' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Why do you want to proceed? (required)
                  </label>
                  <Textarea
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Explain your reasoning..."
                    className="min-h-[80px]"
                  />
                  {reasoning.length < 10 && reasoning.length > 0 && (
                    <p className="text-xs text-destructive">
                      Please provide at least 10 characters
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideForm(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleOverride}
                  disabled={friction.level === 'hard' && reasoning.length < 10}
                  className="flex-1"
                >
                  Confirm Override
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showOverrideForm && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onCancel} className="sm:flex-1">
              Cancel Trade
            </Button>
            <Button
              variant="default"
              onClick={onDoTheWork}
              className="sm:flex-1 gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Let&apos;s Do the Work
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowOverrideForm(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Override Anyway
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
