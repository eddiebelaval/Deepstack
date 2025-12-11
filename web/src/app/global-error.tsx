'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Global error boundary for root layout errors
 * This catches errors that occur in the root layout itself
 * Must include its own html and body tags
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry for production error tracking
    Sentry.captureException(error);
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            width: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#fafafa',
            padding: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '400px',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>

            {/* Error Message */}
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Critical Error
            </h1>
            <p
              style={{
                color: '#a1a1aa',
                marginBottom: '24px',
              }}
            >
              A critical error occurred. Please refresh the page or try again later.
            </p>

            {/* Retry Button */}
            <button
              onClick={reset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fafafa',
                color: '#0a0a0a',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Try Again
            </button>

            {/* Error ID */}
            {error.digest && (
              <p
                style={{
                  marginTop: '24px',
                  fontSize: '12px',
                  color: '#71717a',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
