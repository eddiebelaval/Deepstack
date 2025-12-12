/**
 * Search API Route
 *
 * Provides semantic and hybrid search endpoints for querying
 * the user's knowledge base (embeddings).
 *
 * POST /api/search
 * Body: {
 *   query: string,
 *   mode?: 'semantic' | 'hybrid',
 *   limit?: number,
 *   threshold?: number,
 *   sourceTypes?: SourceType[],
 *   symbol?: string
 * }
 *
 * Response: {
 *   results: SearchResult[],
 *   count: number,
 *   mode: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { semanticSearch, hybridSearch } from '@/lib/embeddings/retrieval-service';
import type { SourceType } from '@/lib/embeddings/types';

// Validation schema for search request
const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  mode: z.enum(['semantic', 'hybrid']).default('hybrid'),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  sourceTypes: z.array(
    z.enum(['journal_entry', 'thesis', 'message', 'pattern_insight'])
  ).optional(),
  symbol: z.string().max(10).optional(),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * Helper to get authenticated user or return 401 response
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * POST /api/search
 *
 * Search the user's knowledge base using semantic or hybrid search
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate request body
    const validation = searchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid request data',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const params: SearchRequest = validation.data;

    // Build search options
    const searchOptions = {
      limit: params.limit,
      threshold: params.threshold,
      sourceTypes: params.sourceTypes as SourceType[] | undefined,
      symbol: params.symbol,
    };

    // Execute search based on mode
    let results;
    if (params.mode === 'semantic') {
      results = await semanticSearch(user!.id, params.query, searchOptions);
    } else {
      // Default to hybrid search (recommended)
      results = await hybridSearch(user!.id, params.query, searchOptions);
    }

    return NextResponse.json({
      results,
      count: results.length,
      mode: params.mode,
    });
  } catch (error) {
    console.error('Search API error:', error);

    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Failed to parse request body',
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Search failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search
 *
 * Not implemented - search requires POST with query parameters
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to perform searches',
    },
    { status: 405 }
  );
}
