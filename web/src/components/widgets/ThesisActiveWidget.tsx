'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle2, Clock, AlertCircle, Archive, Edit } from 'lucide-react';
import { useThesisSync } from '@/hooks/useThesisSync';
import { ThesisEntry } from '@/lib/stores/thesis-store';

// Use the actual status type from the store
type ThesisStatus = ThesisEntry['status'];

const getStatusIcon = (status: ThesisStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-3 w-3 text-profit" />;
    case 'drafting':
      return <Edit className="h-3 w-3 text-blue-500" />;
    case 'validated':
      return <CheckCircle2 className="h-3 w-3 text-profit" />;
    case 'invalidated':
      return <AlertCircle className="h-3 w-3 text-loss" />;
    case 'archived':
      return <Archive className="h-3 w-3 text-muted-foreground" />;
    default:
      return <Clock className="h-3 w-3 text-yellow-500" />;
  }
};

const getStatusLabel = (status: ThesisStatus) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'drafting':
      return 'Drafting';
    case 'validated':
      return 'Validated';
    case 'invalidated':
      return 'Invalidated';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-profit';
  if (score >= 50) return 'text-yellow-500';
  return 'text-loss';
};

export function ThesisActiveWidget() {
  const { theses, isLoading } = useThesisSync();

  // Filter to active/drafting theses and take top 3
  const activeTheses = theses
    .filter(t => t.status === 'active' || t.status === 'drafting')
    .slice(0, 3);

  return (
    <div className="space-y-2">
      {activeTheses.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No active theses</p>
        </div>
      ) : (
        activeTheses.map((thesis) => (
          <div
            key={thesis.id}
            className="p-2.5 rounded-lg glass-surface hover:bg-muted/30 transition-colors cursor-pointer"
          >
            {/* Title */}
            <div className="flex items-start gap-2 mb-2">
              {getStatusIcon(thesis.status)}
              <p className="text-sm font-medium line-clamp-2 flex-1 leading-snug">
                {thesis.title}
              </p>
            </div>

            {/* Score and Status */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Score:</span>
                <span className={cn('font-bold', getScoreColor(thesis.validationScore ?? 0))}>
                  {thesis.validationScore ?? 0}%
                </span>
              </div>
              <span className="text-muted-foreground">
                {getStatusLabel(thesis.status)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Named export for flexibility
export default ThesisActiveWidget;
