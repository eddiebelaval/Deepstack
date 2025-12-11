# Sentry Error Monitoring Setup

This document describes the Sentry error monitoring integration for the DeepStack web application.

## Overview

Sentry is integrated to provide comprehensive error tracking and performance monitoring across the entire Next.js application, including:

- Client-side errors
- Server-side errors
- Edge runtime errors
- Session replays for debugging
- Performance monitoring
- Source map uploads for better stack traces

## Configuration Files

### Core Configuration

1. **sentry.client.config.ts** - Client-side error tracking
   - Session Replay integration with privacy masking
   - 10% of regular sessions captured
   - 100% of error sessions captured
   - Performance monitoring (10% sample rate)

2. **sentry.server.config.ts** - Server-side error tracking
   - API route error tracking
   - Server component error tracking
   - Performance monitoring (10% sample rate)

3. **sentry.edge.config.ts** - Edge runtime error tracking
   - Middleware error tracking
   - Edge API route error tracking
   - Performance monitoring (10% sample rate)

4. **next.config.ts** - Build configuration
   - Source map upload configuration
   - Sentry webpack plugin integration

### Error Boundaries

1. **src/app/error.tsx** - Page-level error boundary
   - Catches errors in page components
   - Provides user-friendly error UI
   - Automatically reports to Sentry

2. **src/app/global-error.tsx** - Root-level error boundary
   - Catches errors in root layout
   - Last-resort error handler
   - Automatically reports to Sentry

## Environment Variables

### Required for Runtime

```bash
# Sentry DSN - Get from Sentry project settings
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Required for Build (CI/CD)

```bash
# Sentry Auth Token - Get from Sentry Settings > Auth Tokens
# Required for uploading source maps during build
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### Optional

```bash
# Set to 'production', 'staging', or 'development'
NEXT_PUBLIC_VERCEL_ENV=production
```

## Setup Instructions

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project and select "Next.js" as the platform
3. Copy the DSN from the project settings

### 2. Configure Local Development

1. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

2. Test the integration:
   ```bash
   # This will only report errors in production mode
   npm run build
   npm start
   ```

### 3. Configure Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add the following variables:

   ```
   NEXT_PUBLIC_SENTRY_DSN = https://xxx@xxx.ingest.sentry.io/xxx
   SENTRY_AUTH_TOKEN = sntrys_xxx
   ```

4. Make sure to set them for Production, Preview, and Development environments as needed

### 4. Configure GitHub Actions (CI/CD)

The SENTRY_AUTH_TOKEN is already configured in `.github/workflows/ci.yml`.

To add the secret:

1. Go to GitHub repository Settings > Secrets and variables > Actions
2. Add a new repository secret:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: Your Sentry auth token (from Sentry Settings > Auth Tokens)

### 5. Create Sentry Auth Token

1. Go to Sentry Settings > Auth Tokens
2. Create a new token with these scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Copy the token and add it to your CI/CD secrets

## Features Enabled

### Error Tracking

- Automatic error capture for unhandled exceptions
- Source maps for readable stack traces
- Error context (user, environment, breadcrumbs)
- Error grouping and deduplication

### Performance Monitoring

- Transaction tracing for API routes
- Page load performance
- Database query performance
- Custom instrumentation support

### Session Replay

- Video-like reproduction of user sessions with errors
- Privacy-first: all text and media are masked by default
- 10% of normal sessions captured
- 100% of error sessions captured

## Testing Sentry Integration

### Test Client-Side Errors

Add this to any page:

```typescript
'use client';

export default function TestPage() {
  return (
    <button onClick={() => {
      throw new Error('Test Sentry error');
    }}>
      Trigger Error
    </button>
  );
}
```

### Test Server-Side Errors

Add this to an API route:

```typescript
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    throw new Error('Test server error');
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

## Best Practices

### 1. Error Boundaries

Use error boundaries to catch and report errors gracefully:

```typescript
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <div>Something went wrong</div>;
}
```

### 2. Manual Error Reporting

For expected errors that should be logged:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'payment',
    },
    extra: {
      userId: user.id,
    },
  });
  // Handle error gracefully
}
```

### 3. Custom Context

Add user context for better debugging:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

### 4. Breadcrumbs

Add custom breadcrumbs for debugging:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to dashboard',
  level: 'info',
});
```

## Performance Considerations

### Sample Rates

Current configuration:
- **Traces**: 10% (configurable in sentry.*.config.ts)
- **Session Replays**: 10% of normal sessions
- **Error Replays**: 100% of error sessions

Adjust these based on:
- Traffic volume
- Sentry quota
- Budget constraints

### Bundle Size Impact

The Sentry SDK adds approximately:
- Client: ~50KB gzipped
- Server: ~20KB (not sent to client)

The SDK is tree-shakeable and logger statements are automatically removed in production.

## Troubleshooting

### Source Maps Not Uploading

1. Verify `SENTRY_AUTH_TOKEN` is set in environment
2. Check Sentry project has correct permissions
3. Review build logs for Sentry upload errors

### Errors Not Appearing in Sentry

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check that `NODE_ENV=production` (Sentry is disabled in development)
3. Verify network allows connections to sentry.io
4. Check browser console for Sentry initialization errors

### Too Many Events

1. Reduce `tracesSampleRate` in config files
2. Add more aggressive `beforeSend` filtering
3. Configure rate limiting in Sentry project settings

## Security Considerations

1. **PII Protection**: Session Replay masks all text and media by default
2. **Environment Filtering**: Development errors are filtered out
3. **Source Maps**: Only uploaded to Sentry, not served publicly
4. **Auth Token**: Stored securely in CI/CD secrets, never committed

## Monitoring and Alerts

### Recommended Alerts

Configure alerts in Sentry for:
1. New error types
2. Error spike (10x normal rate)
3. Performance degradation
4. High error rate (>1% of requests)

### Dashboard Views

Create custom dashboards for:
1. Error frequency by page
2. Performance metrics by route
3. User impact (affected users)
4. Error trends over time

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io)
- [Source Map Upload Troubleshooting](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Support

For issues with Sentry integration:
1. Check this documentation
2. Review Sentry logs in the dashboard
3. Check Next.js build logs
4. Contact the development team
