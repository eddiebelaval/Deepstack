import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useTheme } from 'next-themes';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/chat-store');
vi.mock('next-themes');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

vi.mock('@/components/settings/PersonaSection', () => ({
  PersonaSection: () => <div data-testid="persona-section">Persona Section</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
}));

describe('SettingsPanel', () => {
  const mockToggleSettings = vi.fn();
  const mockSetActiveProvider = vi.fn();
  const mockSetUseExtendedThinking = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      settingsOpen: true,
      toggleSettings: mockToggleSettings,
      credits: 1000,
    });

    (useChatStore as any).mockReturnValue({
      activeProvider: 'claude',
      setActiveProvider: mockSetActiveProvider,
      useExtendedThinking: false,
      setUseExtendedThinking: mockSetUseExtendedThinking,
    });

    (useTheme as any).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Rendering', () => {
    it('should render when settingsOpen is true', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should not render when settingsOpen is false', () => {
      (useUIStore as any).mockReturnValue({
        settingsOpen: false,
        toggleSettings: mockToggleSettings,
        credits: 1000,
      });

      render(<SettingsPanel />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should display credits count', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  describe('Sections', () => {
    it('should render Appearance section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Compact Mode')).toBeInTheDocument();
    });

    it('should render AI Persona section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('AI Persona')).toBeInTheDocument();
      expect(screen.getByTestId('persona-section')).toBeInTheDocument();
    });

    it('should render AI Model section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('AI Model')).toBeInTheDocument();
      expect(screen.getByText('Default Model')).toBeInTheDocument();
      expect(screen.getByText('Extended Thinking')).toBeInTheDocument();
    });

    it('should render Notifications section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Market Alerts')).toBeInTheDocument();
      expect(screen.getByText('Research Updates')).toBeInTheDocument();
      expect(screen.getByText('Prediction Markets')).toBeInTheDocument();
    });

    it('should render Data Sources section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('Data Sources')).toBeInTheDocument();
      expect(screen.getByText('News Provider')).toBeInTheDocument();
    });

    it('should render System section', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('System')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Timezone')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should close panel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsPanel />);

      const closeButton = screen.getAllByRole('button')[0];
      await user.click(closeButton);

      expect(mockToggleSettings).toHaveBeenCalled();
    });

    it('should close panel when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPanel />);

      // Find backdrop (first div with onClick that triggers toggleSettings)
      const backdrop = container.querySelector('.bg-background\\/20');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockToggleSettings).toHaveBeenCalled();
    });

    it('should export data when export button is clicked', async () => {
      const user = userEvent.setup();

      // Mock localStorage data
      (window.localStorage.getItem as any).mockReturnValue(JSON.stringify({ test: 'data' }));

      render(<SettingsPanel />);

      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Theme Toggle', () => {
    it('should render theme toggle', () => {
      render(<SettingsPanel />);

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('AI Model Selection', () => {
    it('should display current AI provider', () => {
      render(<SettingsPanel />);

      const selects = screen.getAllByTestId('select');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading', () => {
      render(<SettingsPanel />);

      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });

    it('should render section headers', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  describe('Scroll Area', () => {
    it('should render scroll area for content', () => {
      render(<SettingsPanel />);

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });
  });
});
