-- DeepStack Journal Entries Migration
-- Supports the Trade Journal feature with emotional tracking

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Trade details
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  pnl NUMERIC,
  pnl_percent NUMERIC,

  -- Emotional tracking
  emotion_at_entry TEXT NOT NULL CHECK (emotion_at_entry IN (
    'confident', 'anxious', 'greedy', 'fearful', 'fomo',
    'regret', 'relief', 'neutral', 'excited', 'frustrated'
  )),
  emotion_at_exit TEXT CHECK (emotion_at_exit IN (
    'confident', 'anxious', 'greedy', 'fearful', 'fomo',
    'regret', 'relief', 'neutral', 'excited', 'frustrated'
  )),

  -- Reflection (TipTap HTML content)
  notes TEXT,
  lessons_learned TEXT,

  -- Links
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE SET NULL,
  screenshot_urls JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_symbol ON public.journal_entries(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_entries_trade_date ON public.journal_entries(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_thesis_id ON public.journal_entries(thesis_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotion_at_entry ON public.journal_entries(emotion_at_entry);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: JOURNAL ENTRIES
-- ============================================
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
