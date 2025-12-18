import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useThesisSync } from '../useThesisSync';
import { useThesisStore, type ThesisEntry } from '@/lib/stores/thesis-store';
import * as supabase from '@/lib/supabase';
import * as thesisApi from '@/lib/supabase/thesis';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

// Mock the thesis API module
vi.mock('@/lib/supabase/thesis', () => ({
  fetchTheses: vi.fn(),
  createThesis: vi.fn(),
  updateThesis: vi.fn(),
  deleteThesis: vi.fn(),
  subscribeToTheses: vi.fn(),
}));

const mockThesis: ThesisEntry = {
  id: 'thesis-123',
  title: 'Bitcoin Breakout Thesis',
  symbol: 'BTC',
  status: 'active',
  hypothesis: 'BTC will break above $50k resistance',
  timeframe: '1-2 weeks',
  entryTarget: 48000,
  exitTarget: 52000,
  stopLoss: 46000,
  riskRewardRatio: 2,
  keyConditions: ['Volume increase', 'RSI above 60'],
  validationScore: 75,
  validationNotes: 'Strong technical setup',
  conversationId: 'conv-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useThesisSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useThesisStore.setState({ theses: [] });

    // Default: Supabase not configured (offline mode)
    vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useThesisSync());

      expect(result.current.theses).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.addThesis).toBe('function');
      expect(typeof result.current.updateThesis).toBe('function');
      expect(typeof result.current.deleteThesis).toBe('function');
      expect(typeof result.current.getActiveTheses).toBe('function');
    });

    it('sets isOnline to false when Supabase is not configured', () => {
      const { result } = renderHook(() => useThesisSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchTheses when Supabase is not configured', () => {
      renderHook(() => useThesisSync());

      expect(thesisApi.fetchTheses).not.toHaveBeenCalled();
    });
  });

  describe('Online Mode - Data Loading', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
    });

    it('loads theses from Supabase on mount when online', async () => {
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([mockThesis]);

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(thesisApi.fetchTheses).toHaveBeenCalledTimes(1);
      expect(result.current.theses).toHaveLength(1);
      expect(result.current.theses[0].id).toBe('thesis-123');
      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not replace local theses when remote is empty', async () => {
      // Set up local state with existing thesis
      useThesisStore.setState({ theses: [mockThesis] });
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([]);

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should keep local thesis
      expect(result.current.theses).toHaveLength(1);
    });

    it('handles fetch error gracefully', async () => {
      vi.mocked(thesisApi.fetchTheses).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load theses. Using local data.');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([]);
    });

    it('subscribes to thesis changes when online', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(thesisApi.subscribeToTheses).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when offline', () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);

      renderHook(() => useThesisSync());

      expect(thesisApi.subscribeToTheses).not.toHaveBeenCalled();
    });

    it('refetches data when subscription callback is triggered', async () => {
      const updatedThesis = { ...mockThesis, title: 'Updated Title' };
      vi.mocked(thesisApi.fetchTheses)
        .mockResolvedValueOnce([mockThesis])
        .mockResolvedValueOnce([updatedThesis]);

      let subscriptionCallback: (() => void | Promise<void>) | null = null;
      vi.mocked(thesisApi.subscribeToTheses).mockImplementation((cb) => {
        subscriptionCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useThesisSync());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.theses[0]?.title).toBe('Bitcoin Breakout Thesis');
      });

      // Trigger subscription callback
      if (subscriptionCallback) {
        await act(async () => {
          await Promise.resolve(subscriptionCallback!());
        });
      }

      await waitFor(() => {
        expect(result.current.theses[0]?.title).toBe('Updated Title');
      });
    });
  });

  describe('addThesis', () => {
    const newThesisData: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'New Thesis',
      symbol: 'ETH',
      status: 'drafting',
      hypothesis: 'ETH will rally',
      timeframe: '1 week',
      keyConditions: ['Breaking resistance'],
    };

    it('creates thesis locally when offline', async () => {
      const { result } = renderHook(() => useThesisSync());

      let createdThesis: ThesisEntry | undefined;
      await act(async () => {
        createdThesis = await result.current.addThesis(newThesisData);
      });

      expect(createdThesis).toBeDefined();
      expect(createdThesis!.title).toBe('New Thesis');
      expect(result.current.theses).toHaveLength(1);
      expect(thesisApi.createThesis).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.createThesis).mockResolvedValue({
        ...newThesisData,
        id: 'thesis-456',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      } as ThesisEntry);

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdThesis: ThesisEntry | undefined;
      await act(async () => {
        createdThesis = await result.current.addThesis(newThesisData);
      });

      expect(thesisApi.createThesis).toHaveBeenCalledWith(newThesisData);
      expect(createdThesis!.id).toBe('thesis-456');
      expect(result.current.theses).toHaveLength(1);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.createThesis).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdThesis: ThesisEntry | null = null;
      await act(async () => {
        createdThesis = await result.current.addThesis(newThesisData);
      });

      // Should still create locally despite sync failure
      expect(createdThesis).toBeDefined();
      expect(result.current.theses).toHaveLength(1);
    });
  });

  describe('updateThesis', () => {
    beforeEach(() => {
      useThesisStore.setState({ theses: [mockThesis] });
    });

    it('updates thesis locally when offline', async () => {
      const { result } = renderHook(() => useThesisSync());

      await act(async () => {
        await result.current.updateThesis('thesis-123', { title: 'Updated Title' });
      });

      expect(result.current.theses[0].title).toBe('Updated Title');
      expect(thesisApi.updateThesis).not.toHaveBeenCalled();
    });

    it('syncs update to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([mockThesis]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.updateThesis).mockResolvedValue();

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateThesis('thesis-123', {
          title: 'Updated Title',
          status: 'validated'
        });
      });

      expect(thesisApi.updateThesis).toHaveBeenCalledWith('thesis-123', {
        title: 'Updated Title',
        status: 'validated'
      });
      expect(result.current.theses[0].title).toBe('Updated Title');
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([mockThesis]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.updateThesis).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateThesis('thesis-123', { title: 'Updated Title' });
      });

      // Should still update locally
      expect(result.current.theses[0].title).toBe('Updated Title');
    });
  });

  describe('deleteThesis', () => {
    beforeEach(() => {
      useThesisStore.setState({ theses: [mockThesis] });
    });

    it('deletes thesis locally when offline', async () => {
      const { result } = renderHook(() => useThesisSync());

      await act(async () => {
        await result.current.deleteThesis('thesis-123');
      });

      expect(result.current.theses).toHaveLength(0);
      expect(thesisApi.deleteThesis).not.toHaveBeenCalled();
    });

    it('syncs deletion to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([mockThesis]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.deleteThesis).mockResolvedValue();

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteThesis('thesis-123');
      });

      expect(thesisApi.deleteThesis).toHaveBeenCalledWith('thesis-123');
      expect(result.current.theses).toHaveLength(0);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([mockThesis]);
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(() => {});
      vi.mocked(thesisApi.deleteThesis).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteThesis('thesis-123');
      });

      // Should still delete locally
      expect(result.current.theses).toHaveLength(0);
    });
  });

  describe('getActiveTheses', () => {
    it('filters and returns only active theses', () => {
      const inactiveThesis = { ...mockThesis, id: 'thesis-456', status: 'archived' as const };
      useThesisStore.setState({ theses: [mockThesis, inactiveThesis] });

      const { result } = renderHook(() => useThesisSync());

      const activeTheses = result.current.getActiveTheses();

      expect(activeTheses).toHaveLength(1);
      expect(activeTheses[0].id).toBe('thesis-123');
      expect(activeTheses[0].status).toBe('active');
    });

    it('returns empty array when no active theses', () => {
      const archivedThesis = { ...mockThesis, status: 'archived' as const };
      useThesisStore.setState({ theses: [archivedThesis] });

      const { result } = renderHook(() => useThesisSync());

      const activeTheses = result.current.getActiveTheses();

      expect(activeTheses).toHaveLength(0);
    });
  });

  describe('getThesisById', () => {
    beforeEach(() => {
      useThesisStore.setState({ theses: [mockThesis] });
    });

    it('returns thesis when found', () => {
      const { result } = renderHook(() => useThesisSync());

      const thesis = result.current.getThesisById('thesis-123');

      expect(thesis).toBeDefined();
      expect(thesis?.id).toBe('thesis-123');
    });

    it('returns undefined when not found', () => {
      const { result } = renderHook(() => useThesisSync());

      const thesis = result.current.getThesisById('nonexistent');

      expect(thesis).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes on unmount', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(thesisApi.fetchTheses).mockResolvedValue([]);

      const unsubscribe = vi.fn();
      vi.mocked(thesisApi.subscribeToTheses).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useThesisSync());

      await waitFor(() => {
        expect(thesisApi.subscribeToTheses).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
