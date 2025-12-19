/**
 * Process Integrity Override API
 *
 * POST /api/process-integrity/override
 *
 * Logs when a user overrides friction warnings.
 * Overrides are always allowed but always logged for learning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateOverride, FrictionLevel, FrictionDimension } from '@/lib/process-integrity';

export const runtime = 'nodejs';
export const maxDuration = 10;

interface OverrideRequest {
  thesisId?: string;
  frictionLevel: FrictionLevel;
  frictionReason: string;
  dimension: FrictionDimension;
  scoresSnapshot: {
    researchQuality: number;
    timeInThesisHours: number;
    conviction: number;
  };
  confirm: boolean;
  userReasoning?: string;
  actionAttempted: string;
  symbol: string;
  conversationId?: string;
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

    const body: OverrideRequest = await request.json();
    const {
      thesisId,
      frictionLevel,
      frictionReason,
      dimension,
      scoresSnapshot,
      confirm,
      userReasoning,
      actionAttempted,
      symbol,
      conversationId,
    } = body;

    // Validate required fields
    if (!frictionLevel || !frictionReason || !dimension || !scoresSnapshot || !actionAttempted || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the override (hard friction requires reasoning)
    const validation = validateOverride(frictionLevel, userReasoning || null);

    if (!validation.valid && confirm) {
      return NextResponse.json(
        { error: validation.message, requiresReasoning: true },
        { status: 400 }
      );
    }

    // Log the override
    const { data: override, error: insertError } = await supabase
      .from('process_overrides')
      .insert({
        user_id: user.id,
        thesis_id: thesisId || null,
        friction_level: frictionLevel,
        friction_reason: frictionReason,
        dimension,
        scores_snapshot: scoresSnapshot,
        override_confirmed: confirm,
        user_reasoning: userReasoning || null,
        action_attempted: actionAttempted,
        symbol: symbol.toUpperCase(),
        conversation_id: conversationId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to log override:', insertError);
      // Don't block the action if logging fails
      // Just warn and continue
    }

    // Return success - the action can now proceed
    return NextResponse.json({
      success: true,
      overrideId: override?.id,
      confirmed: confirm,
      message: confirm
        ? 'Override confirmed. You may proceed with your action.'
        : 'Override recorded but not confirmed. Action blocked.',
      warning: frictionLevel === 'hard'
        ? 'This action was taken despite strong warnings. Please review the outcome carefully.'
        : undefined,
    });
  } catch (error) {
    console.error('Process integrity override error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process override',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve override history
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
    const days = parseInt(searchParams.get('days') || '30', 10);
    const thesisId = searchParams.get('thesisId');

    let query = supabase
      .from('process_overrides')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (thesisId) {
      query = query.eq('thesis_id', thesisId);
    }

    const { data: overrides, error } = await query;

    if (error) {
      throw error;
    }

    // Aggregate stats
    const stats = {
      total: overrides?.length || 0,
      confirmed: overrides?.filter((o) => o.override_confirmed).length || 0,
      byDimension: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
    };

    for (const override of overrides || []) {
      stats.byDimension[override.dimension] = (stats.byDimension[override.dimension] || 0) + 1;
      stats.byLevel[override.friction_level] = (stats.byLevel[override.friction_level] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      overrides,
      stats,
    });
  } catch (error) {
    console.error('Failed to get override history:', error);
    return NextResponse.json(
      { error: 'Failed to get override history' },
      { status: 500 }
    );
  }
}
