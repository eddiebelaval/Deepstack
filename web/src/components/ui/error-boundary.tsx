'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Wifi, Server } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
  className?: string;
  variant?: 'panel' | 'inline' | 'fullscreen';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'server' | 'client' | 'unknown';
}

/**
 * Categorize error type for appropriate UI
 */
function categorizeError(error: Error): ErrorBoundaryState['errorType'] {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server')) {
    return 'server';
  }
  return 'client';
}

/**
 * React Error Boundary for catching client-side errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorType: categorizeError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Call optional error handler (for analytics/monitoring)
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorType={this.state.errorType}
          onReset={this.reset}
          variant={this.props.variant}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error fallback UI component
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorType: ErrorBoundaryState['errorType'];
  onReset: () => void;
  variant?: 'panel' | 'inline' | 'fullscreen';
  className?: string;
}

const ERROR_CONFIG = {
  network: {
    icon: Wifi,
    title: 'Connection Error',
    description: 'Unable to connect. Please check your internet connection.',
    action: 'Retry',
  },
  server: {
    icon: Server,
    title: 'Server Error',
    description: 'Our servers are having trouble. Please try again later.',
    action: 'Retry',
  },
  client: {
    icon: Bug,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try refreshing.',
    action: 'Refresh',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Error',
    description: 'Something unexpected happened.',
    action: 'Try Again',
  },
};

export function ErrorFallback({
  error,
  errorType,
  onReset,
  variant = 'panel',
  className,
}: ErrorFallbackProps) {
  const config = ERROR_CONFIG[errorType];
  const Icon = config.icon;

  const variants = {
    panel: 'p-6',
    inline: 'p-4',
    fullscreen: 'p-8 min-h-[400px]',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variants[variant],
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-destructive" />
      </div>

      <h3 className="font-semibold text-base mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
        {config.description}
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        {config.action}
      </Button>

      {/* Show error details in development */}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left w-full max-w-md">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Hook-style error boundary using try-catch pattern
 * For use in async operations
 */
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    // Could integrate with error tracking service here
    // e.g., Sentry.captureException(error);
  };

  return { handleError };
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    fallback?: T;
    onError?: (error: Error) => void;
    context?: string;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Error${options?.context ? ` in ${options.context}` : ''}:`, err);
    options?.onError?.(err);
    return options?.fallback;
  }
}
