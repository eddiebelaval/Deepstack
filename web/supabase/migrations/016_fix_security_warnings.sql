-- ============================================
-- FIX SUPABASE SECURITY WARNINGS
-- ============================================
-- This migration addresses Supabase linter security warnings:
-- 1. Security Definer Views - Recreate views with SECURITY INVOKER
-- 2. RLS Disabled on Public Tables - Enable RLS with appropriate policies
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================
-- Recreate views with explicit SECURITY INVOKER to ensure they use
-- the querying user's permissions rather than the view creator's

-- Drop and recreate trial_analytics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.trial_analytics;
CREATE VIEW public.trial_analytics
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) FILTER (WHERE subscription_status = 'trialing') as active_trials,
    COUNT(*) FILTER (WHERE trial_converted_at IS NOT NULL) as converted_trials,
    COUNT(*) FILTER (WHERE trial_downgraded_at IS NOT NULL) as expired_trials,
    COUNT(*) FILTER (WHERE has_used_trial = TRUE) as total_trials_started,
    ROUND(
        COUNT(*) FILTER (WHERE trial_converted_at IS NOT NULL)::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE has_used_trial = TRUE), 0) * 100,
        2
    ) as conversion_rate_percent
FROM public.profiles;

-- Restore permissions (service_role only - admin analytics)
GRANT SELECT ON public.trial_analytics TO service_role;

-- Drop and recreate process_integrity_summary view with SECURITY INVOKER
DROP VIEW IF EXISTS public.process_integrity_summary;
CREATE VIEW public.process_integrity_summary
WITH (security_invoker = true)
AS
SELECT
  t.id AS thesis_id,
  t.user_id,
  t.symbol,
  t.status,
  t.research_quality_score,
  t.conviction_score,
  t.first_mentioned_at,
  t.is_implicit_draft,
  -- Time calculations
  EXTRACT(EPOCH FROM (NOW() - COALESCE(t.first_mentioned_at, t.created_at))) / 3600 AS hours_in_development,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(t.first_mentioned_at, t.created_at))) / 3600 >= 24 THEN 'mature'
    WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(t.first_mentioned_at, t.created_at))) / 3600 >= 4 THEN 'developing'
    ELSE 'nascent'
  END AS maturity_level,
  -- Evolution event count
  (SELECT COUNT(*) FROM public.thesis_evolution te WHERE te.thesis_id = t.id) AS evolution_events,
  -- Research session count
  (SELECT COUNT(*) FROM public.research_sessions rs WHERE rs.thesis_id = t.id) AS research_sessions,
  -- Override count (last 7 days for this user)
  (SELECT COUNT(*) FROM public.process_overrides po
   WHERE po.user_id = t.user_id
   AND po.override_confirmed = true
   AND po.created_at > NOW() - INTERVAL '7 days') AS recent_overrides
FROM public.thesis t
WHERE t.status IN ('drafting', 'active');

-- Restore permissions (authenticated users - RLS on underlying tables controls access)
GRANT SELECT ON public.process_integrity_summary TO authenticated;

-- ============================================
-- 2. ENABLE RLS ON CONFIGURATION TABLES
-- ============================================
-- These tables store application configuration that should be readable
-- by authenticated users but only writable by service_role/admins

-- Enable RLS on trial_config
ALTER TABLE public.trial_config ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read trial configuration
DROP POLICY IF EXISTS "Authenticated users can read trial config" ON public.trial_config;
CREATE POLICY "Authenticated users can read trial config" ON public.trial_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role can manage trial config
DROP POLICY IF EXISTS "Service role can manage trial config" ON public.trial_config;
CREATE POLICY "Service role can manage trial config" ON public.trial_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Enable RLS on credit_tier_config
ALTER TABLE public.credit_tier_config ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read credit tier configuration
DROP POLICY IF EXISTS "Authenticated users can read credit tier config" ON public.credit_tier_config;
CREATE POLICY "Authenticated users can read credit tier config" ON public.credit_tier_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role can manage credit tier config
DROP POLICY IF EXISTS "Service role can manage credit tier config" ON public.credit_tier_config;
CREATE POLICY "Service role can manage credit tier config" ON public.credit_tier_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 3. HANDLE token_usage TABLE (IF EXISTS)
-- ============================================
-- The token_usage table may exist from external sources or previous migrations
-- Enable RLS if it exists

DO $$
BEGIN
    -- Check if token_usage table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_usage') THEN
        -- Enable RLS
        ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

        -- Check if user_id column exists for user-scoped policies
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'token_usage' AND column_name = 'user_id') THEN
            -- Create user-scoped SELECT policy
            DROP POLICY IF EXISTS "Users can view own token usage" ON public.token_usage;
            CREATE POLICY "Users can view own token usage" ON public.token_usage
                FOR SELECT
                TO authenticated
                USING (auth.uid() = user_id);

            -- Create service_role full access policy
            DROP POLICY IF EXISTS "Service role can manage token usage" ON public.token_usage;
            CREATE POLICY "Service role can manage token usage" ON public.token_usage
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
        ELSE
            -- If no user_id column, make it read-only for authenticated users
            DROP POLICY IF EXISTS "Authenticated users can read token usage" ON public.token_usage;
            CREATE POLICY "Authenticated users can read token usage" ON public.token_usage
                FOR SELECT
                TO authenticated
                USING (true);

            -- Service role full access
            DROP POLICY IF EXISTS "Service role can manage token usage" ON public.token_usage;
            CREATE POLICY "Service role can manage token usage" ON public.token_usage
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
        END IF;

        RAISE NOTICE 'RLS enabled on token_usage table';
    ELSE
        RAISE NOTICE 'token_usage table does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON VIEW public.trial_analytics IS 'Admin analytics view for trial conversion metrics (SECURITY INVOKER)';
COMMENT ON VIEW public.process_integrity_summary IS 'Process integrity metrics per thesis (SECURITY INVOKER)';
