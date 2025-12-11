import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAlertsStore } from '../alerts-store';
import { act } from '@testing-library/react';

// Mock crypto.randomUUID - use Object.defineProperty since crypto is read-only
const mockUUID = 'test-uuid-123';
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `${mockUUID}-${++uuidCounter}`),
});

describe('useAlertsStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useAlertsStore.setState({ alerts: [] });
    });

    // Reset UUID counter
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty alerts array', () => {
      const state = useAlertsStore.getState();
      expect(state.alerts).toEqual([]);
    });
  });

  describe('addAlert', () => {
    it('adds alert to store', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });

      const alerts = useAlertsStore.getState().alerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].symbol).toBe('AAPL');
    });

    it('generates unique id', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.id).toMatch(/^test-uuid-123-\d+$/);
    });

    it('sets createdAt timestamp', () => {
      const beforeTime = new Date().toISOString();

      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.createdAt).toBeDefined();
      expect(new Date(alert.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it('sets isActive to true', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.isActive).toBe(true);
    });

    it('supports above condition', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 250,
          condition: 'above',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.condition).toBe('above');
      expect(alert.targetPrice).toBe(250);
    });

    it('supports below condition', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'MSFT',
          targetPrice: 300,
          condition: 'below',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.condition).toBe('below');
    });

    it('supports crosses condition', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'GOOGL',
          targetPrice: 150,
          condition: 'crosses',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.condition).toBe('crosses');
    });

    it('includes optional note', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'NVDA',
          targetPrice: 500,
          condition: 'above',
          note: 'Breakout level',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.note).toBe('Breakout level');
    });

    it('adds multiple alerts', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 200,
          condition: 'below',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'MSFT',
          targetPrice: 350,
          condition: 'crosses',
        });
      });

      const alerts = useAlertsStore.getState().alerts;
      expect(alerts).toHaveLength(3);
      expect(alerts.map((a) => a.symbol)).toEqual(['AAPL', 'TSLA', 'MSFT']);
    });
  });

  describe('removeAlert', () => {
    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });
    });

    it('removes alert by id', () => {
      const alertId = useAlertsStore.getState().alerts[0].id;

      act(() => {
        useAlertsStore.getState().removeAlert(alertId);
      });

      expect(useAlertsStore.getState().alerts).toHaveLength(0);
    });

    it('only removes matching alert', () => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 200,
          condition: 'below',
        });
      });

      const alerts = useAlertsStore.getState().alerts;
      const firstId = alerts[0].id;

      act(() => {
        useAlertsStore.getState().removeAlert(firstId);
      });

      const remaining = useAlertsStore.getState().alerts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].symbol).toBe('TSLA');
    });

    it('does nothing for non-existent id', () => {
      act(() => {
        useAlertsStore.getState().removeAlert('nonexistent-id');
      });

      expect(useAlertsStore.getState().alerts).toHaveLength(1);
    });
  });

  describe('updateAlert', () => {
    let alertId: string;

    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
          note: 'Original note',
        });
      });
      alertId = useAlertsStore.getState().alerts[0].id;
    });

    it('updates target price', () => {
      act(() => {
        useAlertsStore.getState().updateAlert(alertId, {
          targetPrice: 200,
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.targetPrice).toBe(200);
    });

    it('updates condition', () => {
      act(() => {
        useAlertsStore.getState().updateAlert(alertId, {
          condition: 'below',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.condition).toBe('below');
    });

    it('updates note', () => {
      act(() => {
        useAlertsStore.getState().updateAlert(alertId, {
          note: 'Updated note',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.note).toBe('Updated note');
    });

    it('updates multiple properties', () => {
      act(() => {
        useAlertsStore.getState().updateAlert(alertId, {
          targetPrice: 190,
          condition: 'crosses',
          note: 'New breakout level',
        });
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.targetPrice).toBe(190);
      expect(alert.condition).toBe('crosses');
      expect(alert.note).toBe('New breakout level');
    });

    it('preserves other properties', () => {
      const originalAlert = useAlertsStore.getState().alerts[0];

      act(() => {
        useAlertsStore.getState().updateAlert(alertId, {
          targetPrice: 200,
        });
      });

      const updatedAlert = useAlertsStore.getState().alerts[0];
      expect(updatedAlert.symbol).toBe(originalAlert.symbol);
      expect(updatedAlert.id).toBe(originalAlert.id);
      expect(updatedAlert.createdAt).toBe(originalAlert.createdAt);
    });

    it('does nothing for non-existent id', () => {
      const originalAlerts = useAlertsStore.getState().alerts;

      act(() => {
        useAlertsStore.getState().updateAlert('nonexistent-id', {
          targetPrice: 200,
        });
      });

      expect(useAlertsStore.getState().alerts).toEqual(originalAlerts);
    });
  });

  describe('triggerAlert', () => {
    let alertId: string;

    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
      });
      alertId = useAlertsStore.getState().alerts[0].id;
    });

    it('sets triggeredAt timestamp', () => {
      const beforeTime = new Date().toISOString();

      act(() => {
        useAlertsStore.getState().triggerAlert(alertId);
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.triggeredAt).toBeDefined();
      expect(new Date(alert.triggeredAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it('sets isActive to false', () => {
      act(() => {
        useAlertsStore.getState().triggerAlert(alertId);
      });

      const alert = useAlertsStore.getState().alerts[0];
      expect(alert.isActive).toBe(false);
    });

    it('preserves alert in array', () => {
      act(() => {
        useAlertsStore.getState().triggerAlert(alertId);
      });

      expect(useAlertsStore.getState().alerts).toHaveLength(1);
    });

    it('does nothing for non-existent id', () => {
      const originalAlerts = useAlertsStore.getState().alerts;

      act(() => {
        useAlertsStore.getState().triggerAlert('nonexistent-id');
      });

      expect(useAlertsStore.getState().alerts).toEqual(originalAlerts);
    });
  });

  describe('clearTriggered', () => {
    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 200,
          condition: 'below',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'MSFT',
          targetPrice: 350,
          condition: 'crosses',
        });
      });
    });

    it('removes triggered alerts', () => {
      const alerts = useAlertsStore.getState().alerts;

      act(() => {
        useAlertsStore.getState().triggerAlert(alerts[0].id);
        useAlertsStore.getState().triggerAlert(alerts[1].id);
        useAlertsStore.getState().clearTriggered();
      });

      const remaining = useAlertsStore.getState().alerts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].symbol).toBe('MSFT');
      expect(remaining[0].isActive).toBe(true);
    });

    it('keeps active alerts', () => {
      act(() => {
        useAlertsStore.getState().clearTriggered();
      });

      expect(useAlertsStore.getState().alerts).toHaveLength(3);
    });

    it('handles empty array', () => {
      act(() => {
        useAlertsStore.setState({ alerts: [] });
        useAlertsStore.getState().clearTriggered();
      });

      expect(useAlertsStore.getState().alerts).toEqual([]);
    });
  });

  describe('getActiveAlerts', () => {
    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 200,
          condition: 'below',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'MSFT',
          targetPrice: 350,
          condition: 'crosses',
        });
      });
    });

    it('returns only active alerts', () => {
      const alerts = useAlertsStore.getState().alerts;

      act(() => {
        useAlertsStore.getState().triggerAlert(alerts[0].id);
      });

      const activeAlerts = useAlertsStore.getState().getActiveAlerts();
      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts.map((a) => a.symbol)).toEqual(['TSLA', 'MSFT']);
    });

    it('returns all alerts when none triggered', () => {
      const activeAlerts = useAlertsStore.getState().getActiveAlerts();
      expect(activeAlerts).toHaveLength(3);
    });

    it('returns empty array when all triggered', () => {
      const alerts = useAlertsStore.getState().alerts;

      act(() => {
        alerts.forEach((alert) => {
          useAlertsStore.getState().triggerAlert(alert.id);
        });
      });

      const activeAlerts = useAlertsStore.getState().getActiveAlerts();
      expect(activeAlerts).toEqual([]);
    });
  });

  describe('getTriggeredAlerts', () => {
    beforeEach(() => {
      act(() => {
        useAlertsStore.getState().addAlert({
          symbol: 'AAPL',
          targetPrice: 180,
          condition: 'above',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'TSLA',
          targetPrice: 200,
          condition: 'below',
        });
        useAlertsStore.getState().addAlert({
          symbol: 'MSFT',
          targetPrice: 350,
          condition: 'crosses',
        });
      });
    });

    it('returns only triggered alerts', () => {
      const alerts = useAlertsStore.getState().alerts;

      act(() => {
        useAlertsStore.getState().triggerAlert(alerts[0].id);
        useAlertsStore.getState().triggerAlert(alerts[1].id);
      });

      const triggeredAlerts = useAlertsStore.getState().getTriggeredAlerts();
      expect(triggeredAlerts).toHaveLength(2);
      expect(triggeredAlerts.map((a) => a.symbol)).toEqual(['AAPL', 'TSLA']);
    });

    it('returns empty array when none triggered', () => {
      const triggeredAlerts = useAlertsStore.getState().getTriggeredAlerts();
      expect(triggeredAlerts).toEqual([]);
    });

    it('returns all alerts when all triggered', () => {
      const alerts = useAlertsStore.getState().alerts;

      act(() => {
        alerts.forEach((alert) => {
          useAlertsStore.getState().triggerAlert(alert.id);
        });
      });

      const triggeredAlerts = useAlertsStore.getState().getTriggeredAlerts();
      expect(triggeredAlerts).toHaveLength(3);
    });
  });
});
