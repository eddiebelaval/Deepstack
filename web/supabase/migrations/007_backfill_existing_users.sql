-- Manual profile creation for testing
-- Run this in Supabase SQL Editor to create Eddie's profile

-- First, find Eddie's user ID from auth.users
SELECT id, email FROM auth.users WHERE email LIKE '%eddie%' OR email LIKE '%belaval%';

-- Then create profile with that user_id (replace 'USER_ID_HERE' with actual ID from above)
-- INSERT INTO public.profiles (id, subscription_tier, subscription_status)
-- VALUES ('USER_ID_HERE', 'free', 'active')
-- ON CONFLICT (id) DO NOTHING;

-- OR if you want to backfill ALL existing users:
INSERT INTO public.profiles (id, subscription_tier, subscription_status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify profile created
SELECT p.id, u.email, p.subscription_tier, p.subscription_status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
