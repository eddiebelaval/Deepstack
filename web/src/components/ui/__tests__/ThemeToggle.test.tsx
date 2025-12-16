import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
    resolvedTheme: 'light',
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Icon Variant', () => {
    it('should render toggle button', () => {
      render(<ThemeToggle variant="icon" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(<ThemeToggle variant="icon" />);
      expect(screen.getByText('Toggle theme')).toBeInTheDocument();
    });

    it('should toggle theme on click', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle variant="icon" />);

      await user.click(screen.getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should apply custom className', () => {
      render(<ThemeToggle variant="icon" className="custom-class" />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Buttons Variant', () => {
    it('should render three theme buttons', () => {
      render(<ThemeToggle variant="buttons" />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should call setTheme with "light" when Light button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle variant="buttons" />);

      await user.click(screen.getByText('Light'));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should call setTheme with "dark" when Dark button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle variant="buttons" />);

      await user.click(screen.getByText('Dark'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should call setTheme with "system" when System button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle variant="buttons" />);

      await user.click(screen.getByText('System'));
      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('Dropdown Variant (default)', () => {
    it('should render dropdown trigger', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(<ThemeToggle />);
      expect(screen.getByText('Toggle theme')).toBeInTheDocument();
    });
  });
});
