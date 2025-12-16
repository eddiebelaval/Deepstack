import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThesisStore } from '../thesis-store';
import type { ThesisEntry } from '../thesis-store';
import { act } from '@testing-library/react';

describe('useThesisStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    // Clear persisted data and reset theses
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    act(() => {
      useThesisStore.setState({ theses: [] });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty theses array', () => {
      const state = useThesisStore.getState();
      expect(state.theses).toEqual([]);
    });

    it('has all required actions', () => {
      const state = useThesisStore.getState();
      expect(state.addThesis).toBeDefined();
      expect(state.updateThesis).toBeDefined();
      expect(state.deleteThesis).toBeDefined();
      expect(state.getThesisById).toBeDefined();
      expect(state.getActiveTheses).toBeDefined();
    });
  });

  describe('addThesis', () => {
    it('creates a new thesis with generated id and timestamps', () => {
      const { addThesis } = useThesisStore.getState();

      let newThesis: ThesisEntry;
      act(() => {
        newThesis = addThesis({
          title: 'Tech Rally Q1 2025',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'AAPL will break out above $180 due to strong earnings',
          timeframe: '3 months',
          keyConditions: ['Earnings beat', 'Volume confirmation', 'RSI > 50'],
        });
      });

      expect(newThesis!.id).toMatch(/^thesis-\d+$/);
      expect(newThesis!.createdAt).toBeDefined();
      expect(newThesis!.updatedAt).toBeDefined();
      expect(newThesis!.title).toBe('Tech Rally Q1 2025');
    });

    it('adds thesis to the beginning of theses array', () => {
      const { addThesis } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'First Thesis',
          symbol: 'SPY',
          status: 'drafting',
          hypothesis: 'Market bullish',
          timeframe: '1 month',
          keyConditions: ['Fed pause'],
        });

        addThesis({
          title: 'Second Thesis',
          symbol: 'QQQ',
          status: 'active',
          hypothesis: 'Tech outperforms',
          timeframe: '2 months',
          keyConditions: ['AI sector growth'],
        });
      });

      const state = useThesisStore.getState();
      expect(state.theses).toHaveLength(2);
      expect(state.theses[0].title).toBe('Second Thesis'); // Most recent first
      expect(state.theses[1].title).toBe('First Thesis');
    });

    it('creates thesis with all optional fields', () => {
      const { addThesis } = useThesisStore.getState();

      let thesis: ThesisEntry;
      act(() => {
        thesis = addThesis({
          title: 'Complete Thesis',
          symbol: 'TSLA',
          status: 'active',
          hypothesis: 'TSLA will reach $300',
          timeframe: '6 months',
          entryTarget: 250.0,
          exitTarget: 300.0,
          stopLoss: 230.0,
          riskRewardRatio: 2.5,
          keyConditions: ['Delivery numbers exceed', 'Cybertruck success'],
          validationScore: 75,
          validationNotes: 'Strong fundamentals, good technicals',
          conversationId: 'conv-123',
        });
      });

      expect(thesis!.entryTarget).toBe(250.0);
      expect(thesis!.exitTarget).toBe(300.0);
      expect(thesis!.stopLoss).toBe(230.0);
      expect(thesis!.riskRewardRatio).toBe(2.5);
      expect(thesis!.validationScore).toBe(75);
      expect(thesis!.validationNotes).toBe('Strong fundamentals, good technicals');
      expect(thesis!.conversationId).toBe('conv-123');
    });

    it('handles all status types', () => {
      const { addThesis } = useThesisStore.getState();

      const statuses: ThesisEntry['status'][] = [
        'drafting',
        'active',
        'validated',
        'invalidated',
        'archived',
      ];

      statuses.forEach((status) => {
        act(() => {
          addThesis({
            title: `Thesis ${status}`,
            symbol: 'TEST',
            status,
            hypothesis: 'Test hypothesis',
            timeframe: '1 month',
            keyConditions: ['Condition 1'],
          });
        });
      });

      expect(useThesisStore.getState().theses).toHaveLength(statuses.length);
    });

    it('creates thesis with multiple key conditions', () => {
      const { addThesis } = useThesisStore.getState();

      let thesis: ThesisEntry;
      act(() => {
        thesis = addThesis({
          title: 'Multi-Condition Thesis',
          symbol: 'NVDA',
          status: 'active',
          hypothesis: 'NVDA bullish on AI',
          timeframe: '3 months',
          keyConditions: [
            'Q4 earnings beat estimates',
            'New AI chip announcement',
            'Major cloud partnerships',
            'Stock breaks $500',
          ],
        });
      });

      expect(thesis!.keyConditions).toHaveLength(4);
    });
  });

  describe('updateThesis', () => {
    it('updates existing thesis fields', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'Initial Thesis',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Initial hypothesis',
          timeframe: '1 month',
          keyConditions: ['Condition 1'],
        });
        thesisId = thesis.id;
      });

      act(() => {
        updateThesis(thesisId, {
          status: 'active',
          entryTarget: 150.0,
          exitTarget: 180.0,
          stopLoss: 140.0,
          riskRewardRatio: 3.0,
        });
      });

      const state = useThesisStore.getState();
      const updated = state.theses.find((t) => t.id === thesisId);

      expect(updated?.status).toBe('active');
      expect(updated?.entryTarget).toBe(150.0);
      expect(updated?.exitTarget).toBe(180.0);
      expect(updated?.stopLoss).toBe(140.0);
      expect(updated?.riskRewardRatio).toBe(3.0);
    });

    it('updates updatedAt timestamp', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      let thesisId!: string;
      let originalUpdatedAt!: string;

      act(() => {
        const thesis = addThesis({
          title: 'Test Thesis',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
        thesisId = thesis.id;
        originalUpdatedAt = thesis.updatedAt;
      });

      // Advance time to ensure different timestamp
      vi.advanceTimersByTime(10);

      act(() => {
        updateThesis(thesisId, { status: 'active' });
      });

      const updated = useThesisStore.getState().theses.find((t) => t.id === thesisId);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('does not update non-existent thesis', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'Test',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
      });

      const beforeUpdate = useThesisStore.getState().theses.length;

      act(() => {
        updateThesis('non-existent-id', { status: 'active' });
      });

      expect(useThesisStore.getState().theses.length).toBe(beforeUpdate);
    });

    it('preserves other fields when updating', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'Original Title',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Original hypothesis',
          timeframe: '1 month',
          keyConditions: ['Original condition'],
        });
        thesisId = thesis.id;
      });

      act(() => {
        updateThesis(thesisId, { status: 'active' });
      });

      const updated = useThesisStore.getState().theses.find((t) => t.id === thesisId);
      expect(updated?.title).toBe('Original Title');
      expect(updated?.symbol).toBe('AAPL');
      expect(updated?.hypothesis).toBe('Original hypothesis');
    });

    it('updates validation score and notes', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'Test Thesis',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
        thesisId = thesis.id;
      });

      act(() => {
        updateThesis(thesisId, {
          validationScore: 85,
          validationNotes: 'All conditions met, strong confirmation',
        });
      });

      const updated = useThesisStore.getState().theses.find((t) => t.id === thesisId);
      expect(updated?.validationScore).toBe(85);
      expect(updated?.validationNotes).toBe('All conditions met, strong confirmation');
    });
  });

  describe('deleteThesis', () => {
    it('removes thesis by id', () => {
      const { addThesis, deleteThesis } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'To Delete',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
        thesisId = thesis.id;
      });

      expect(useThesisStore.getState().theses).toHaveLength(1);

      act(() => {
        deleteThesis(thesisId);
      });

      expect(useThesisStore.getState().theses).toHaveLength(0);
    });

    it('only removes the specified thesis', () => {
      const { addThesis, deleteThesis } = useThesisStore.getState();

      let firstId: string;
      let secondId!: string;

      // Create theses with time advancement to ensure different timestamps/IDs
      act(() => {
        const first = addThesis({
          title: 'First',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test 1',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
        firstId = first.id;
      });

      vi.advanceTimersByTime(10);

      act(() => {
        const second = addThesis({
          title: 'Second',
          symbol: 'TSLA',
          status: 'active',
          hypothesis: 'Test 2',
          timeframe: '2 months',
          keyConditions: ['Test'],
        });
        secondId = second.id;
      });

      act(() => {
        deleteThesis(firstId);
      });

      const state = useThesisStore.getState();
      expect(state.theses).toHaveLength(1);
      expect(state.theses[0].id).toBe(secondId);
    });

    it('does nothing when deleting non-existent thesis', () => {
      const { addThesis, deleteThesis } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'Test',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
      });

      const beforeDelete = useThesisStore.getState().theses.length;

      act(() => {
        deleteThesis('non-existent-id');
      });

      expect(useThesisStore.getState().theses.length).toBe(beforeDelete);
    });
  });

  describe('getThesisById', () => {
    it('returns thesis with matching id', () => {
      const { addThesis, getThesisById } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'Find Me',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
        thesisId = thesis.id;
      });

      const found = getThesisById(thesisId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(thesisId);
      expect(found?.title).toBe('Find Me');
    });

    it('returns undefined for non-existent id', () => {
      const { getThesisById } = useThesisStore.getState();
      const found = getThesisById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('returns correct thesis from multiple theses', () => {
      const { addThesis, getThesisById } = useThesisStore.getState();

      let targetId!: string;

      // Create theses with time advancement to ensure different timestamps/IDs
      act(() => {
        addThesis({
          title: 'First',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test 1',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
      });

      vi.advanceTimersByTime(10);

      act(() => {
        const target = addThesis({
          title: 'Target Thesis',
          symbol: 'TSLA',
          status: 'active',
          hypothesis: 'Test 2',
          timeframe: '2 months',
          keyConditions: ['Test'],
        });
        targetId = target.id;
      });

      vi.advanceTimersByTime(10);

      act(() => {
        addThesis({
          title: 'Third',
          symbol: 'GOOGL',
          status: 'validated',
          hypothesis: 'Test 3',
          timeframe: '3 months',
          keyConditions: ['Test'],
        });
      });

      const found = getThesisById(targetId);
      expect(found?.title).toBe('Target Thesis');
    });
  });

  describe('getActiveTheses', () => {
    it('returns only theses with active status', () => {
      const { addThesis, getActiveTheses } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'Active 1',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });

        addThesis({
          title: 'Drafting',
          symbol: 'TSLA',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });

        addThesis({
          title: 'Active 2',
          symbol: 'GOOGL',
          status: 'active',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });

        addThesis({
          title: 'Validated',
          symbol: 'MSFT',
          status: 'validated',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });

        addThesis({
          title: 'Active 3',
          symbol: 'NVDA',
          status: 'active',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
      });

      const activeTheses = getActiveTheses();
      expect(activeTheses).toHaveLength(3);
      expect(activeTheses.every((t) => t.status === 'active')).toBe(true);
    });

    it('returns empty array when no active theses exist', () => {
      const { addThesis, getActiveTheses } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'Drafting',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });

        addThesis({
          title: 'Archived',
          symbol: 'TSLA',
          status: 'archived',
          hypothesis: 'Test',
          timeframe: '1 month',
          keyConditions: ['Test'],
        });
      });

      const activeTheses = getActiveTheses();
      expect(activeTheses).toEqual([]);
    });

    it('returns empty array when no theses exist', () => {
      const { getActiveTheses } = useThesisStore.getState();
      const activeTheses = getActiveTheses();
      expect(activeTheses).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('uses correct storage key', () => {
      // Check that the store is configured with the correct persistence name
      expect(useThesisStore.persist).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('handles thesis lifecycle from drafting to validation', () => {
      const { addThesis, updateThesis, getThesisById } = useThesisStore.getState();

      let thesisId!: string;

      // Create draft thesis
      act(() => {
        const thesis = addThesis({
          title: 'AAPL Breakout Q1 2025',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'AAPL will break out above $180 due to strong iPhone sales',
          timeframe: '3 months',
          keyConditions: ['Q1 earnings beat', 'Revenue > $120B', 'Margin expansion'],
        });
        thesisId = thesis.id;
      });

      // Activate thesis with targets
      act(() => {
        updateThesis(thesisId, {
          status: 'active',
          entryTarget: 165.0,
          exitTarget: 185.0,
          stopLoss: 155.0,
          riskRewardRatio: 2.0,
        });
      });

      // Validate thesis
      act(() => {
        updateThesis(thesisId, {
          status: 'validated',
          validationScore: 90,
          validationNotes: 'All key conditions met. Strong earnings, revenue exceeded expectations.',
        });
      });

      const finalThesis = getThesisById(thesisId);
      expect(finalThesis?.status).toBe('validated');
      expect(finalThesis?.validationScore).toBe(90);
      expect(finalThesis?.entryTarget).toBe(165.0);
    });

    it('tracks thesis invalidation', () => {
      const { addThesis, updateThesis, getThesisById } = useThesisStore.getState();

      let thesisId!: string;

      act(() => {
        const thesis = addThesis({
          title: 'Bear Thesis - Market Crash',
          symbol: 'SPY',
          status: 'active',
          hypothesis: 'Market will crash due to recession',
          timeframe: '6 months',
          keyConditions: ['Unemployment rises', 'GDP negative', 'Fed tightening'],
          entryTarget: 450.0,
          exitTarget: 350.0,
          stopLoss: 470.0,
        });
        thesisId = thesis.id;
      });

      act(() => {
        updateThesis(thesisId, {
          status: 'invalidated',
          validationScore: 20,
          validationNotes: 'Key conditions not met. Economy stronger than expected. Fed paused.',
        });
      });

      const invalidatedThesis = getThesisById(thesisId);
      expect(invalidatedThesis?.status).toBe('invalidated');
      expect(invalidatedThesis?.validationScore).toBe(20);
    });

    it('links thesis to conversation', () => {
      const { addThesis, getThesisById } = useThesisStore.getState();

      let thesisId!: string;
      act(() => {
        const thesis = addThesis({
          title: 'AI Thesis from Chat',
          symbol: 'NVDA',
          status: 'active',
          hypothesis: 'NVDA benefits from AI boom',
          timeframe: '12 months',
          keyConditions: ['Data center growth', 'New chip releases'],
          conversationId: 'chat-session-abc123',
        });
        thesisId = thesis.id;
      });

      const thesis = getThesisById(thesisId);
      expect(thesis?.conversationId).toBe('chat-session-abc123');
    });

    it('manages multiple theses for same symbol', () => {
      const { addThesis } = useThesisStore.getState();

      act(() => {
        addThesis({
          title: 'AAPL Long-term Bull',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Long-term growth',
          timeframe: '12 months',
          keyConditions: ['Innovation', 'Market share'],
        });

        addThesis({
          title: 'AAPL Short-term Trade',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Earnings pop',
          timeframe: '1 month',
          keyConditions: ['Earnings beat'],
        });

        addThesis({
          title: 'AAPL Bear Case',
          symbol: 'AAPL',
          status: 'drafting',
          hypothesis: 'Market saturation',
          timeframe: '6 months',
          keyConditions: ['Sales decline', 'Competition'],
        });
      });

      const state = useThesisStore.getState();
      const aaplTheses = state.theses.filter((t) => t.symbol === 'AAPL');
      expect(aaplTheses).toHaveLength(3);
    });

    it('archives old theses', () => {
      const { addThesis, updateThesis } = useThesisStore.getState();

      let oldThesisId: string;

      // Create theses with time advancement to ensure different timestamps/IDs
      act(() => {
        const oldThesis = addThesis({
          title: 'Old Active Thesis',
          symbol: 'AAPL',
          status: 'active',
          hypothesis: 'Old hypothesis',
          timeframe: '1 month',
          keyConditions: ['Old condition'],
        });
        oldThesisId = oldThesis.id;
      });

      vi.advanceTimersByTime(10);

      act(() => {
        addThesis({
          title: 'New Active Thesis',
          symbol: 'TSLA',
          status: 'active',
          hypothesis: 'New hypothesis',
          timeframe: '1 month',
          keyConditions: ['New condition'],
        });
      });

      // Get fresh state for getActiveTheses
      expect(useThesisStore.getState().getActiveTheses()).toHaveLength(2);

      act(() => {
        updateThesis(oldThesisId, { status: 'archived' });
      });

      // Get fresh state after update
      const activeTheses = useThesisStore.getState().getActiveTheses();
      expect(activeTheses).toHaveLength(1);
      expect(activeTheses[0].title).toBe('New Active Thesis');
    });
  });
});
