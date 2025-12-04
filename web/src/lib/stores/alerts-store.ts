import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AlertCondition = 'above' | 'below' | 'crosses';

export type PriceAlert = {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  createdAt: string;
  triggeredAt?: string;
  isActive: boolean;
  note?: string;
};

interface AlertsState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => void;
  removeAlert: (id: string) => void;
  updateAlert: (id: string, updates: Partial<PriceAlert>) => void;
  triggerAlert: (id: string) => void;
  clearTriggered: () => void;
  getActiveAlerts: () => PriceAlert[];
  getTriggeredAlerts: () => PriceAlert[];
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              isActive: true,
            },
          ],
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      updateAlert: (id, updates) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      triggerAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id
              ? { ...a, triggeredAt: new Date().toISOString(), isActive: false }
              : a
          ),
        })),

      clearTriggered: () =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.isActive),
        })),

      getActiveAlerts: () => get().alerts.filter((a) => a.isActive),
      getTriggeredAlerts: () => get().alerts.filter((a) => !a.isActive),
    }),
    {
      name: 'deepstack-alerts-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
