-- ============================================
-- TRIAL SYSTEM MIGRATION
-- ============================================
-- Adds reverse trial support to DeepStack:
-- - 14-day ELITE trial for new users
-- - Automatic downgrade to FREE after trial
-- - Trial event tracking for analytics
-- ============================================

-- 1. Add trial tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_tier TEXT DEFAULT 'elite' CHECK (trial_tier IN ('free', 'pro', 'elite')),
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_downgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMPTZ;

-- 2. Create trial configuration table
CREATE TABLE IF NOT EXISTS public.trial_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    trial_duration_days INTEGER DEFAULT 14,
    trial_tier VARCHAR(20) DEFAULT 'elite' CHECK (trial_tier IN ('pro', 'elite')),
    midpoint_nudge_day INTEGER DEFAULT 7,
    urgency_start_day INTEGER DEFAULT 12,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configuration (14-day ELITE trial)
INSERT INTO public.trial_config (id, trial_duration_days, trial_tier, midpoint_nudge_day, urgency_start_day)
VALUES (1, 14, 'elite', 7, 12)
ON CONFLICT (id) DO UPDATE SET
    trial_duration_days = EXCLUDED.trial_duration_days,
    trial_tier = EXCLUDED.trial_tier,
    updated_at = NOW();

-- 3. Create trial events table for analytics
CREATE TABLE IF NOT EXISTS public.trial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'trial_started',
        'midpoint_nudge_shown',
        'midpoint_nudge_dismissed',
        'urgency_shown',
        'urgency_dismissed',
        'upgrade_clicked',
        'trial_ended',
        'trial_converted',
        'trial_extended'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends ON public.profiles(trial_ends_at)
    WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_trialing ON public.profiles(subscription_status)
    WHERE subscription_status = 'trialing';
CREATE INDEX IF NOT EXISTS idx_trial_events_user ON public.trial_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_events_type ON public.trial_events(event_type, created_at DESC);

-- Enable RLS on trial_events
ALTER TABLE public.trial_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own trial events
DROP POLICY IF EXISTS "Users can view own trial events" ON public.trial_events;
CREATE POLICY "Users can view own trial events" ON public.trial_events
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Function to start trial for a user
CREATE OR REPLACE FUNCTION public.start_user_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trial_days INTEGER;
    v_trial_tier VARCHAR(20);
    v_already_trialed BOOLEAN;
    v_trial_enabled BOOLEAN;
    v_trial_credits INTEGER;
    v_trial_ends_at TIMESTAMPTZ;
BEGIN
    -- Check if user already had a trial
    SELECT has_used_trial INTO v_already_trialed
    FROM profiles WHERE id = p_user_id;

    IF v_already_trialed THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'ALREADY_TRIALED',
            'message', 'User has already used their free trial'
        );
    END IF;

    -- Get trial config
    SELECT trial_duration_days, trial_tier, enabled
    INTO v_trial_days, v_trial_tier, v_trial_enabled
    FROM trial_config WHERE id = 1;

    -- Check if trials are enabled
    IF NOT v_trial_enabled THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'TRIALS_DISABLED',
            'message', 'Free trials are currently disabled'
        );
    END IF;

    -- Get credits for trial tier
    SELECT monthly_credits INTO v_trial_credits
    FROM credit_tier_config WHERE tier = v_trial_tier;

    -- Calculate trial end date
    v_trial_ends_at := NOW() + (v_trial_days || ' days')::INTERVAL;

    -- Start trial - update profile with trial tier access
    UPDATE profiles SET
        trial_started_at = NOW(),
        trial_ends_at = v_trial_ends_at,
        trial_tier = v_trial_tier,
        has_used_trial = TRUE,
        subscription_tier = v_trial_tier,
        subscription_status = 'trialing',
        credits = v_trial_credits,
        credits_monthly_base = v_trial_credits,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log trial start event
    INSERT INTO trial_events (user_id, event_type, metadata)
    VALUES (
        p_user_id,
        'trial_started',
        jsonb_build_object(
            'tier', v_trial_tier,
            'days', v_trial_days,
            'ends_at', v_trial_ends_at,
            'credits', v_trial_credits
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'tier', v_trial_tier,
        'days', v_trial_days,
        'ends_at', v_trial_ends_at,
        'credits', v_trial_credits
    );
END;
$$;

-- 5. Function to process expired trials (run daily via cron)
CREATE OR REPLACE FUNCTION public.process_expired_trials()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
BEGIN
    -- Find and downgrade users whose trials have expired
    FOR v_user IN
        SELECT id, email, trial_tier
        FROM profiles
        WHERE trial_ends_at < NOW()
          AND subscription_status = 'trialing'
          AND trial_downgraded_at IS NULL
    LOOP
        -- Downgrade to free tier
        UPDATE profiles SET
            subscription_tier = 'free',
            subscription_status = 'inactive',
            trial_downgraded_at = NOW(),
            credits = 100,
            credits_monthly_base = 100,
            credits_rollover = 0,
            credits_rollover_cap = 100,
            updated_at = NOW()
        WHERE id = v_user.id;

        -- Log trial ended event
        INSERT INTO trial_events (user_id, event_type, metadata)
        VALUES (
            v_user.id,
            'trial_ended',
            jsonb_build_object(
                'previous_tier', v_user.trial_tier,
                'downgraded_to', 'free'
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'processed', v_count,
        'processed_at', NOW()
    );
END;
$$;

-- 6. Function to convert trial to paid subscription
CREATE OR REPLACE FUNCTION public.convert_trial_to_paid(
    p_user_id UUID,
    p_tier VARCHAR(20)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_was_trialing BOOLEAN;
BEGIN
    -- Check if user is currently trialing
    SELECT subscription_status = 'trialing' INTO v_was_trialing
    FROM profiles WHERE id = p_user_id;

    IF v_was_trialing THEN
        -- Mark trial as converted
        UPDATE profiles SET
            trial_converted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id;

        -- Log conversion event
        INSERT INTO trial_events (user_id, event_type, metadata)
        VALUES (
            p_user_id,
            'trial_converted',
            jsonb_build_object('converted_to', p_tier)
        );
    END IF;

    -- Use existing tier allocation function
    RETURN allocate_tier_credits(p_user_id, p_tier);
END;
$$;

-- 7. Function to log trial UI events
CREATE OR REPLACE FUNCTION public.log_trial_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO trial_events (user_id, event_type, metadata)
    VALUES (p_user_id, p_event_type, p_metadata);

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8. Update handle_new_user to auto-start trials
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_trial_result JSONB;
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Auto-start trial for new user
    SELECT start_user_trial(NEW.id) INTO v_trial_result;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT SELECT ON public.trial_config TO authenticated;
GRANT SELECT ON public.trial_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_user_trial TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_trial_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_trials TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_trial_to_paid TO service_role;

-- 10. Create view for trial analytics (admin use)
CREATE OR REPLACE VIEW public.trial_analytics AS
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

GRANT SELECT ON public.trial_analytics TO service_role;
