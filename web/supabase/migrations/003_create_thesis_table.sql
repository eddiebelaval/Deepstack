-- DeepStack Thesis Table Migration
-- Supports the Thesis Engine feature for building and tracking trading theses

-- ============================================
-- THESIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.thesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafting'
    CHECK (status IN ('drafting', 'active', 'validated', 'invalidated', 'archived')),
  hypothesis TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  entry_target NUMERIC,
  exit_target NUMERIC,
  stop_loss NUMERIC,
  risk_reward_ratio NUMERIC,
  key_conditions JSONB DEFAULT '[]'::jsonb,
  validation_score INTEGER CHECK (validation_score >= 0 AND validation_score <= 100),
  validation_notes TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_thesis_user_id ON public.thesis(user_id);
CREATE INDEX IF NOT EXISTS idx_thesis_symbol ON public.thesis(symbol);
CREATE INDEX IF NOT EXISTS idx_thesis_status ON public.thesis(status);
CREATE INDEX IF NOT EXISTS idx_thesis_conversation_id ON public.thesis(conversation_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.thesis ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: THESIS
-- ============================================
CREATE POLICY "Users can view their own theses"
  ON public.thesis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own theses"
  ON public.thesis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theses"
  ON public.thesis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own theses"
  ON public.thesis FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_thesis_updated_at ON public.thesis;
CREATE TRIGGER update_thesis_updated_at
  BEFORE UPDATE ON public.thesis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
