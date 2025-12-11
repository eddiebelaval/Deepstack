import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Zod schemas for validation
const createJournalEntrySchema = z.object({
    symbol: z.string()
        .min(1, 'Symbol is required')
        .max(10, 'Symbol must be 10 characters or less')
        .transform(s => s.toUpperCase()),
    tradeDate: z.string().datetime().optional(),
    direction: z.enum(['long', 'short']).default('long'),
    entryPrice: z.number().positive('Entry price must be positive').default(0),
    exitPrice: z.number().positive('Exit price must be positive').optional().nullable(),
    quantity: z.number().positive('Quantity must be positive').default(0),
    pnl: z.number().optional().nullable(),
    pnlPercent: z.number().optional().nullable(),
    emotionAtEntry: z.string().default('neutral'),
    emotionAtExit: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    lessonsLearned: z.string().optional().nullable(),
    thesisId: z.string().uuid().optional().nullable(),
    screenshotUrls: z.array(z.string().url()).default([]),
});

const updateJournalEntrySchema = z.object({
    id: z.string().uuid('Valid entry ID is required'),
    symbol: z.string().min(1).max(10).optional(),
    tradeDate: z.string().datetime().optional(),
    direction: z.enum(['long', 'short']).optional(),
    entryPrice: z.number().positive().optional(),
    exitPrice: z.number().positive().optional().nullable(),
    quantity: z.number().positive().optional(),
    pnl: z.number().optional().nullable(),
    pnlPercent: z.number().optional().nullable(),
    emotionAtEntry: z.string().optional(),
    emotionAtExit: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    lessonsLearned: z.string().optional().nullable(),
    thesisId: z.string().uuid().optional().nullable(),
    screenshotUrls: z.array(z.string().url()).optional(),
});

const deleteJournalEntrySchema = z.object({
    id: z.string().uuid('Valid entry ID is required'),
});

// Types matching the journal_entries table (snake_case)
interface JournalEntryRow {
    id: string;
    user_id: string;
    symbol: string;
    trade_date: string;
    direction: 'long' | 'short';
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    pnl: number | null;
    pnl_percent: number | null;
    emotion_at_entry: string;
    emotion_at_exit: string | null;
    notes: string | null;
    lessons_learned: string | null;
    thesis_id: string | null;
    screenshot_urls: string[];
    created_at: string;
    updated_at: string;
}

// Response type (camelCase for API consumers)
interface JournalEntry {
    id: string;
    createdAt: string;
    updatedAt: string;
    symbol: string;
    tradeDate: string;
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    pnl?: number;
    pnlPercent?: number;
    emotionAtEntry: string;
    emotionAtExit?: string;
    notes: string;
    lessonsLearned?: string;
    thesisId?: string;
    screenshotUrls?: string[];
}

// Convert database row (snake_case) to API response (camelCase)
function rowToEntry(row: JournalEntryRow): JournalEntry {
    return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        symbol: row.symbol,
        tradeDate: row.trade_date,
        direction: row.direction,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price ?? undefined,
        quantity: row.quantity,
        pnl: row.pnl ?? undefined,
        pnlPercent: row.pnl_percent ?? undefined,
        emotionAtEntry: row.emotion_at_entry,
        emotionAtExit: row.emotion_at_exit ?? undefined,
        notes: row.notes ?? '',
        lessonsLearned: row.lessons_learned ?? undefined,
        thesisId: row.thesis_id ?? undefined,
        screenshotUrls: row.screenshot_urls ?? [],
    };
}

// Helper to get authenticated user or return 401 response
async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { user: null, supabase, error: NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
        )};
    }

    return { user, supabase, error: null };
}

// GET - List all journal entries for the authenticated user
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
    const { user, supabase, error } = await getAuthenticatedUser();
    if (error) return error;

    try {
        const { data, error: dbError } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('trade_date', { ascending: false });

        if (dbError) {
            console.error('Error fetching journal entries:', dbError);
            return NextResponse.json(
                { error: 'Database error', message: 'Failed to fetch entries' },
                { status: 500 }
            );
        }

        const entries = (data || []).map(rowToEntry);
        return NextResponse.json({ entries });
    } catch (err) {
        console.error('Unexpected error in GET /api/journal:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create a new journal entry for the authenticated user
export async function POST(request: NextRequest) {
    const { user, supabase, error } = await getAuthenticatedUser();
    if (error) return error;

    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = createJournalEntrySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Invalid request data',
                    details: validation.error.format()
                },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Calculate P&L if exit price provided
        let pnl: number | null = null;
        let pnlPercent: number | null = null;

        if (validatedData.exitPrice && validatedData.entryPrice && validatedData.quantity) {
            const multiplier = validatedData.direction === 'long' ? 1 : -1;
            pnl = (validatedData.exitPrice - validatedData.entryPrice) * validatedData.quantity * multiplier;
            pnlPercent = ((validatedData.exitPrice - validatedData.entryPrice) / validatedData.entryPrice) * 100 * multiplier;
        }

        const insertData = {
            user_id: user.id,
            symbol: validatedData.symbol,
            trade_date: validatedData.tradeDate || new Date().toISOString(),
            direction: validatedData.direction,
            entry_price: validatedData.entryPrice,
            exit_price: validatedData.exitPrice ?? null,
            quantity: validatedData.quantity,
            pnl: validatedData.pnl ?? pnl,
            pnl_percent: validatedData.pnlPercent ?? pnlPercent,
            emotion_at_entry: validatedData.emotionAtEntry,
            emotion_at_exit: validatedData.emotionAtExit ?? null,
            notes: validatedData.notes ?? null,
            lessons_learned: validatedData.lessonsLearned ?? null,
            thesis_id: validatedData.thesisId ?? null,
            screenshot_urls: validatedData.screenshotUrls,
        };

        const { data, error: dbError } = await supabase
            .from('journal_entries')
            .insert(insertData)
            .select()
            .single();

        if (dbError) {
            console.error('Error creating journal entry:', dbError);
            return NextResponse.json(
                { error: 'Database error', message: 'Failed to create entry' },
                { status: 500 }
            );
        }

        return NextResponse.json({ entry: rowToEntry(data) }, { status: 201 });
    } catch (err) {
        console.error('Unexpected error in POST /api/journal:', err);
        return NextResponse.json(
            { error: 'Invalid request', message: 'Failed to parse request body' },
            { status: 400 }
        );
    }
}

// PUT - Update an existing journal entry (only if owned by authenticated user)
export async function PUT(request: NextRequest) {
    const { user, supabase, error } = await getAuthenticatedUser();
    if (error) return error;

    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = updateJournalEntrySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Invalid request data',
                    details: validation.error.format()
                },
                { status: 400 }
            );
        }

        const { id, ...updates } = validation.data;

        // Verify the entry exists and belongs to the user
        const { data: existing, error: fetchError } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json(
                { error: 'Not found', message: 'Entry not found or access denied' },
                { status: 404 }
            );
        }

        // Build update object with snake_case keys
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.symbol !== undefined) updateData.symbol = updates.symbol.toUpperCase();
        if (updates.tradeDate !== undefined) updateData.trade_date = updates.tradeDate;
        if (updates.direction !== undefined) updateData.direction = updates.direction;
        if (updates.entryPrice !== undefined) updateData.entry_price = updates.entryPrice;
        if (updates.exitPrice !== undefined) updateData.exit_price = updates.exitPrice;
        if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
        if (updates.pnl !== undefined) updateData.pnl = updates.pnl;
        if (updates.pnlPercent !== undefined) updateData.pnl_percent = updates.pnlPercent;
        if (updates.emotionAtEntry !== undefined) updateData.emotion_at_entry = updates.emotionAtEntry;
        if (updates.emotionAtExit !== undefined) updateData.emotion_at_exit = updates.emotionAtExit;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.lessonsLearned !== undefined) updateData.lessons_learned = updates.lessonsLearned;
        if (updates.thesisId !== undefined) updateData.thesis_id = updates.thesisId;
        if (updates.screenshotUrls !== undefined) updateData.screenshot_urls = updates.screenshotUrls;

        // Recalculate P&L if price fields changed
        if (updateData.exit_price !== undefined || updateData.entry_price !== undefined) {
            // Fetch current values to recalculate
            const { data: current } = await supabase
                .from('journal_entries')
                .select('entry_price, exit_price, quantity, direction')
                .eq('id', id)
                .single();

            if (current) {
                const entryPrice = (updateData.entry_price as number) ?? current.entry_price;
                const exitPrice = (updateData.exit_price as number) ?? current.exit_price;
                const quantity = (updateData.quantity as number) ?? current.quantity;
                const direction = (updateData.direction as string) ?? current.direction;

                if (exitPrice && entryPrice && quantity) {
                    const multiplier = direction === 'long' ? 1 : -1;
                    updateData.pnl = (exitPrice - entryPrice) * quantity * multiplier;
                    updateData.pnl_percent = ((exitPrice - entryPrice) / entryPrice) * 100 * multiplier;
                }
            }
        }

        const { data, error: dbError } = await supabase
            .from('journal_entries')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id) // Extra safety: ensure user owns the entry
            .select()
            .single();

        if (dbError) {
            console.error('Error updating journal entry:', dbError);
            return NextResponse.json(
                { error: 'Database error', message: 'Failed to update entry' },
                { status: 500 }
            );
        }

        return NextResponse.json({ entry: rowToEntry(data) });
    } catch (err) {
        console.error('Unexpected error in PUT /api/journal:', err);
        return NextResponse.json(
            { error: 'Invalid request', message: 'Failed to parse request body' },
            { status: 400 }
        );
    }
}

// DELETE - Remove an entry (only if owned by authenticated user)
export async function DELETE(request: NextRequest) {
    const { user, supabase, error } = await getAuthenticatedUser();
    if (error) return error;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Validate query parameter with Zod
        const validation = deleteJournalEntrySchema.safeParse({ id });

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Valid entry ID is required',
                    details: validation.error.format()
                },
                { status: 400 }
            );
        }

        // Delete only if the entry belongs to the authenticated user
        const { error: dbError, count } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', validation.data.id)
            .eq('user_id', user.id);

        if (dbError) {
            console.error('Error deleting journal entry:', dbError);
            return NextResponse.json(
                { error: 'Database error', message: 'Failed to delete entry' },
                { status: 500 }
            );
        }

        // If count is 0, entry was not found or not owned by user
        if (count === 0) {
            return NextResponse.json(
                { error: 'Not found', message: 'Entry not found or access denied' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Unexpected error in DELETE /api/journal:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
