import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring

  // Session Replay
  replaysSessionSampleRate: 0.1, // Capture 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Debug mode (off in production)
  debug: false,

  // Filter out local development errors
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    return event;
  },
});
