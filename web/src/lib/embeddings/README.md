# DeepStack Embeddings - RAG System Documentation

Complete vector embedding pipeline for semantic search and retrieval-augmented generation (RAG) in DeepStack.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EMBEDDING PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Content Sources                                          │
│     ├─ Journal Entries (trades, notes, lessons)             │
│     ├─ Theses (investment hypotheses)                        │
│     ├─ Chat Messages (user conversations)                    │
│     └─ Pattern Insights (detected patterns)                  │
│                                                              │
│  2. Content Processing                                       │
│     ├─ Extract & Format Text                                │
│     ├─ Generate SHA-256 Hash                                │
│     └─ Detect Changes                                        │
│                                                              │
│  3. Embedding Generation                                     │
│     ├─ Ollama API (localhost:11434)                         │
│     ├─ Model: nomic-embed-text                              │
│     └─ Dimensions: 768                                       │
│                                                              │
│  4. Vector Storage                                           │
│     ├─ Supabase PostgreSQL + pgvector                       │
│     ├─ HNSW Index (cosine similarity)                       │
│     └─ RLS Policies (user isolation)                        │
│                                                              │
│  5. Retrieval                                                │
│     ├─ Semantic Search (vector similarity)                  │
│     ├─ Keyword Search (full-text search)                    │
│     └─ Hybrid Search (RRF fusion)                           │
│                                                              │
│  6. RAG Context Builder                                      │
│     ├─ Fetch Relevant Results                               │
│     ├─ Format for LLM Prompts                               │
│     └─ Token Budget Management                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/lib/embeddings/
├── types.ts                    # Type definitions
├── ollama-client.ts           # Ollama API client
├── embedding-service.ts       # Embedding generation & storage
├── retrieval-service.ts       # Search functions
├── context-builder.ts         # RAG context formatting
├── index.ts                   # Public API exports
└── README.md                  # This file

src/app/api/embeddings/
└── route.ts                   # Embedding generation endpoints

src/app/api/search/
└── route.ts                   # Search endpoints
```

## Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Start Ollama server
ollama serve
```

### 2. Pull the Embedding Model

```bash
ollama pull nomic-embed-text
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBED_MODEL="nomic-embed-text"
```

### 4. Run Database Migration

The embeddings table is already created via migration `011_create_embeddings_table.sql`.

Verify pgvector is enabled:

```sql
-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embeddings table exists
\d embeddings;
```

## Usage Examples

### 1. Generate Embedding for Journal Entry

```typescript
import { upsertEmbedding } from '@/lib/embeddings';

// Create/update embedding
await upsertEmbedding(userId, {
  sourceType: 'journal_entry',
  sourceId: entryId,
  content: {
    symbol: 'AAPL',
    direction: 'long',
    entryPrice: 150.25,
    exitPrice: 155.80,
    emotionAtEntry: 'confident',
    emotionAtExit: 'satisfied',
    notes: 'Clean breakout above resistance with strong volume',
    lessonsLearned: 'Patience paid off - waited for confirmation',
    tradeDate: '2024-12-10T10:30:00Z',
  },
});
```

### 2. Generate Embedding for Thesis

```typescript
await upsertEmbedding(userId, {
  sourceType: 'thesis',
  sourceId: thesisId,
  content: {
    symbol: 'NVDA',
    title: 'AI Infrastructure Play',
    content: 'NVIDIA positioned as picks-and-shovels play in AI revolution...',
    conviction: 'high',
    tags: ['ai', 'semiconductors', 'growth'],
  },
});
```

### 3. Semantic Search

```typescript
import { semanticSearch } from '@/lib/embeddings';

const results = await semanticSearch(userId, 'What were my best AAPL trades?', {
  threshold: 0.75,        // Minimum 75% similarity
  limit: 10,              // Top 10 results
  symbol: 'AAPL',         // Filter by symbol
  sourceTypes: ['journal_entry'], // Only journal entries
});

results.forEach((result) => {
  console.log(`${result.sourceType} - ${result.similarity * 100}% match`);
  console.log(result.contentText);
});
```

### 4. Hybrid Search (Recommended)

```typescript
import { hybridSearch } from '@/lib/embeddings';

// Combines semantic + keyword search using Reciprocal Rank Fusion
const results = await hybridSearch(
  userId,
  'bearish thesis technical breakdown',
  {
    limit: 5,
    threshold: 0.7,
  }
);
```

### 5. Build RAG Context for Chat

```typescript
import { buildRAGContext } from '@/lib/embeddings';

const context = await buildRAGContext(
  userId,
  'What lessons have I learned from my TSLA trades?',
  {
    maxTokens: 4000,      // Token budget
    symbol: 'TSLA',       // Filter by symbol
    sourceTypes: ['journal_entry'], // Only journal entries
  }
);

// Use in LLM prompt
const prompt = `
${context.contextText}

User Question: ${userQuery}

Please answer based on the context above.
`;

console.log(`Token estimate: ${context.tokenEstimate}`);
console.log(`Sources: ${context.sources.length}`);
```

### 6. Search API Endpoint

```typescript
// Search via API (recommended for frontend)
const response = await fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What were my best trades?',
    mode: 'hybrid',           // 'semantic' or 'hybrid'
    limit: 10,
    threshold: 0.7,
    sourceTypes: ['journal_entry', 'thesis'],
    symbol: 'AAPL',           // Optional
  }),
});

const { results, count, mode } = await response.json();
// results: SearchResult[]
// count: number
// mode: 'semantic' | 'hybrid'
```

### 7. Embedding Generation API

```typescript
// Generate embedding via API
const response = await fetch('/api/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceType: 'journal_entry',
    sourceId: 'uuid-here',
  }),
});

const result = await response.json();
// { success: true, embedded: true, message: '...' }

// Health check
const health = await fetch('/api/embeddings');
const status = await health.json();
// { healthy: true, message: 'Embedding service is healthy' }
```

### 8. Delete Embedding

```typescript
import { deleteEmbedding } from '@/lib/embeddings';

await deleteEmbedding(userId, 'journal_entry', entryId);
```

## Content Builders

Each source type has a specialized content builder that extracts and formats relevant text:

### Journal Entry Builder
Includes: symbol, direction, prices, P&L, emotions, notes, lessons learned

### Thesis Builder
Includes: symbol, title, conviction, tags, full thesis content

### Message Builder
Includes: role (user/assistant), context, message content

### Pattern Insight Builder
Includes: pattern name, confidence, related symbols, insight text

## Change Detection

Embeddings use SHA-256 content hashing to detect changes:

1. Generate hash of formatted content text
2. Check if hash exists in database
3. If hash matches, skip re-embedding (saves API calls)
4. If hash differs, generate new embedding and update record

## Performance Considerations

### HNSW Index Parameters
- `m = 16`: Number of bi-directional links (affects recall)
- `ef_construction = 64`: Construction time quality factor

### Search Thresholds
- **0.85+**: Very high similarity (near-exact matches)
- **0.75-0.85**: High similarity (strong semantic match)
- **0.70-0.75**: Moderate similarity (related content)
- **Below 0.70**: Low similarity (may not be relevant)

### Token Budgets
- Default RAG context: 4000 tokens (~16,000 characters)
- Adjust based on LLM context window
- Use `estimateTokens()` for budget planning

## Error Handling

All embedding functions handle errors gracefully:

```typescript
// Service functions return null on failure
const result = await upsertEmbedding(userId, input);
if (!result) {
  console.error('Embedding failed');
}

// Search functions return empty array on failure
const results = await semanticSearch(userId, query);
if (results.length === 0) {
  console.log('No results found or search failed');
}

// Health check returns boolean
const healthy = await checkOllamaHealth();
if (!healthy) {
  console.warn('Ollama service unavailable');
}
```

## Database Schema

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source_type TEXT CHECK (source_type IN (
    'journal_entry', 'thesis', 'message', 'pattern_insight'
  )),
  source_id UUID,
  content_text TEXT,
  content_hash TEXT,  -- SHA-256 for change detection
  embedding vector(768),  -- nomic-embed-text dimension
  symbol TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(user_id, source_type, source_id)
);

-- HNSW index for fast similarity search
CREATE INDEX idx_embeddings_embedding_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

## RPC Functions

### match_embeddings()
Performs vector similarity search with filters:

```sql
SELECT * FROM match_embeddings(
  query_embedding := '[0.1, 0.2, ...]'::vector(768),
  match_user_id := 'user-uuid',
  match_threshold := 0.7,
  match_count := 10,
  filter_source_types := ARRAY['journal_entry', 'thesis'],
  filter_symbol := 'AAPL'
);
```

## Testing

### 1. Health Check

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check if model is available
curl http://localhost:11434/api/tags | grep nomic-embed-text
```

### 2. Test Embedding Generation

```typescript
import { ollamaClient } from '@/lib/embeddings';

const embedding = await ollamaClient.embed('Test text');
console.log(`Embedding dimensions: ${embedding.length}`); // Should be 768
```

### 3. Test API Endpoint

```bash
# Health check
curl http://localhost:3000/api/embeddings \
  -H "Cookie: sb-access-token=..."

# Generate embedding
curl -X POST http://localhost:3000/api/embeddings \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"sourceType":"journal_entry","sourceId":"uuid-here"}'
```

## Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
lsof -i :11434

# Start Ollama
ollama serve
```

### Model Not Found
```bash
# List installed models
ollama list

# Pull nomic-embed-text
ollama pull nomic-embed-text
```

### pgvector Extension Missing
```sql
-- Enable pgvector (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;
```

### Slow Search Performance
- Check HNSW index exists: `\di+ idx_embeddings_embedding_hnsw`
- Increase `m` parameter for better recall (slower build)
- Lower `match_threshold` to reduce result set

### Memory Issues with Large Batches
- Limit batch size to 100 texts max
- Process in chunks for large datasets
- Use streaming for real-time embedding

## Roadmap

- [ ] Automatic embedding on content creation/update (database triggers)
- [ ] Batch embedding CLI for historical data
- [ ] Embedding analytics dashboard
- [ ] Multi-modal embeddings (images, charts)
- [ ] Embedding versioning (model upgrades)
- [ ] Embedding compression (PQ, HNSW optimizations)

## References

- [Ollama Documentation](https://ollama.ai/docs)
- [nomic-embed-text Model](https://ollama.ai/library/nomic-embed-text)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
