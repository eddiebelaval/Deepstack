# Sentry Activation Checklist

Quick start guide to activate Sentry error monitoring in production. Sentry is already integrated and ready to go - just add your DSN.

## Step 1: Create Sentry Project (5 minutes)

1. Go to [sentry.io](https://sentry.io) and sign up (free tier available)
2. Click "Create Project"
3. Select "Next.js" as the platform
4. Name your project (e.g., "deepstack-web")
5. Copy the DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

## Step 2: Add DSN to Environment Variables

### For Local Development (Optional)

Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### For Vercel Production (Required)

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: Your DSN from Step 1
   - Environments: Production (and optionally Preview, Development)
3. Click "Save"

## Step 3: Add Auth Token for Source Maps (Optional but Recommended)

Source maps let you see readable stack traces instead of minified code.

1. In Sentry, go to Settings > Auth Tokens
2. Click "Create New Token"
3. Configure:
   - Name: "Vercel Build Token"
   - Scopes: Select `project:read`, `project:releases`, `org:read`
4. Copy the token
5. Add to Vercel Environment Variables:
   - Key: `SENTRY_AUTH_TOKEN`
   - Value: Your auth token
   - Environments: Production, Preview

## Step 4: Deploy and Verify

1. Redeploy your application (Vercel will pick up the new environment variables)
2. Visit your production site
3. Go to Sentry Dashboard > Issues
4. You should see "Waiting for errors..." (if no errors yet)

## Testing (Optional)

To test that Sentry is working, trigger a test error:

1. Add this code to any page:
```typescript
'use client';

export default function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error('Sentry test - please ignore');
    }}>
      Test Sentry
    </button>
  );
}
```

2. Click the button in production
3. Check Sentry Dashboard - error should appear within 1-2 minutes
4. If you added the auth token, verify the stack trace shows readable code

## That's It!

Sentry is now monitoring your application for errors and performance issues.

### What's Already Configured

- Error tracking on client, server, and edge
- Performance monitoring (10% sample rate)
- Session replay (10% of sessions, 100% of error sessions)
- Privacy protections (text and media masking)
- Production-only mode (no dev errors sent)

### Next Steps

- Set up alerts in Sentry for new errors
- Adjust sample rates if needed (see `/docs/SENTRY_SETUP.md`)
- Monitor your error budget in the Sentry dashboard

### Troubleshooting

**Errors not appearing?**
- Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly in Vercel
- Check that you're testing in production mode (`NODE_ENV=production`)
- Look in browser console for Sentry initialization errors

**Source maps not working?**
- Verify `SENTRY_AUTH_TOKEN` is set in Vercel
- Check build logs for source map upload errors
- Ensure auth token has correct permissions

### Resources

- Full documentation: `/docs/SENTRY_SETUP.md`
- Sentry Dashboard: https://sentry.io
- Sentry Next.js Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Time to Complete**: 10 minutes
**Cost**: Free tier (up to 5,000 errors/month)
