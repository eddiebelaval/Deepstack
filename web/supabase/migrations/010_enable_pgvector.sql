-- DeepStack pgvector Extension Migration
-- Enables vector similarity search for RAG (Retrieval Augmented Generation)
-- Required for semantic search across journal entries, theses, and trading insights

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
-- pgvector provides vector similarity search capabilities
-- Used with nomic-embed-text model (768 dimensions)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
