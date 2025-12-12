-- DeepStack Embeddings Table Migration
-- Stores vector embeddings for semantic search across user content
-- Supports RAG system for personalized AI insights

-- ============================================
-- EMBEDDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN (
    'journal_entry', 'thesis', 'message', 'pattern_insight'
  )),
  source_id UUID NOT NULL,

  -- Content and embedding
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA256 hash for change detection
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension

  -- Optional context
  symbol TEXT, -- Trading symbol if applicable
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- HNSW index for fast approximate nearest neighbor search (cosine similarity)
-- HNSW provides better query performance than IVFFlat for most use cases
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_hnsw
  ON public.embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id
  ON public.embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_source_type
  ON public.embeddings(source_type);

CREATE INDEX IF NOT EXISTS idx_embeddings_source_id
  ON public.embeddings(source_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_symbol
  ON public.embeddings(symbol)
  WHERE symbol IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_embeddings_content_hash
  ON public.embeddings(content_hash);

-- Unique composite index to prevent duplicate embeddings for same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_user_source_unique
  ON public.embeddings(user_id, source_type, source_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: EMBEDDINGS
-- ============================================
CREATE POLICY "Users can view their own embeddings"
  ON public.embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own embeddings"
  ON public.embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
  ON public.embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
  ON public.embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================
-- Performs semantic similarity search on embeddings
-- Returns top matches based on cosine similarity
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source_types TEXT[] DEFAULT NULL,
  filter_symbol TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id UUID,
  content_text TEXT,
  symbol TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.content_text,
    e.symbol,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE e.user_id = match_user_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND (filter_symbol IS NULL OR e.symbol = filter_symbol)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_embeddings_updated_at ON public.embeddings;
CREATE TRIGGER update_embeddings_updated_at
  BEFORE UPDATE ON public.embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.embeddings IS 'Stores vector embeddings for semantic search across user content';
COMMENT ON COLUMN public.embeddings.source_type IS 'Type of source document: journal_entry, thesis, message, pattern_insight';
COMMENT ON COLUMN public.embeddings.content_hash IS 'SHA256 hash of content_text for detecting changes';
COMMENT ON COLUMN public.embeddings.embedding IS '1536-dimensional vector from OpenAI text-embedding-3-small model';
COMMENT ON FUNCTION match_embeddings IS 'Semantic similarity search returning top matches above threshold';
