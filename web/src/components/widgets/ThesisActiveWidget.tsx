'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

// Mock thesis data types
type ThesisStatus = 'active' | 'validating' | 'invalidated';

type Thesis = {
  id: string;
  title: string;
  validationScore: number; // 0-100
  status: ThesisStatus;
  createdAt: string;
};

// Mock data
const MOCK_THESES: Thesis[] = [
  {
    id: '1',
    title: 'Tech sector oversold on rate fears',
    validationScore: 78,
    status: 'active',
    createdAt: '2024-12-08',
  },
  {
    id: '2',
    title: 'Energy rotation on geopolitical tension',
    validationScore: 65,
    status: 'validating',
    createdAt: '2024-12-07',
  },
  {
    id: '3',
    title: 'Defensive play into year-end',
    validationScore: 42,
    status: 'invalidated',
    createdAt: '2024-12-06',
  },
];

const getStatusIcon = (status: ThesisStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-3 w-3 text-profit" />;
    case 'validating':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'invalidated':
      return <AlertCircle className="h-3 w-3 text-loss" />;
  }
};

const getStatusLabel = (status: ThesisStatus) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'validating':
      return 'Validating';
    case 'invalidated':
      return 'Invalidated';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-profit';
  if (score >= 50) return 'text-yellow-500';
  return 'text-loss';
};

export function ThesisActiveWidget() {
  // Show only active and validating theses
  const activeTheses = MOCK_THESES.filter(
    (t) => t.status === 'active' || t.status === 'validating'
  ).slice(0, 3);

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
                <span className={cn('font-bold', getScoreColor(thesis.validationScore))}>
                  {thesis.validationScore}%
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
