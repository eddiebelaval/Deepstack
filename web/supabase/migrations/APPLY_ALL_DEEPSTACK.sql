-- ============================================
-- DeepStack Complete Migration
-- Run this in Supabase Dashboard SQL Editor
-- ============================================

-- ============================================
-- PART 1: HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: CONVERSATIONS & MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  provider TEXT DEFAULT 'claude',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  default_provider TEXT DEFAULT 'claude',
  default_risk_pct NUMERIC(5,4) DEFAULT 0.02,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: TRADING TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'pct_change_up', 'pct_change_down')),
  target_value NUMERIC NOT NULL,
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.chart_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('MKT', 'LMT', 'STP')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  pnl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: THESIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.thesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafting'
    CHECK (status IN ('drafting', 'active', 'validated', 'invalidated', 'archived')),
  hypothesis TEXT NOT NULL,
  timeframe TEXT,
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
-- PART 5: JOURNAL ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  pnl NUMERIC,
  pnl_percent NUMERIC,
  emotion_at_entry TEXT NOT NULL CHECK (emotion_at_entry IN (
    'confident', 'anxious', 'greedy', 'fearful', 'fomo',
    'regret', 'relief', 'neutral', 'excited', 'frustrated'
  )),
  emotion_at_exit TEXT CHECK (emotion_at_exit IN (
    'confident', 'anxious', 'greedy', 'fearful', 'fomo',
    'regret', 'relief', 'neutral', 'excited', 'frustrated'
  )),
  notes TEXT,
  lessons_learned TEXT,
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE SET NULL,
  screenshot_urls JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 6: INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_sort_order ON public.watchlists(sort_order);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON public.price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON public.price_alerts(triggered) WHERE triggered = FALSE;

CREATE INDEX IF NOT EXISTS idx_chart_layouts_user_id ON public.chart_layouts(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_journal_user_id ON public.trade_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON public.trade_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_journal_created_at ON public.trade_journal(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thesis_user_id ON public.thesis(user_id);
CREATE INDEX IF NOT EXISTS idx_thesis_symbol ON public.thesis(symbol);
CREATE INDEX IF NOT EXISTS idx_thesis_status ON public.thesis(status);
CREATE INDEX IF NOT EXISTS idx_thesis_conversation_id ON public.thesis(conversation_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_symbol ON public.journal_entries(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_entries_trade_date ON public.journal_entries(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_thesis_id ON public.journal_entries(thesis_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotion_at_entry ON public.journal_entries(emotion_at_entry);

-- ============================================
-- PART 7: ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 8: RLS POLICIES
-- ============================================

-- Conversations
DO $$ BEGIN
CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages
DO $$ BEGIN
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User Preferences
DO $$ BEGIN
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Watchlists
DO $$ BEGIN
CREATE POLICY "Users can view their own watchlists" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own watchlists" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own watchlists" ON public.watchlists FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own watchlists" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Price Alerts
DO $$ BEGIN
CREATE POLICY "Users can view their own price alerts" ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own price alerts" ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own price alerts" ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own price alerts" ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chart Layouts
DO $$ BEGIN
CREATE POLICY "Users can view their own chart layouts" ON public.chart_layouts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own chart layouts" ON public.chart_layouts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own chart layouts" ON public.chart_layouts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own chart layouts" ON public.chart_layouts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trade Journal
DO $$ BEGIN
CREATE POLICY "Users can view their own trade journal" ON public.trade_journal FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own trade journal entries" ON public.trade_journal FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own trade journal entries" ON public.trade_journal FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own trade journal entries" ON public.trade_journal FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Thesis
DO $$ BEGIN
CREATE POLICY "Users can view their own theses" ON public.thesis FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own theses" ON public.thesis FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own theses" ON public.thesis FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own theses" ON public.thesis FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Journal Entries
DO $$ BEGIN
CREATE POLICY "Users can view their own journal entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create their own journal entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update their own journal entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete their own journal entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- PART 9: TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlists_updated_at ON public.watchlists;
CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_layouts_updated_at ON public.chart_layouts;
CREATE TRIGGER update_chart_layouts_updated_at
  BEFORE UPDATE ON public.chart_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_thesis_updated_at ON public.thesis;
CREATE TRIGGER update_thesis_updated_at
  BEFORE UPDATE ON public.thesis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 10: HELPER FUNCTIONS FOR DEFAULTS
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.watchlists
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_watchlist_trigger ON public.watchlists;
CREATE TRIGGER ensure_single_default_watchlist_trigger
  BEFORE INSERT OR UPDATE ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_watchlist();

CREATE OR REPLACE FUNCTION ensure_single_default_chart_layout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.chart_layouts
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_chart_layout_trigger ON public.chart_layouts;
CREATE TRIGGER ensure_single_default_chart_layout_trigger
  BEFORE INSERT OR UPDATE ON public.chart_layouts
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_chart_layout();

-- ============================================
-- DONE! DeepStack tables created.
-- ============================================
