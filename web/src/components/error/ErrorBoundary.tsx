'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and displaying errors gracefully
 *
 * Usage:
 * <ErrorBoundary level="section">
 *   <SomeComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    logError(error, {
      componentStack: errorInfo.componentStack || undefined,
      level: this.props.level,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;

      // Page-level error
      if (level === 'page') {
        return <PageError onReset={this.handleReset} onGoHome={this.handleGoHome} />;
      }

      // Section-level error
      if (level === 'section') {
        return <SectionError onReset={this.handleReset} />;
      }

      // Component-level error (minimal)
      return <ComponentError onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Page-level error UI
function PageError({
  onReset,
  onGoHome,
}: {
  onReset: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-loss/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-loss" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Don&apos;t worry, your data is safe.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Section-level error UI
function SectionError({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="h-12 w-12 rounded-full bg-loss/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-loss" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        This section encountered an error.
      </p>
      <Button variant="outline" size="sm" onClick={onReset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

// Component-level error UI (minimal)
function ComponentError({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-loss" />
      <span>Error loading</span>
      <button
        onClick={onReset}
        className="text-primary hover:underline text-xs"
      >
        Retry
      </button>
    </div>
  );
}

// Export named components for direct use
export { PageError, SectionError, ComponentError };
