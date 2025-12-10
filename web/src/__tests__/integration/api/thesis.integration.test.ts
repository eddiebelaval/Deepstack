/**
 * Integration Tests: /api/thesis
 *
 * Tests the thesis API route with in-memory storage.
 * Verifies: CRUD operations, validation, status filtering, risk/reward calculations.
 *
 * Note: This route currently uses in-memory storage. When migrated to Supabase,
 * these tests should be updated to include authentication and ownership checks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/thesis/route';
import { createRequest, parseResponse } from '../test-utils';

interface ThesisEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  symbol: string;
  status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';
  hypothesis: string;
  timeframe: string;
  entryTarget?: number;
  exitTarget?: number;
  stopLoss?: number;
  riskRewardRatio?: number;
  keyConditions: string[];
  validationScore?: number;
  validationNotes?: string;
  conversationId?: string;
}

interface ThesesResponse {
  theses: ThesisEntry[];
}

interface ThesisResponse {
  thesis: ThesisEntry;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

describe('/api/thesis', () => {
  // Note: Since thesis route uses in-memory storage, state persists across tests
  // We can't reliably test for "empty" state, so we test for structure and behavior

  describe('GET - List Theses', () => {
    it('returns theses array with valid structure', async () => {
      const request = createRequest('http://localhost:3000/api/thesis');
      const response = await GET(request);
      const data = await parseResponse<ThesesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.theses).toBeDefined();
      expect(Array.isArray(data.theses)).toBe(true);
    });

    it('returns all theses without filters', async () => {
      // Create a thesis first
      const req1 = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Test Thesis 1',
          symbol: 'SPY',
          status: 'drafting',
          hypothesis: 'Market will go up',
          timeframe: '1 week',
        },
      });
      const createResponse1 = await POST(req1);
      const created1 = await parseResponse<ThesisResponse>(createResponse1);

      const req2 = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Test Thesis 2',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'AAPL will break resistance',
          timeframe: '2 weeks',
        },
      });
      const createResponse2 = await POST(req2);
      const created2 = await parseResponse<ThesisResponse>(createResponse2);

      const request = createRequest('http://localhost:3000/api/thesis');
      const response = await GET(request);
      const data = await parseResponse<ThesesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.theses.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${created1.thesis.id}`));
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${created2.thesis.id}`));
    });

    it('filters theses by status', async () => {
      // Create theses with different statuses
      const draftReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Draft Thesis',
          symbol: 'SPY',
          status: 'drafting',
          hypothesis: 'Test hypothesis',
          timeframe: '1 week',
        },
      });
      const draftResponse = await POST(draftReq);
      const draft = await parseResponse<ThesisResponse>(draftResponse);

      const activeReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Active Thesis',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Test hypothesis',
          timeframe: '1 week',
        },
      });
      const activeResponse = await POST(activeReq);
      const active = await parseResponse<ThesisResponse>(activeResponse);

      // Filter by status
      const request = createRequest('http://localhost:3000/api/thesis?status=active');
      const response = await GET(request);
      const data = await parseResponse<ThesesResponse>(response);

      expect(response.status).toBe(200);
      expect(data.theses.every((t) => t.status === 'active')).toBe(true);

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${draft.thesis.id}`));
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${active.thesis.id}`));
    });

    it('returns single thesis by ID', async () => {
      // Create a thesis
      const createReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Single Thesis',
          symbol: 'TSLA',
          hypothesis: 'TSLA will rally',
          timeframe: '1 month',
        },
      });
      const createRes = await POST(createReq);
      const created = await parseResponse<ThesisResponse>(createRes);

      const request = createRequest(`http://localhost:3000/api/thesis?id=${created.thesis.id}`);
      const response = await GET(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(200);
      expect(data.thesis).toBeDefined();
      expect(data.thesis.id).toBe(created.thesis.id);
      expect(data.thesis.title).toBe('Single Thesis');

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${created.thesis.id}`));
    });

    it('returns 404 for non-existent thesis ID', async () => {
      // First create and delete a thesis to get a valid ID that doesn't exist
      const createReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Temp',
          symbol: 'SPY',
          hypothesis: 'Test',
          timeframe: '1 week',
        },
      });
      const createRes = await POST(createReq);
      const created = await parseResponse<ThesisResponse>(createRes);
      const tempId = created.thesis.id;

      // Delete it
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${tempId}`));

      // Now try to get it
      const request = createRequest(`http://localhost:3000/api/thesis?id=${tempId}`);
      const response = await GET(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Thesis not found');
    });

    it('returns 400 for invalid status filter', async () => {
      const request = createRequest('http://localhost:3000/api/thesis?status=invalid-status');
      const response = await GET(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('POST - Create Thesis', () => {
    it('creates thesis with valid minimal data', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Minimal Thesis',
          symbol: 'spy',
          hypothesis: 'Market will trend up',
          timeframe: '1 week',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(201);
      expect(data.thesis).toBeDefined();
      expect(data.thesis.symbol).toBe('SPY'); // Normalized to uppercase
      expect(data.thesis.title).toBe('Minimal Thesis');
      expect(data.thesis.status).toBe('drafting'); // Default
      expect(data.thesis.keyConditions).toEqual([]); // Default
      expect(data.thesis.id).toBeDefined();
      expect(data.thesis.createdAt).toBeDefined();

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${data.thesis.id}`));
    });

    it('creates thesis with all optional fields', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Complete Thesis',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'AAPL will break out above 200',
          timeframe: '2 weeks',
          entryTarget: 195.0,
          exitTarget: 210.0,
          stopLoss: 190.0,
          keyConditions: ['Volume spike', 'RSI oversold', 'Support hold'],
          validationScore: 85,
          validationNotes: 'Strong technical setup',
          conversationId: 'conv-123',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(201);
      expect(data.thesis.title).toBe('Complete Thesis');
      expect(data.thesis.status).toBe('active');
      expect(data.thesis.entryTarget).toBe(195.0);
      expect(data.thesis.exitTarget).toBe(210.0);
      expect(data.thesis.stopLoss).toBe(190.0);
      expect(data.thesis.keyConditions).toHaveLength(3);
      expect(data.thesis.validationScore).toBe(85);

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${data.thesis.id}`));
    });

    it('calculates risk/reward ratio when targets provided', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          hypothesis: 'SPY breakout',
          timeframe: '1 week',
          entryTarget: 450.0,
          exitTarget: 460.0, // +10 reward
          stopLoss: 445.0, // -5 risk
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(201);
      expect(data.thesis.riskRewardRatio).toBe(2); // 10/5 = 2
      expect(data.thesis.title).toBe('Untitled Thesis'); // Default

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${data.thesis.id}`));
    });

    it('returns 400 for missing required fields', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          // Missing hypothesis and timeframe
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('returns 400 for invalid symbol format', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'INVALID$SYMBOL!',
          hypothesis: 'Test',
          timeframe: '1 week',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for symbol exceeding length', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'TOOLONGSYMBOL',
          hypothesis: 'Test',
          timeframe: '1 week',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for negative price targets', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          hypothesis: 'Test',
          timeframe: '1 week',
          entryTarget: -100,
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('returns 400 for validation score outside range', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'SPY',
          hypothesis: 'Test',
          timeframe: '1 week',
          validationScore: 150, // Out of range (0-100)
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('normalizes symbol to uppercase', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          symbol: 'aapl',
          hypothesis: 'AAPL will rally',
          timeframe: '1 week',
        },
      });
      const response = await POST(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(201);
      expect(data.thesis.symbol).toBe('AAPL');

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${data.thesis.id}`));
    });
  });

  describe('PUT - Update Thesis', () => {
    let testThesisId: string;

    beforeEach(async () => {
      // Create a test thesis before each update test
      const createReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'Update Test Thesis',
          symbol: 'SPY',
          hypothesis: 'Original hypothesis',
          timeframe: '1 week',
          entryTarget: 450.0,
        },
      });
      const createRes = await POST(createReq);
      const created = await parseResponse<ThesisResponse>(createRes);
      testThesisId = created.thesis.id;
    });

    it('updates thesis with valid data', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'PUT',
        body: {
          id: testThesisId,
          title: 'Updated Title',
          status: 'active',
          hypothesis: 'Updated hypothesis',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(200);
      expect(data.thesis.id).toBe(testThesisId);
      expect(data.thesis.title).toBe('Updated Title');
      expect(data.thesis.status).toBe('active');
      expect(data.thesis.hypothesis).toBe('Updated hypothesis');
      expect(data.thesis.updatedAt).toBeDefined();

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${testThesisId}`));
    });

    it('updates only specified fields', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'PUT',
        body: {
          id: testThesisId,
          status: 'validated',
          validationScore: 90,
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ThesisResponse>(response);

      expect(response.status).toBe(200);
      expect(data.thesis.status).toBe('validated');
      expect(data.thesis.validationScore).toBe(90);
      expect(data.thesis.title).toBe('Update Test Thesis'); // Unchanged
      expect(data.thesis.hypothesis).toBe('Original hypothesis'); // Unchanged

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${testThesisId}`));
    });

    it('returns 404 for non-existent thesis', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'PUT',
        body: {
          id: 'non-existent-id',
          title: 'Updated',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Thesis not found');

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${testThesisId}`));
    });

    it('returns 400 for missing thesis ID', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'PUT',
        body: {
          title: 'Updated',
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${testThesisId}`));
    });

    it('returns 400 for invalid field values', async () => {
      const request = createRequest('http://localhost:3000/api/thesis', {
        method: 'PUT',
        body: {
          id: testThesisId,
          entryTarget: -50, // Negative price
        },
      });
      const response = await PUT(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');

      // Cleanup
      await DELETE(createRequest(`http://localhost:3000/api/thesis?id=${testThesisId}`));
    });
  });

  describe('DELETE - Remove Thesis', () => {
    it('deletes existing thesis', async () => {
      // Create a thesis to delete
      const createReq = createRequest('http://localhost:3000/api/thesis', {
        method: 'POST',
        body: {
          title: 'To Be Deleted',
          symbol: 'SPY',
          hypothesis: 'Will be deleted',
          timeframe: '1 week',
        },
      });
      const createRes = await POST(createReq);
      const created = await parseResponse<ThesisResponse>(createRes);

      const deleteReq = createRequest(`http://localhost:3000/api/thesis?id=${created.thesis.id}`);
      const deleteRes = await DELETE(deleteReq);
      const deleteData = await parseResponse<{ success: boolean }>(deleteRes);

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);

      // Verify it's deleted
      const getReq = createRequest(`http://localhost:3000/api/thesis?id=${created.thesis.id}`);
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(404);
    });

    it('returns success even for non-existent thesis (idempotent)', async () => {
      const request = createRequest('http://localhost:3000/api/thesis?id=non-existent-id');
      const response = await DELETE(request);
      const data = await parseResponse<{ success: boolean }>(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 for missing ID parameter', async () => {
      const request = createRequest('http://localhost:3000/api/thesis');
      const response = await DELETE(request);
      const data = await parseResponse<ErrorResponse>(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.message).toBe('Valid thesis ID is required');
    });
  });
});
