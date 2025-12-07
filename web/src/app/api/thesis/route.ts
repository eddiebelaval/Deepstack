import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (would be replaced with database)
let theses: ThesisEntry[] = [];

interface ThesisEntry {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    symbol: string;
    status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';

    // Core thesis
    hypothesis: string;
    timeframe: string;

    // Targets
    entryTarget?: number;
    exitTarget?: number;
    stopLoss?: number;
    riskRewardRatio?: number;

    // Conditions
    keyConditions: string[];
    validationScore?: number;
    validationNotes?: string;

    // Links
    conversationId?: string;
}

// GET - List all theses or get single by ID
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');

    if (id) {
        const thesis = theses.find(t => t.id === id);
        if (!thesis) {
            return NextResponse.json({ error: 'Thesis not found' }, { status: 404 });
        }
        return NextResponse.json({ thesis });
    }

    let filtered = theses;
    if (status) {
        filtered = theses.filter(t => t.status === status);
    }

    return NextResponse.json({ theses: filtered });
}

// POST - Create a new thesis
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const now = new Date().toISOString();

        const newThesis: ThesisEntry = {
            id: `thesis-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
            title: body.title || 'Untitled Thesis',
            symbol: body.symbol || '',
            status: body.status || 'drafting',
            hypothesis: body.hypothesis || '',
            timeframe: body.timeframe || '',
            entryTarget: body.entryTarget,
            exitTarget: body.exitTarget,
            stopLoss: body.stopLoss,
            riskRewardRatio: body.riskRewardRatio,
            keyConditions: body.keyConditions || [],
            validationScore: body.validationScore,
            validationNotes: body.validationNotes,
            conversationId: body.conversationId,
        };

        // Calculate Risk/Reward if targets provided
        if (newThesis.entryTarget && newThesis.exitTarget && newThesis.stopLoss) {
            const reward = Math.abs(newThesis.exitTarget - newThesis.entryTarget);
            const risk = Math.abs(newThesis.entryTarget - newThesis.stopLoss);
            if (risk > 0) {
                newThesis.riskRewardRatio = reward / risk;
            }
        }

        theses.unshift(newThesis);

        return NextResponse.json({ thesis: newThesis }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create thesis' }, { status: 400 });
    }
}

// PUT - Update an existing thesis
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        const index = theses.findIndex(t => t.id === id);
        if (index === -1) {
            return NextResponse.json({ error: 'Thesis not found' }, { status: 404 });
        }

        theses[index] = {
            ...theses[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({ thesis: theses[index] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update thesis' }, { status: 400 });
    }
}

// DELETE - Remove a thesis
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        theses = theses.filter(t => t.id !== id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete thesis' }, { status: 400 });
    }
}
