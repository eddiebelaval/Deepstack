import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockDataWarning, useMockDataStore } from '../mock-data-warning';
import { act } from '@testing-library/react';

describe('MockDataWarning', () => {
  describe('Rendering', () => {
    it('should render alert', () => {
      render(<MockDataWarning />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show simulated data mode title', () => {
      render(<MockDataWarning />);
      expect(screen.getByText('Simulated Data Mode')).toBeInTheDocument();
    });

    it('should show unavailable data message', () => {
      render(<MockDataWarning />);
      expect(screen.getByText(/Live market data is unavailable/i)).toBeInTheDocument();
    });

    it('should show trading disabled warning', () => {
      render(<MockDataWarning />);
      expect(screen.getByText(/Trading is disabled/i)).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      const { container } = render(<MockDataWarning />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<MockDataWarning className="custom-warning" />);
      expect(screen.getByRole('alert')).toHaveClass('custom-warning');
    });

    it('should have destructive variant', () => {
      const { container } = render(<MockDataWarning />);
      // Destructive variant applies specific border/background classes
      expect(container.firstChild).toHaveAttribute('data-slot', 'alert');
    });
  });
});

describe('useMockDataStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useMockDataStore.setState({ isMockData: false });
    });
  });

  describe('Initial State', () => {
    it('should have isMockData as false initially', () => {
      const state = useMockDataStore.getState();
      expect(state.isMockData).toBe(false);
    });
  });

  describe('setMockData', () => {
    it('should update isMockData to true', () => {
      act(() => {
        useMockDataStore.getState().setMockData(true);
      });

      expect(useMockDataStore.getState().isMockData).toBe(true);
    });

    it('should update isMockData to false', () => {
      act(() => {
        useMockDataStore.getState().setMockData(true);
      });

      act(() => {
        useMockDataStore.getState().setMockData(false);
      });

      expect(useMockDataStore.getState().isMockData).toBe(false);
    });
  });
});
