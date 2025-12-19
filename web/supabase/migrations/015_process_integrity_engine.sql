-- DeepStack Process Integrity Engine Migration
-- Expands the Emotional Firewall to track Research Quality, Time-in-Thesis, and Conviction Integrity
-- Provides graduated friction before trade execution based on process metrics

-- ============================================
-- ALTER THESIS TABLE - Add Process Integrity Fields
-- ============================================
ALTER TABLE public.thesis
ADD COLUMN IF NOT EXISTS first_mentioned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS research_quality_score INTEGER DEFAULT 0 CHECK (research_quality_score >= 0 AND research_quality_score <= 100),
ADD COLUMN IF NOT EXISTS conviction_score INTEGER DEFAULT 50 CHECK (conviction_score >= 0 AND conviction_score <= 100),
ADD COLUMN IF NOT EXISTS is_implicit_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promoted_to_explicit_at TIMESTAMPTZ;

-- ============================================
-- RESEARCH SESSIONS TABLE
-- Track research activity during thesis development
-- ============================================
CREATE TABLE IF NOT EXISTS public.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Tool usage tracking (JSONB for flexibility)
  -- Example: [{"tool": "analyze_stock", "count": 3, "symbols": ["NVDA", "AMD"]}]
  tool_usage JSONB DEFAULT '[]'::jsonb,

  -- Quality metrics (calculated on session end)
  tools_used_count INTEGER DEFAULT 0,
  unique_tools_used INTEGER DEFAULT 0,
  devils_advocate_engaged BOOLEAN DEFAULT false,
  assumptions_documented INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for research_sessions
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_thesis_id ON public.research_sessions(thesis_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_started_at ON public.research_sessions(started_at DESC);

-- RLS for research_sessions
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own research sessions"
  ON public.research_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research sessions"
  ON public.research_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research sessions"
  ON public.research_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research sessions"
  ON public.research_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- THESIS EVOLUTION TABLE
-- Track thesis lifecycle for Time-in-Thesis calculation
-- ============================================
CREATE TABLE IF NOT EXISTS public.thesis_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE CASCADE NOT NULL,

  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN (
    'implicit_mention',   -- First detected mention in chat
    'explicit_creation',  -- User explicitly creates thesis
    'hypothesis_refined', -- Hypothesis text changed
    'targets_updated',    -- Entry/exit/stop changed
    'conditions_added',   -- Key conditions modified
    'status_changed',     -- Status transition
    'conviction_recorded' -- Conviction statement captured
  )),

  -- Event details
  previous_value TEXT,
  new_value TEXT,
  message_id UUID,         -- Link to chat message if applicable
  confidence_delta FLOAT,  -- Change in conviction score

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for thesis_evolution
CREATE INDEX IF NOT EXISTS idx_thesis_evolution_user_id ON public.thesis_evolution(user_id);
CREATE INDEX IF NOT EXISTS idx_thesis_evolution_thesis_id ON public.thesis_evolution(thesis_id);
CREATE INDEX IF NOT EXISTS idx_thesis_evolution_event_type ON public.thesis_evolution(event_type);
CREATE INDEX IF NOT EXISTS idx_thesis_evolution_created_at ON public.thesis_evolution(created_at DESC);

-- RLS for thesis_evolution
ALTER TABLE public.thesis_evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thesis evolution"
  ON public.thesis_evolution FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own thesis evolution"
  ON public.thesis_evolution FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thesis evolution"
  ON public.thesis_evolution FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CONVICTION ANALYSIS TABLE
-- Store NLP-based conviction scores over time
-- ============================================
CREATE TABLE IF NOT EXISTS public.conviction_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE CASCADE NOT NULL,

  -- Source of the statement
  statement_text TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('chat', 'thesis_hypothesis', 'journal')),
  source_id UUID,

  -- NLP Analysis Results
  conviction_score FLOAT NOT NULL CHECK (conviction_score >= 0 AND conviction_score <= 100),
  -- Example certainty: ["will definitely", "I'm certain", "no doubt"]
  certainty_indicators JSONB DEFAULT '[]'::jsonb,
  -- Example hedging: ["might", "perhaps", "could be"]
  hedging_indicators JSONB DEFAULT '[]'::jsonb,

  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conviction_analysis
CREATE INDEX IF NOT EXISTS idx_conviction_analysis_user_id ON public.conviction_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_conviction_analysis_thesis_id ON public.conviction_analysis(thesis_id);
CREATE INDEX IF NOT EXISTS idx_conviction_analysis_analyzed_at ON public.conviction_analysis(analyzed_at DESC);

-- RLS for conviction_analysis
ALTER TABLE public.conviction_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conviction analysis"
  ON public.conviction_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conviction analysis"
  ON public.conviction_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conviction analysis"
  ON public.conviction_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PROCESS OVERRIDES TABLE
-- Log all friction overrides for learning and accountability
-- ============================================
CREATE TABLE IF NOT EXISTS public.process_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thesis_id UUID REFERENCES public.thesis(id) ON DELETE SET NULL,

  -- Override context
  friction_level TEXT NOT NULL CHECK (friction_level IN ('soft', 'medium', 'hard')),
  friction_reason TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'research_quality',
    'time_in_thesis',
    'conviction_integrity',
    'emotional_firewall',
    'combined'
  )),

  -- Scores at time of override
  -- Example: {"research_quality": 35, "time_in_thesis_hours": 2, "conviction": 82}
  scores_snapshot JSONB NOT NULL,

  -- User response
  override_confirmed BOOLEAN NOT NULL,
  user_reasoning TEXT,

  -- Context
  action_attempted TEXT, -- e.g., "place_paper_trade"
  symbol TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for process_overrides
CREATE INDEX IF NOT EXISTS idx_process_overrides_user_id ON public.process_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_process_overrides_thesis_id ON public.process_overrides(thesis_id);
CREATE INDEX IF NOT EXISTS idx_process_overrides_dimension ON public.process_overrides(dimension);
CREATE INDEX IF NOT EXISTS idx_process_overrides_created_at ON public.process_overrides(created_at DESC);

-- RLS for process_overrides
ALTER TABLE public.process_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own process overrides"
  ON public.process_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own process overrides"
  ON public.process_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get latest conviction score for a thesis
CREATE OR REPLACE FUNCTION get_latest_conviction_score(p_thesis_id UUID)
RETURNS FLOAT AS $$
  SELECT conviction_score
  FROM public.conviction_analysis
  WHERE thesis_id = p_thesis_id
  ORDER BY analyzed_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to count recent overrides for escalation logic
CREATE OR REPLACE FUNCTION count_recent_overrides(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.process_overrides
  WHERE user_id = p_user_id
    AND override_confirmed = true
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- Function to calculate time in thesis (hours)
CREATE OR REPLACE FUNCTION get_thesis_hours(p_thesis_id UUID)
RETURNS FLOAT AS $$
  SELECT EXTRACT(EPOCH FROM (NOW() - COALESCE(first_mentioned_at, created_at))) / 3600
  FROM public.thesis
  WHERE id = p_thesis_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- VIEW: Process Integrity Summary
-- Aggregated view for quick access to all metrics
-- ============================================
CREATE OR REPLACE VIEW public.process_integrity_summary AS
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

-- Grant access to authenticated users (view uses RLS from underlying tables)
GRANT SELECT ON public.process_integrity_summary TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.research_sessions IS 'Tracks research activity during thesis development for Research Quality scoring';
COMMENT ON TABLE public.thesis_evolution IS 'Tracks thesis lifecycle events for Time-in-Thesis calculation';
COMMENT ON TABLE public.conviction_analysis IS 'Stores NLP-based conviction scores from user statements';
COMMENT ON TABLE public.process_overrides IS 'Logs all friction overrides for learning and accountability';
COMMENT ON VIEW public.process_integrity_summary IS 'Aggregated view of all process integrity metrics per thesis';

COMMENT ON COLUMN public.thesis.first_mentioned_at IS 'Timestamp of first implicit or explicit mention (for Time-in-Thesis)';
COMMENT ON COLUMN public.thesis.research_quality_score IS 'Calculated score 0-100 based on research activity';
COMMENT ON COLUMN public.thesis.conviction_score IS 'Latest NLP-derived conviction score 0-100';
COMMENT ON COLUMN public.thesis.is_implicit_draft IS 'True if thesis was auto-created from chat mention';
COMMENT ON COLUMN public.thesis.promoted_to_explicit_at IS 'When user explicitly confirmed an implicit thesis';
