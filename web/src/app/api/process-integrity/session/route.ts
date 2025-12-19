/**
 * Research Session API
 *
 * POST /api/process-integrity/session
 *
 * Manages research sessions for tracking tool usage and research quality.
 * Actions: start, end, record_tool, record_assumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateResearchQuality, isDevilsAdvocateTool, ToolUsageRecord } from '@/lib/process-integrity';

export const runtime = 'nodejs';
export const maxDuration = 10;

type SessionAction = 'start' | 'end' | 'record_tool' | 'record_assumption' | 'set_devils_advocate';

interface SessionRequest {
  action: SessionAction;
  sessionId?: string;
  thesisId?: string;
  conversationId?: string;
  toolName?: string;
  symbol?: string;
}

export async function POST(request: NextRequest) {
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

    const body: SessionRequest = await request.json();
    const { action, sessionId, thesisId, conversationId, toolName, symbol } = body;

    switch (action) {
      case 'start': {
        // Start a new research session
        const { data: session, error } = await supabase
          .from('research_sessions')
          .insert({
            user_id: user.id,
            thesis_id: thesisId || null,
            conversation_id: conversationId || null,
            started_at: new Date().toISOString(),
            tool_usage: [],
            tools_used_count: 0,
            unique_tools_used: 0,
            devils_advocate_engaged: false,
            assumptions_documented: 0,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          action: 'started',
          sessionId: session.id,
        });
      }

      case 'end': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId required for end action' },
            { status: 400 }
          );
        }

        // End the session and calculate final score
        const { data: session, error: fetchError } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        // Update with end time
        const { error: updateError } = await supabase
          .from('research_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        // Calculate research quality
        const qualityResult = calculateResearchQuality({
          id: session.id,
          userId: session.user_id,
          thesisId: session.thesis_id,
          conversationId: session.conversation_id,
          startedAt: new Date(session.started_at),
          endedAt: new Date(),
          toolUsage: session.tool_usage || [],
          toolsUsedCount: session.tools_used_count || 0,
          uniqueToolsUsed: session.unique_tools_used || 0,
          devilsAdvocateEngaged: session.devils_advocate_engaged || false,
          assumptionsDocumented: session.assumptions_documented || 0,
        });

        // Update thesis with research quality score if linked
        if (session.thesis_id) {
          await supabase
            .from('thesis')
            .update({ research_quality_score: qualityResult.score })
            .eq('id', session.thesis_id);
        }

        return NextResponse.json({
          success: true,
          action: 'ended',
          sessionId,
          qualityScore: qualityResult.score,
          breakdown: qualityResult.breakdown,
          recommendations: qualityResult.recommendations,
        });
      }

      case 'record_tool': {
        if (!sessionId || !toolName) {
          return NextResponse.json(
            { error: 'sessionId and toolName required for record_tool action' },
            { status: 400 }
          );
        }

        // Get current session
        const { data: session, error: fetchError } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        // Update tool usage
        const toolUsage: ToolUsageRecord[] = session.tool_usage || [];
        const existingTool = toolUsage.find((t) => t.tool === toolName);

        if (existingTool) {
          existingTool.count++;
          if (symbol && !existingTool.symbols?.includes(symbol)) {
            existingTool.symbols = [...(existingTool.symbols || []), symbol];
          }
        } else {
          toolUsage.push({
            tool: toolName,
            count: 1,
            symbols: symbol ? [symbol] : [],
            timestamp: new Date().toISOString(),
          });
        }

        // Check if devil's advocate tool
        const devilsAdvocate = session.devils_advocate_engaged || isDevilsAdvocateTool(toolName);

        // Calculate unique tools
        const uniqueTools = new Set(toolUsage.map((t) => t.tool)).size;
        const totalCount = toolUsage.reduce((sum, t) => sum + t.count, 0);

        // Update session
        const { error: updateError } = await supabase
          .from('research_sessions')
          .update({
            tool_usage: toolUsage,
            tools_used_count: totalCount,
            unique_tools_used: uniqueTools,
            devils_advocate_engaged: devilsAdvocate,
          })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          action: 'tool_recorded',
          toolName,
          totalTools: totalCount,
          uniqueTools,
          devilsAdvocateEngaged: devilsAdvocate,
        });
      }

      case 'record_assumption': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId required for record_assumption action' },
            { status: 400 }
          );
        }

        // Increment assumptions count
        const { data: session, error: fetchError } = await supabase
          .from('research_sessions')
          .select('assumptions_documented')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        const newCount = (session.assumptions_documented || 0) + 1;

        const { error: updateError } = await supabase
          .from('research_sessions')
          .update({ assumptions_documented: newCount })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          action: 'assumption_recorded',
          assumptionsDocumented: newCount,
        });
      }

      case 'set_devils_advocate': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId required for set_devils_advocate action' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('research_sessions')
          .update({ devils_advocate_engaged: true })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          action: 'devils_advocate_set',
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Research session error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process session action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve active session
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
    const conversationId = searchParams.get('conversationId');

    // Find active session (not ended)
    let query = supabase
      .from('research_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);

    if (thesisId) {
      query = query.eq('thesis_id', thesisId);
    }
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: session, error } = await query.single();

    if (error || !session) {
      return NextResponse.json({
        success: true,
        active: false,
        session: null,
      });
    }

    // Calculate current quality score
    const qualityResult = calculateResearchQuality({
      id: session.id,
      userId: session.user_id,
      thesisId: session.thesis_id,
      conversationId: session.conversation_id,
      startedAt: new Date(session.started_at),
      endedAt: null,
      toolUsage: session.tool_usage || [],
      toolsUsedCount: session.tools_used_count || 0,
      uniqueToolsUsed: session.unique_tools_used || 0,
      devilsAdvocateEngaged: session.devils_advocate_engaged || false,
      assumptionsDocumented: session.assumptions_documented || 0,
    });

    return NextResponse.json({
      success: true,
      active: true,
      session: {
        ...session,
        currentQualityScore: qualityResult.score,
        breakdown: qualityResult.breakdown,
        recommendations: qualityResult.recommendations,
      },
    });
  } catch (error) {
    console.error('Failed to get active session:', error);
    return NextResponse.json(
      { error: 'Failed to get active session' },
      { status: 500 }
    );
  }
}
