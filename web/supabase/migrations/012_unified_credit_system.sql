-- ============================================
-- UNIFIED CREDIT SYSTEM MIGRATION
-- ============================================
-- Adds credit management, tier configuration,
-- and usage tracking to DeepStack
-- ============================================

-- 1. Add subscription columns to profiles (if not exist)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'pro', 'elite')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'
  CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- 2. Add credit management columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS credits_monthly_base INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS credits_rollover INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_rollover_cap INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS billing_cycle_anchor DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMPTZ DEFAULT NOW();

-- 3. Create credit tier configuration table
CREATE TABLE IF NOT EXISTS public.credit_tier_config (
    tier VARCHAR(20) PRIMARY KEY,
    monthly_credits INTEGER NOT NULL,
    rollover_enabled BOOLEAN DEFAULT FALSE,
    rollover_cap_multiplier DECIMAL(3,1) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed tier configuration
INSERT INTO public.credit_tier_config (tier, monthly_credits, rollover_enabled, rollover_cap_multiplier) VALUES
    ('free', 100, FALSE, 1.0),
    ('pro', 1000, TRUE, 2.0),
    ('elite', 5000, TRUE, 2.0)
ON CONFLICT (tier) DO UPDATE SET
    monthly_credits = EXCLUDED.monthly_credits,
    rollover_enabled = EXCLUDED.rollover_enabled,
    rollover_cap_multiplier = EXCLUDED.rollover_cap_multiplier,
    updated_at = NOW();

-- 4. Create usage tracking table
CREATE TABLE IF NOT EXISTS public.credit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('ai_chat', 'data_api', 'analysis', 'options', 'other')),
    action VARCHAR(50) NOT NULL,
    credits_used INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    endpoint VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_date ON public.credit_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_usage_category ON public.credit_usage(category);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

-- Enable RLS on credit_usage
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.credit_usage;
CREATE POLICY "Users can view own usage" ON public.credit_usage
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Atomic credit deduction function with usage logging
CREATE OR REPLACE FUNCTION public.deduct_credits_v2(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_cost INTEGER,
    p_category TEXT DEFAULT 'other',
    p_endpoint VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_tier VARCHAR(20);
BEGIN
    -- Get current credits with row lock to prevent race conditions
    SELECT credits, subscription_tier
    INTO v_current_credits, v_tier
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    -- Handle user not found
    IF v_current_credits IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'USER_NOT_FOUND',
            'message', 'User profile not found'
        );
    END IF;

    -- Check sufficient credits
    IF v_current_credits < p_cost THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'INSUFFICIENT_CREDITS',
            'message', 'Insufficient credits',
            'remaining', v_current_credits,
            'required', p_cost
        );
    END IF;

    -- Deduct credits
    v_new_credits := v_current_credits - p_cost;

    UPDATE profiles
    SET credits = v_new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log usage
    INSERT INTO credit_usage (user_id, category, action, credits_used, credits_remaining, endpoint, metadata)
    VALUES (p_user_id, p_category, p_action, p_cost, v_new_credits, p_endpoint, p_metadata);

    RETURN jsonb_build_object(
        'success', TRUE,
        'remaining', v_new_credits,
        'used', p_cost,
        'tier', v_tier
    );
END;
$$;

-- 6. Tier allocation function (called on subscription upgrade)
CREATE OR REPLACE FUNCTION public.allocate_tier_credits(
    p_user_id UUID,
    p_new_tier VARCHAR(20)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_monthly_credits INTEGER;
    v_rollover_cap INTEGER;
    v_rollover_enabled BOOLEAN;
BEGIN
    -- Get tier configuration
    SELECT monthly_credits, rollover_enabled, (monthly_credits * rollover_cap_multiplier)::INTEGER
    INTO v_monthly_credits, v_rollover_enabled, v_rollover_cap
    FROM credit_tier_config
    WHERE tier = p_new_tier;

    IF v_monthly_credits IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_TIER');
    END IF;

    -- Update user profile with new tier and credits
    UPDATE profiles
    SET
        subscription_tier = p_new_tier,
        credits = v_monthly_credits,
        credits_monthly_base = v_monthly_credits,
        credits_rollover_cap = v_rollover_cap,
        billing_cycle_anchor = CURRENT_DATE,
        last_credit_reset = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'tier', p_new_tier,
        'credits', v_monthly_credits,
        'rollover_cap', v_rollover_cap
    );
END;
$$;

-- 7. Monthly credit reset function (for scheduled jobs)
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Reset credits for users whose billing cycle has passed
    UPDATE profiles p
    SET
        credits_rollover = CASE
            WHEN tc.rollover_enabled THEN
                LEAST(p.credits, p.credits_rollover_cap)
            ELSE 0
        END,
        credits = CASE
            WHEN tc.rollover_enabled THEN
                tc.monthly_credits + LEAST(p.credits, p.credits_rollover_cap)
            ELSE
                tc.monthly_credits
        END,
        credits_monthly_base = tc.monthly_credits,
        last_credit_reset = NOW(),
        updated_at = NOW()
    FROM credit_tier_config tc
    WHERE p.subscription_tier = tc.tier
      AND (
          p.last_credit_reset IS NULL
          OR p.last_credit_reset < (NOW() - INTERVAL '1 month')
          OR (p.billing_cycle_anchor IS NOT NULL
              AND EXTRACT(DAY FROM NOW()) = EXTRACT(DAY FROM p.billing_cycle_anchor)
              AND p.last_credit_reset::date < CURRENT_DATE)
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 8. Update existing free users to have 100 credits
UPDATE public.profiles
SET
    credits = 100,
    credits_monthly_base = 100,
    credits_rollover_cap = 100
WHERE subscription_tier = 'free' OR subscription_tier IS NULL;

-- 9. Grant necessary permissions
GRANT SELECT ON public.credit_tier_config TO authenticated;
GRANT SELECT ON public.credit_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_tier_credits TO service_role;
