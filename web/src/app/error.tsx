'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console and potentially to error tracking service
    console.error('Application error:', error);

    // Could send to Sentry/LogRocket here:
    // Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center max-w-md">
        {/* Error Icon */}
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. Our team has been notified.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Error Details (Dev Only) */}
        {isDev && (
          <details className="mt-8 w-full text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Error Details (dev only)
            </summary>
            <div className="mt-3 p-4 bg-muted rounded-lg overflow-auto">
              <p className="text-sm font-medium text-destructive mb-2">
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mb-2">
                  Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Error ID for support */}
        {error.digest && !isDev && (
          <p className="mt-6 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
