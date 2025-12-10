import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schemas for validation
const createThesisSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').default('Untitled Thesis'),
    symbol: z.string()
        .min(1, 'Symbol is required')
        .max(10, 'Symbol must be 10 characters or less')
        .regex(/^[A-Z0-9.-]+$/i, 'Symbol must contain only letters, numbers, dots, and hyphens')
        .transform(s => s.toUpperCase()),
    status: z.enum(['drafting', 'active', 'validated', 'invalidated', 'archived']).default('drafting'),
    hypothesis: z.string().min(1, 'Hypothesis is required'),
    timeframe: z.string().min(1, 'Timeframe is required'),
    entryTarget: z.number().positive().optional(),
    exitTarget: z.number().positive().optional(),
    stopLoss: z.number().positive().optional(),
    riskRewardRatio: z.number().optional(),
    keyConditions: z.array(z.string()).default([]),
    validationScore: z.number().min(0).max(100).optional(),
    validationNotes: z.string().optional(),
    conversationId: z.string().optional(),
});

const updateThesisSchema = z.object({
    id: z.string().min(1, 'Thesis ID is required'),
    title: z.string().min(1).max(200).optional(),
    symbol: z.string().min(1).max(10).optional(),
    status: z.enum(['drafting', 'active', 'validated', 'invalidated', 'archived']).optional(),
    hypothesis: z.string().min(1).optional(),
    timeframe: z.string().min(1).optional(),
    entryTarget: z.number().positive().optional(),
    exitTarget: z.number().positive().optional(),
    stopLoss: z.number().positive().optional(),
    riskRewardRatio: z.number().optional(),
    keyConditions: z.array(z.string()).optional(),
    validationScore: z.number().min(0).max(100).optional(),
    validationNotes: z.string().optional(),
    conversationId: z.string().optional(),
});

const getThesisQuerySchema = z.object({
    id: z.string().optional(),
    status: z.enum(['drafting', 'active', 'validated', 'invalidated', 'archived']).optional(),
});

const deleteThesisQuerySchema = z.object({
    id: z.string().min(1, 'Thesis ID is required'),
});

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
    try {
        const { searchParams } = new URL(request.url);
        const queryParams = {
            id: searchParams.get('id'),
            status: searchParams.get('status'),
        };

        // Validate query parameters with Zod
        const validation = getThesisQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Invalid query parameters',
                    details: validation.error.format()
                },
                { status: 400 }
            );
        }

        const { id, status } = validation.data;

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
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch theses' },
            { status: 500 }
        );
    }
}

// POST - Create a new thesis
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = createThesisSchema.safeParse(body);

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
        const now = new Date().toISOString();

        const newThesis: ThesisEntry = {
            id: `thesis-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
            title: validatedData.title,
            symbol: validatedData.symbol,
            status: validatedData.status,
            hypothesis: validatedData.hypothesis,
            timeframe: validatedData.timeframe,
            entryTarget: validatedData.entryTarget,
            exitTarget: validatedData.exitTarget,
            stopLoss: validatedData.stopLoss,
            riskRewardRatio: validatedData.riskRewardRatio,
            keyConditions: validatedData.keyConditions,
            validationScore: validatedData.validationScore,
            validationNotes: validatedData.validationNotes,
            conversationId: validatedData.conversationId,
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
        console.error('Error creating thesis:', error);
        return NextResponse.json({ error: 'Failed to create thesis' }, { status: 400 });
    }
}

// PUT - Update an existing thesis
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const validation = updateThesisSchema.safeParse(body);

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
        console.error('Error updating thesis:', error);
        return NextResponse.json({ error: 'Failed to update thesis' }, { status: 400 });
    }
}

// DELETE - Remove a thesis
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const queryParams = {
            id: searchParams.get('id'),
        };

        // Validate query parameters with Zod
        const validation = deleteThesisQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Valid thesis ID is required',
                    details: validation.error.format()
                },
                { status: 400 }
            );
        }

        theses = theses.filter(t => t.id !== validation.data.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting thesis:', error);
        return NextResponse.json({ error: 'Failed to delete thesis' }, { status: 400 });
    }
}
