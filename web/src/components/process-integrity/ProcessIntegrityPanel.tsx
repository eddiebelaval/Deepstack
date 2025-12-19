'use client';

/**
 * ProcessIntegrityPanel Component
 *
 * Displays the three process integrity dimensions:
 * - Research Quality (0-100)
 * - Time in Thesis (hours with maturity level)
 * - Conviction Score (0-100 with trend)
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessIntegrityData {
  researchQuality: {
    score: number;
    breakdown?: {
      toolUsage: number;
      devilsAdvocate: number;
      assumptions: number;
      timeSpent: number;
    };
    recommendations?: string[];
  };
  timeInThesis: {
    hoursInDevelopment: number;
    maturityLevel: 'nascent' | 'developing' | 'mature';
    evolutionEventCount: number;
    isRushed: boolean;
  };
  conviction: {
    score: number;
    trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
    swing: number;
  };
}

interface ProcessIntegrityPanelProps {
  data: ProcessIntegrityData;
  symbol: string;
  className?: string;
  compact?: boolean;
}

const maturityConfig = {
  nascent: { label: 'Nascent', color: 'text-red-500', bgColor: 'bg-red-500' },
  developing: { label: 'Developing', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  mature: { label: 'Mature', color: 'text-green-500', bgColor: 'bg-green-500' },
};

const trendConfig = {
  stable: { icon: Minus, label: 'Stable', color: 'text-muted-foreground' },
  increasing: { icon: TrendingUp, label: 'Rising', color: 'text-green-500' },
  decreasing: { icon: TrendingDown, label: 'Falling', color: 'text-yellow-500' },
  volatile: { icon: AlertTriangle, label: 'Volatile', color: 'text-red-500' },
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreIcon(score: number) {
  if (score >= 70) return CheckCircle;
  if (score >= 40) return AlertTriangle;
  return XCircle;
}

function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function CircularGauge({ value, max = 100, size = 80, label, sublabel, color }: {
  value: number;
  max?: number;
  size?: number;
  label: string;
  sublabel?: string;
  color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-500', color)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold', color)}>
            {max === 100 ? value : formatHours(value)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1">{label}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

export function ProcessIntegrityPanel({
  data,
  symbol,
  className,
  compact = false,
}: ProcessIntegrityPanelProps) {
  const overallStatus = useMemo(() => {
    const scores = [
      data.researchQuality.score,
      data.timeInThesis.maturityLevel === 'mature' ? 100 : data.timeInThesis.maturityLevel === 'developing' ? 50 : 20,
      data.conviction.trend === 'volatile' ? 30 : data.conviction.score,
    ];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avg >= 70) return { label: 'Strong', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (avg >= 40) return { label: 'Developing', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    return { label: 'Needs Work', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  }, [data]);

  const TrendIcon = trendConfig[data.conviction.trend].icon;
  const maturity = maturityConfig[data.timeInThesis.maturityLevel];

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 p-3 rounded-lg border', className)}>
        <div className="flex items-center gap-2">
          <BookOpen className={cn('h-4 w-4', getScoreColor(data.researchQuality.score))} />
          <span className="text-sm font-medium">{data.researchQuality.score}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={cn('h-4 w-4', maturity.color)} />
          <span className="text-sm font-medium">{formatHours(data.timeInThesis.hoursInDevelopment)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className={cn('h-4 w-4', getScoreColor(data.conviction.score))} />
          <span className="text-sm font-medium">{data.conviction.score}%</span>
          <TrendIcon className={cn('h-3 w-3', trendConfig[data.conviction.trend].color)} />
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Process Integrity</CardTitle>
            <CardDescription>{symbol} Thesis</CardDescription>
          </div>
          <Badge variant="outline" className={cn(overallStatus.color, overallStatus.bgColor)}>
            {overallStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Three Gauges */}
        <div className="flex justify-around">
          <CircularGauge
            value={data.researchQuality.score}
            label="Research"
            color={getScoreColor(data.researchQuality.score)}
          />
          <CircularGauge
            value={data.timeInThesis.hoursInDevelopment}
            max={24}
            label="Time"
            sublabel={maturity.label}
            color={maturity.color}
          />
          <CircularGauge
            value={data.conviction.score}
            label="Conviction"
            sublabel={trendConfig[data.conviction.trend].label}
            color={getScoreColor(data.conviction.score)}
          />
        </div>

        {/* Research Quality Breakdown */}
        {data.researchQuality.breakdown && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Research Breakdown
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tool Usage</span>
                <span>{data.researchQuality.breakdown.toolUsage}/40</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Devil&apos;s Advocate</span>
                <span>{data.researchQuality.breakdown.devilsAdvocate}/25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assumptions</span>
                <span>{data.researchQuality.breakdown.assumptions}/20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Spent</span>
                <span>{data.researchQuality.breakdown.timeSpent}/15</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.researchQuality.recommendations && data.researchQuality.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recommendations
            </p>
            <ul className="space-y-1">
              {data.researchQuality.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conviction Trend Warning */}
        {data.conviction.trend === 'volatile' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-500 text-xs">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Your conviction has been volatile. Consider why your view keeps changing.</span>
          </div>
        )}

        {/* Rushed Warning */}
        {data.timeInThesis.isRushed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>This thesis is very new with few refinements. Give it more time to develop.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
