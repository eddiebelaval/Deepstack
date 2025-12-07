-- Add credits column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 500;

-- Function to deduct credits securely
CREATE OR REPLACE FUNCTION deduct_credits(amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Check current credits
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Update credits
  UPDATE public.profiles
  SET credits = credits - amount
  WHERE id = auth.uid()
  RETURNING credits INTO current_credits;

  RETURN jsonb_build_object('success', true, 'remaining_credits', current_credits);
END;
$$;

-- Trigger for new users (if not handled by handle_new_user)
-- Assuming handle_new_user exists, just ensure it adds the default 500 or relies on the column default.
-- If profiles are created via insert, the default 500 will apply.
