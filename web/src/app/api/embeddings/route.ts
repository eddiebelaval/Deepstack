/**
 * Embeddings API Route
 *
 * Provides manual embedding generation endpoints.
 * Authenticated users can trigger embedding generation for their content.
 *
 * Endpoints:
 * - POST /api/embeddings - Generate embedding for specific source
 *
 * @example
 * ```typescript
 * // Generate embedding for a journal entry
 * const response = await fetch('/api/embeddings', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     sourceType: 'journal_entry',
 *     sourceId: 'uuid-here'
 *   })
 * });
 *
 * const result = await response.json();
 * // { success: true, embedded: true, message: '...' }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  upsertEmbedding,
  type SourceType,
  type JournalEntryContent,
  type ThesisContent,
} from '@/lib/embeddings';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const embedRequestSchema = z.object({
  sourceType: z.enum(['journal_entry', 'thesis', 'message', 'pattern_insight']),
  sourceId: z.string().uuid('Valid source ID is required'),
});

// ============================================
// TYPES
// ============================================

interface EmbedResponse {
  success: boolean;
  embedded: boolean;
  message: string;
  error?: string;
}

// Database row types (snake_case)
interface JournalEntryRow {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  emotion_at_entry: string;
  emotion_at_exit: string | null;
  notes: string | null;
  lessons_learned: string | null;
  trade_date: string;
}

interface ThesisRow {
  id: string;
  symbol: string;
  title: string;
  content: string;
  conviction: string | null;
  tags: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get authenticated user or return 401 response
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { user, supabase, error: null };
}

/**
 * Fetch journal entry and convert to embeddable content
 */
async function fetchJournalEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceId: string
): Promise<JournalEntryContent | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(
      'id, symbol, direction, entry_price, exit_price, emotion_at_entry, emotion_at_exit, notes, lessons_learned, trade_date'
    )
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch journal entry:', error);
    return null;
  }

  const row = data as JournalEntryRow;

  return {
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price ?? undefined,
    emotionAtEntry: row.emotion_at_entry,
    emotionAtExit: row.emotion_at_exit ?? undefined,
    notes: row.notes ?? undefined,
    lessonsLearned: row.lessons_learned ?? undefined,
    tradeDate: row.trade_date,
  };
}

/**
 * Fetch thesis and convert to embeddable content
 */
async function fetchThesis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceId: string
): Promise<ThesisContent | null> {
  const { data, error } = await supabase
    .from('theses')
    .select('id, symbol, title, content, conviction, tags')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch thesis:', error);
    return null;
  }

  const row = data as ThesisRow;

  return {
    symbol: row.symbol,
    title: row.title,
    content: row.content,
    conviction: row.conviction ?? undefined,
    tags: row.tags,
  };
}

// ============================================
// API ROUTES
// ============================================

/**
 * POST - Generate embedding for a specific source
 *
 * Fetches source content, generates embedding, and stores in database.
 */
export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const body = await request.json();

    // Validate request
    const validation = embedRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          embedded: false,
          message: 'Invalid request data',
          error: JSON.stringify(validation.error.format()),
        } as EmbedResponse,
        { status: 400 }
      );
    }

    const { sourceType, sourceId } = validation.data;

    // Fetch source content based on type
    let content: JournalEntryContent | ThesisContent | null = null;

    switch (sourceType) {
      case 'journal_entry': {
        content = await fetchJournalEntry(supabase, user.id, sourceId);
        if (!content) {
          return NextResponse.json(
            {
              success: false,
              embedded: false,
              message: 'Journal entry not found or access denied',
            } as EmbedResponse,
            { status: 404 }
          );
        }
        break;
      }

      case 'thesis': {
        content = await fetchThesis(supabase, user.id, sourceId);
        if (!content) {
          return NextResponse.json(
            {
              success: false,
              embedded: false,
              message: 'Thesis not found or access denied',
            } as EmbedResponse,
            { status: 404 }
          );
        }
        break;
      }

      case 'message':
      case 'pattern_insight':
        return NextResponse.json(
          {
            success: false,
            embedded: false,
            message: `Embedding for ${sourceType} not yet implemented`,
          } as EmbedResponse,
          { status: 501 }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            embedded: false,
            message: `Unknown source type: ${sourceType}`,
          } as EmbedResponse,
          { status: 400 }
        );
    }

    // Generate and store embedding
    const result = await upsertEmbedding(user.id, {
      sourceType: sourceType as 'journal_entry' | 'thesis',
      sourceId,
      content,
    } as Parameters<typeof upsertEmbedding>[1]);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          embedded: false,
          message: 'Failed to generate or store embedding',
        } as EmbedResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      embedded: true,
      message: `Successfully embedded ${sourceType} ${sourceId}`,
    } as EmbedResponse);
  } catch (err) {
    console.error('Unexpected error in POST /api/embeddings:', err);
    return NextResponse.json(
      {
        success: false,
        embedded: false,
        message: 'Internal server error',
        error: err instanceof Error ? err.message : 'Unknown error',
      } as EmbedResponse,
      { status: 500 }
    );
  }
}

/**
 * GET - Health check for embedding service
 *
 * Verifies OpenAI API key is configured for embeddings.
 */
export async function GET() {
  const { error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const { checkEmbeddingServiceHealth } = await import('@/lib/embeddings');
    const isHealthy = checkEmbeddingServiceHealth();

    return NextResponse.json({
      healthy: isHealthy,
      message: isHealthy
        ? 'Embedding service is healthy'
        : 'OpenAI API key not configured',
    });
  } catch (err) {
    console.error('Error checking embedding service health:', err);
    return NextResponse.json(
      {
        healthy: false,
        message: 'Failed to check embedding service health',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
