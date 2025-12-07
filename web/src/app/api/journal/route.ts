import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (would be replaced with database)
let journalEntries: JournalEntry[] = [];

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

// GET - List all journal entries
export async function GET() {
    return NextResponse.json({ entries: journalEntries });
}

// POST - Create a new journal entry
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const now = new Date().toISOString();

        const newEntry: JournalEntry = {
            id: `journal-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
            symbol: body.symbol || '',
            tradeDate: body.tradeDate || now,
            direction: body.direction || 'long',
            entryPrice: body.entryPrice || 0,
            exitPrice: body.exitPrice,
            quantity: body.quantity || 0,
            pnl: body.pnl,
            pnlPercent: body.pnlPercent,
            emotionAtEntry: body.emotionAtEntry || 'neutral',
            emotionAtExit: body.emotionAtExit,
            notes: body.notes || '',
            lessonsLearned: body.lessonsLearned,
            thesisId: body.thesisId,
            screenshotUrls: body.screenshotUrls || [],
        };

        // Calculate P&L if exit price provided
        if (newEntry.exitPrice && newEntry.entryPrice && newEntry.quantity) {
            const multiplier = newEntry.direction === 'long' ? 1 : -1;
            newEntry.pnl = (newEntry.exitPrice - newEntry.entryPrice) * newEntry.quantity * multiplier;
            newEntry.pnlPercent = ((newEntry.exitPrice - newEntry.entryPrice) / newEntry.entryPrice) * 100 * multiplier;
        }

        journalEntries.unshift(newEntry);

        return NextResponse.json({ entry: newEntry }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 400 });
    }
}

// PUT - Update an existing entry
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        const index = journalEntries.findIndex(e => e.id === id);
        if (index === -1) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        journalEntries[index] = {
            ...journalEntries[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ entry: journalEntries[index] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 400 });
    }
}

// DELETE - Remove an entry
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        journalEntries = journalEntries.filter(e => e.id !== id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 400 });
    }
}
