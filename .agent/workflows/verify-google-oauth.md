# Google OAuth Verification Guide for COMET

## Objective
Verify that Google OAuth login on DeepStack (deepstack.trade) correctly redirects through Supabase and back to the DeepStack application, **NOT** to id8composer.app.

---

## Step 1: Verify Supabase URL Configuration

1. Navigate to: https://supabase.com/dashboard/project/scfdoayhmcruieppwawg/auth/url-configuration
2. Confirm these settings:
   - **Site URL**: `https://deepstack.trade`
   - **Redirect URLs** includes: `https://deepstack.trade/auth/callback`
3. Take a screenshot for documentation

---

## Step 2: Identify the Google Cloud Project

1. Go to Supabase: https://supabase.com/dashboard/project/scfdoayhmcruieppwawg/auth/providers
2. Click on **Google** provider to expand it
3. Copy the **Client ID** value (looks like: `xxxx.apps.googleusercontent.com`)
4. Search for this Client ID in Google Cloud Console to identify which project it belongs to

---

## Step 3: Verify Google Cloud OAuth Configuration

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select the correct Google Cloud Project (identified in Step 2)
3. Click on the OAuth 2.0 Client ID being used
4. Under **Authorized redirect URIs**, verify this URL exists:
   ```
   https://scfdoayhmcruieppwawg.supabase.co/auth/v1/callback
   ```
5. If missing, add it and save
6. Take a screenshot for documentation

---

## Step 4: Test Google Login Flow

1. Open an **incognito/private browser window**
2. Navigate to: https://deepstack.trade/login
3. Click **"Continue with Google"**
4. Observe:
   - The Google OAuth consent screen should load
   - After selecting an account, it should redirect to `deepstack.trade`, NOT `id8composer.app`
5. Take a screenshot of the successful login or any error

---

## Expected Results

| Check | Expected Value |
|-------|----------------|
| Supabase Site URL | `https://deepstack.trade` |
| Supabase Redirect URLs | Contains `https://deepstack.trade/auth/callback` |
| Google Cloud Redirect URI | `https://scfdoayhmcruieppwawg.supabase.co/auth/v1/callback` |
| Login Redirect | Goes to `deepstack.trade` (not `id8composer.app`) |

---

## Troubleshooting

If still redirecting to id8composer.app:
1. The Google OAuth Client ID in Supabase may be shared with id8Composer project
2. Consider creating a **new OAuth 2.0 Client ID** specifically for DeepStack
3. Update Supabase Google provider with the new Client ID and Secret
