# Sentry Activation Checklist

Use this checklist to activate Sentry error monitoring in production.

## Prerequisites
- [ ] Sentry integration code is deployed (DONE)
- [ ] Application builds successfully (VERIFIED)

## Step 1: Create Sentry Project (5 minutes)

1. [ ] Sign up or log in to [sentry.io](https://sentry.io)
2. [ ] Click "Create Project"
3. [ ] Select "Next.js" as the platform
4. [ ] Name the project "deepstack-web" (or your preferred name)
5. [ ] Copy the DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

## Step 2: Add Environment Variables

### Local Development (Optional)
1. [ ] Open `.env.local`
2. [ ] Add: `NEXT_PUBLIC_SENTRY_DSN=your-dsn-here`
3. [ ] Save and restart dev server

### Vercel Production (Required)
1. [ ] Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. [ ] Add variable:
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: Your DSN from Sentry
   - Environments: Production, Preview (optional), Development (optional)
3. [ ] Click "Save"

### Vercel Build (Required for Source Maps)
1. [ ] In Sentry, go to Settings > Auth Tokens
2. [ ] Click "Create New Token"
3. [ ] Configure:
   - Name: "Vercel Build Token"
   - Scopes: `project:read`, `project:releases`, `org:read`
4. [ ] Copy the token (you won't see it again!)
5. [ ] In Vercel, add environment variable:
   - Key: `SENTRY_AUTH_TOKEN`
   - Value: Your auth token from Sentry
   - Environments: Production, Preview
6. [ ] Click "Save"

### GitHub Actions (Required for CI/CD)
1. [ ] Go to GitHub Repository > Settings > Secrets and variables > Actions
2. [ ] Click "New repository secret"
3. [ ] Add secret:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: Same token from Step 2 above (or create a new one)
4. [ ] Click "Add secret"

## Step 3: Deploy and Verify

1. [ ] Redeploy your application (Vercel will pick up new env vars)
2. [ ] Wait for deployment to complete
3. [ ] Visit your production site
4. [ ] Check browser console for Sentry initialization (should be silent if working)

## Step 4: Test Error Tracking

### Method 1: Trigger a Test Error
1. [ ] Add this code to a test page:
```typescript
'use client';

export default function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error('Sentry test error - please ignore');
    }}>
      Test Sentry
    </button>
  );
}
```
2. [ ] Click the button in production
3. [ ] Go to Sentry Dashboard > Issues
4. [ ] Verify error appears within 1-2 minutes

### Method 2: Use Sentry Test Page
1. [ ] Go to your Sentry project
2. [ ] Look for "Send your first error" prompt
3. [ ] Follow the test instructions

## Step 5: Verify Source Maps

1. [ ] In Sentry, open an error from Step 4
2. [ ] Click on the stack trace
3. [ ] Verify you see:
   - Original source code (not minified)
   - Correct line numbers
   - File paths from your project

If source maps aren't working:
- Check that `SENTRY_AUTH_TOKEN` is set in Vercel
- Review build logs for source map upload errors
- Verify the auth token has correct permissions

## Step 6: Configure Alerts (Recommended)

1. [ ] In Sentry, go to Alerts > Create Alert
2. [ ] Set up recommended alerts:
   - [ ] New issues (all team members)
   - [ ] Error spike (10x normal rate)
   - [ ] High error rate (>1% of requests)
3. [ ] Configure notification channels (email, Slack, etc.)

## Step 7: Set Performance Budgets (Optional)

1. [ ] In Sentry, go to Performance
2. [ ] Set up transaction thresholds:
   - [ ] API routes: < 500ms
   - [ ] Page loads: < 2s
   - [ ] Database queries: < 100ms
3. [ ] Enable performance alerts

## Verification Checklist

After setup, verify:
- [ ] Errors appear in Sentry dashboard
- [ ] Source maps show readable code
- [ ] Session replays are available for errors
- [ ] Performance data is being collected
- [ ] Team members receive alert notifications
- [ ] Error digest appears in production error UI

## Troubleshooting

### Errors not appearing in Sentry
- Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Verify `NODE_ENV=production` (dev errors are filtered)
- Check browser console for Sentry errors
- Verify network allows connections to sentry.io

### Source maps not uploading
- Check `SENTRY_AUTH_TOKEN` is set in Vercel
- Verify auth token has correct permissions
- Review Vercel build logs for upload errors
- Try creating a new auth token

### Too many events
- Reduce `tracesSampleRate` in sentry configs (currently 10%)
- Add more aggressive `beforeSend` filtering
- Configure rate limiting in Sentry project settings

## Cost Management

Current configuration:
- 10% trace sampling (performance)
- 10% session replay sampling (normal sessions)
- 100% session replay sampling (error sessions)

For high-traffic sites, consider:
- [ ] Reducing trace sample rate to 1-5%
- [ ] Reducing session replay to 1-5%
- [ ] Setting up spike protection in Sentry
- [ ] Monitoring quota usage in Sentry dashboard

## Next Steps

Once Sentry is active:
1. [ ] Monitor for a week to establish baseline
2. [ ] Adjust sample rates based on volume/budget
3. [ ] Set up custom error grouping rules
4. [ ] Integrate with your team's workflow (Jira, Linear, etc.)
5. [ ] Document common errors and resolutions

## Resources

- Setup Documentation: `/docs/SENTRY_SETUP.md`
- Sentry Dashboard: https://sentry.io
- Sentry Next.js Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Vercel Environment Variables: https://vercel.com/docs/environment-variables

---

**Estimated Time to Complete**: 15-20 minutes
**Difficulty**: Easy
**Cost**: Free tier available (up to 5,000 errors/month)
