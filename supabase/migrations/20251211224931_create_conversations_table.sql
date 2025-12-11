-- Create conversations table for storing chat conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'claude',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);

-- Create index on updated_at for ordering queries
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON public.conversations(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view only their own conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own conversations
CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own conversations
CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
