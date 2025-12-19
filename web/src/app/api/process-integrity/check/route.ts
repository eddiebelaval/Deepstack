/**
 * Process Integrity Check API
 *
 * POST /api/process-integrity/check
 *
 * Checks all process integrity dimensions for a trade:
 * - Research Quality
 * - Time-in-Thesis
 * - Conviction Integrity
 *
 * Returns friction level and recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkProcessIntegrity,
  calculateResearchQuality,
  calculateTimeMetricsFromDb,
  generateConvictionResult,
  ResearchSession,
  ConvictionAnalysisRecord,
  FRICTION_THRESHOLDS,
} from '@/lib/process-integrity';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface CheckRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  thesisId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CheckRequest = await request.json();
    const { symbol, action, thesisId } = body;

    if (!symbol || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, action' },
        { status: 400 }
      );
    }

    // Find thesis for this symbol if not provided
    let effectiveThesisId = thesisId;
    if (!effectiveThesisId) {
      const { data: thesis } = await supabase
        .from('thesis')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol.toUpperCase())
        .in('status', ['drafting', 'active'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      effectiveThesisId = thesis?.id;
    }

    // Get thesis details if we have one
    let thesisData = null;
    let evolutionEventCount = 0;
    if (effectiveThesisId) {
      const { data: thesis } = await supabase
        .from('thesis')
        .select('*')
        .eq('id', effectiveThesisId)
        .single();

      thesisData = thesis;

      // Count evolution events
      const { count } = await supabase
        .from('thesis_evolution')
        .select('*', { count: 'exact', head: true })
        .eq('thesis_id', effectiveThesisId);

      evolutionEventCount = count || 0;
    }

    // Get research sessions for this thesis
    let researchQualityResult;
    if (effectiveThesisId) {
      const { data: sessions } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('thesis_id', effectiveThesisId)
        .order('started_at', { ascending: false });

      if (sessions && sessions.length > 0) {
        // Convert to ResearchSession type
        const typedSessions: ResearchSession[] = sessions.map((s) => ({
          id: s.id,
          userId: s.user_id,
          thesisId: s.thesis_id,
          conversationId: s.conversation_id,
          startedAt: new Date(s.started_at),
          endedAt: s.ended_at ? new Date(s.ended_at) : null,
          toolUsage: s.tool_usage || [],
          toolsUsedCount: s.tools_used_count || 0,
          uniqueToolsUsed: s.unique_tools_used || 0,
          devilsAdvocateEngaged: s.devils_advocate_engaged || false,
          assumptionsDocumented: s.assumptions_documented || 0,
        }));

        // Calculate from most recent session
        researchQualityResult = calculateResearchQuality(typedSessions[0]);
      }
    }

    // Default research quality if no sessions
    if (!researchQualityResult) {
      researchQualityResult = {
        score: 0,
        breakdown: {
          toolUsage: 0,
          devilsAdvocate: 0,
          assumptions: 0,
          timeSpent: 0,
        },
        recommendations: [
          'No research sessions found. Start by analyzing the stock and building your thesis.',
        ],
      };
    }

    // Calculate time metrics
    const timeMetrics = calculateTimeMetricsFromDb(
      thesisData?.first_mentioned_at || null,
      thesisData?.promoted_to_explicit_at || null,
      thesisData?.created_at || new Date().toISOString(),
      evolutionEventCount
    );

    // Get conviction history and calculate
    let convictionResult;
    if (effectiveThesisId) {
      const { data: convictionHistory } = await supabase
        .from('conviction_analysis')
        .select('*')
        .eq('thesis_id', effectiveThesisId)
        .order('analyzed_at', { ascending: true });

      const typedHistory: ConvictionAnalysisRecord[] = (convictionHistory || []).map(
        (c) => ({
          id: c.id,
          userId: c.user_id,
          thesisId: c.thesis_id,
          statementText: c.statement_text,
          sourceType: c.source_type,
          sourceId: c.source_id,
          convictionScore: c.conviction_score,
          certaintyIndicators: c.certainty_indicators || [],
          hedgingIndicators: c.hedging_indicators || [],
          analyzedAt: new Date(c.analyzed_at),
        })
      );

      // Use thesis hypothesis for current statement, or default
      const currentStatement = thesisData?.hypothesis || '';
      convictionResult = generateConvictionResult(currentStatement, typedHistory);
    }

    // Default conviction if no history
    if (!convictionResult) {
      convictionResult = {
        score: 50,
        certaintyIndicators: [],
        hedgingIndicators: [],
        trend: 'stable' as const,
        previousScore: null,
        swing: 0,
      };
    }

    // Count recent overrides
    const { count: recentOverrides } = await supabase
      .from('process_overrides')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('override_confirmed', true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Perform complete process integrity check
    const result = checkProcessIntegrity(
      researchQualityResult,
      timeMetrics,
      convictionResult,
      recentOverrides || 0
    );

    return NextResponse.json({
      success: true,
      ...result,
      thesisId: effectiveThesisId,
      symbol: symbol.toUpperCase(),
      action,
    });
  } catch (error) {
    console.error('Process integrity check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check process integrity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current integrity state for a thesis
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const thesisId = searchParams.get('thesisId');
    const symbol = searchParams.get('symbol');

    if (!thesisId && !symbol) {
      return NextResponse.json(
        { error: 'Missing thesisId or symbol parameter' },
        { status: 400 }
      );
    }

    // Use the process_integrity_summary view
    let query = supabase
      .from('process_integrity_summary')
      .select('*')
      .eq('user_id', user.id);

    if (thesisId) {
      query = query.eq('thesis_id', thesisId);
    } else if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase());
    }

    const { data, error } = await query.single();

    if (error) {
      // No thesis found - return defaults
      return NextResponse.json({
        success: true,
        found: false,
        researchQualityScore: 0,
        convictionScore: 50,
        hoursInDevelopment: 0,
        maturityLevel: 'nascent',
        evolutionEvents: 0,
        researchSessions: 0,
        recentOverrides: 0,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      ...data,
    });
  } catch (error) {
    console.error('Process integrity get error:', error);
    return NextResponse.json(
      { error: 'Failed to get process integrity state' },
      { status: 500 }
    );
  }
}
