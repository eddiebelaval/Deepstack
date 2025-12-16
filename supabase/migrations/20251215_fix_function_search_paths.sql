-- Security Fix: Set search_path for all functions
-- This prevents SQL injection via schema manipulation attacks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- When search_path is mutable, an attacker could create malicious objects
-- in a schema that appears earlier in the search path, causing the function
-- to call attacker-controlled code instead of the intended functions.
-- Setting search_path = '' ensures all object references must be fully qualified.

-- Fix handle_updated_at function
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Fix check_single_active_subscription function
ALTER FUNCTION public.check_single_active_subscription() SET search_path = '';

-- Fix update_tour_progress_updated_at function
ALTER FUNCTION public.update_tour_progress_updated_at() SET search_path = '';

-- Fix get_active_arc_session function
ALTER FUNCTION public.get_active_arc_session(uuid) SET search_path = '';

-- Fix check_subscription_limits function
ALTER FUNCTION public.check_subscription_limits(uuid) SET search_path = '';

-- Fix get_token_usage function
ALTER FUNCTION public.get_token_usage(uuid) SET search_path = '';

-- Fix update_daily_stats function
ALTER FUNCTION public.update_daily_stats() SET search_path = '';

-- Fix record_token_usage function
ALTER FUNCTION public.record_token_usage(uuid, integer) SET search_path = '';

-- Fix search_knowledge_files function
ALTER FUNCTION public.search_knowledge_files(uuid, vector, double precision, integer) SET search_path = '';

-- Fix increment_ai_usage function
ALTER FUNCTION public.increment_ai_usage(uuid) SET search_path = '';

-- Fix remove_custom_personality function
ALTER FUNCTION public.remove_custom_personality(uuid, text) SET search_path = '';

-- Fix get_or_create_user_ai_preferences function
ALTER FUNCTION public.get_or_create_user_ai_preferences(uuid) SET search_path = '';

-- Fix redeem_invite_code function
ALTER FUNCTION public.redeem_invite_code(text) SET search_path = '';

-- Fix get_quota_limit function
ALTER FUNCTION public.get_quota_limit(text) SET search_path = '';

-- Fix get_period_start function
ALTER FUNCTION public.get_period_start(timestamp with time zone) SET search_path = '';

-- Fix check_quota function
ALTER FUNCTION public.check_quota(uuid) SET search_path = '';

-- Fix add_custom_personality function
ALTER FUNCTION public.add_custom_personality(uuid, text, text) SET search_path = '';

-- Fix archive_old_arc_sessions function
ALTER FUNCTION public.archive_old_arc_sessions() SET search_path = '';
