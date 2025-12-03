'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MockDataWarningProps {
  className?: string;
}

export function MockDataWarning({ className }: MockDataWarningProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Simulated Data Mode</AlertTitle>
      <AlertDescription>
        Live market data is unavailable. Displaying simulated data.
        <span className="font-semibold block mt-1">
          Trading is disabled while using simulated data.
        </span>
      </AlertDescription>
    </Alert>
  );
}

// Hook to track mock data state
import { create } from 'zustand';

interface MockDataState {
  isMockData: boolean;
  setMockData: (isMock: boolean) => void;
}

export const useMockDataStore = create<MockDataState>((set) => ({
  isMockData: false,
  setMockData: (isMock) => set({ isMockData: isMock }),
}));
