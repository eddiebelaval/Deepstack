import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftSidebar } from '../LeftSidebar';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUser } from '@/hooks/useUser';
import { useChatLimit } from '@/hooks/useChatLimit';

// Mock all dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/chat-store');
vi.mock('@/hooks/useIsMobile');
vi.mock('@/hooks/useUser');
vi.mock('@/hooks/useChatLimit');

// Mock child components
vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

vi.mock('@/components/auth/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

vi.mock('@/components/trading/WatchlistManagementDialog', () => ({
  WatchlistManagementDialog: () => <div data-testid="watchlist-dialog">WatchlistDialog</div>,
}));

vi.mock('@/components/ui/upgrade-banner', () => ({
  SidebarUpgradeBanner: () => <div data-testid="upgrade-banner">UpgradeBanner</div>,
}));

describe('LeftSidebar', () => {
  const mockConversations = [
    {
      id: '1',
      title: 'Test Chat 1',
      created_at: new Date().toISOString(),
      messages: [],
    },
    {
      id: '2',
      title: 'Test Chat 2',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      messages: [],
    },
  ];

  const mockToggleLeftSidebar = vi.fn();
  const mockSetLeftSidebarOpen = vi.fn();
  const mockSetCurrentConversation = vi.fn();
  const mockSetActiveContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      leftSidebarOpen: true,
      toggleLeftSidebar: mockToggleLeftSidebar,
      setLeftSidebarOpen: mockSetLeftSidebarOpen,
      toggleProfile: vi.fn(),
      toggleSettings: vi.fn(),
      profileOpen: false,
      settingsOpen: false,
      activeContent: 'none',
      setActiveContent: mockSetActiveContent,
    });

    (useChatStore as any).mockReturnValue({
      conversations: mockConversations,
      currentConversationId: null,
      setCurrentConversation: mockSetCurrentConversation,
    });

    (useIsMobile as any).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });

    (useUser as any).mockReturnValue({
      tier: 'free',
    });

    (useChatLimit as any).mockReturnValue({
      chatsToday: 5,
      dailyLimit: 10,
      isLoading: false,
    });
  });

  describe('Desktop Rendering', () => {
    it('should render the sidebar', () => {
      render(<LeftSidebar />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render new chat button', () => {
      render(<LeftSidebar />);

      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    it('should render research tools section', () => {
      render(<LeftSidebar />);

      expect(screen.getByText('Research Tools')).toBeInTheDocument();
      expect(screen.getByText('Thesis Engine')).toBeInTheDocument();
      expect(screen.getByText('Trade Journal')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Watchlists')).toBeInTheDocument();
    });

    it('should render conversations', () => {
      render(<LeftSidebar />);

      expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
    });

    it('should render user menu', () => {
      render(<LeftSidebar />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });

  describe('Collapsed State', () => {
    beforeEach(() => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        leftSidebarOpen: false,
        toggleLeftSidebar: mockToggleLeftSidebar,
        setLeftSidebarOpen: mockSetLeftSidebarOpen,
        toggleProfile: vi.fn(),
        toggleSettings: vi.fn(),
        profileOpen: false,
        settingsOpen: false,
        activeContent: 'none',
        setActiveContent: mockSetActiveContent,
      });
    });

    it('should have collapsed width class', () => {
      const { container } = render(<LeftSidebar />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('w-14');
    });

    it('should still render icons', () => {
      render(<LeftSidebar />);

      // Icons should be present even in collapsed state
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile Rendering', () => {
    beforeEach(() => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
    });

    it('should not render when closed on mobile', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        leftSidebarOpen: false,
      });

      const { container } = render(<LeftSidebar />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when open on mobile', () => {
      render(<LeftSidebar />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should show close button instead of collapse on mobile', () => {
      render(<LeftSidebar />);

      const closeButton = screen.getByLabelText('Close menu');
      expect(closeButton).toBeInTheDocument();
    });

    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeftSidebar />);

      const closeButton = screen.getByLabelText('Close menu');
      await user.click(closeButton);

      expect(mockSetLeftSidebarOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('User Interactions', () => {
    it('should create new chat when button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeftSidebar />);

      const newChatButton = screen.getByText('New Chat');
      await user.click(newChatButton);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith(null);
    });

    it('should select conversation when clicked', async () => {
      const user = userEvent.setup();
      render(<LeftSidebar />);

      const conversation = screen.getByText('Test Chat 1');
      await user.click(conversation);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith('1');
    });

    it('should toggle thesis engine when clicked', async () => {
      const user = userEvent.setup();
      render(<LeftSidebar />);

      const thesisButton = screen.getByText('Thesis Engine');
      await user.click(thesisButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('thesis');
    });

    it('should toggle active content off when clicking active tool', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        activeContent: 'thesis',
        setActiveContent: mockSetActiveContent,
      });

      render(<LeftSidebar />);

      const thesisButton = screen.getByText('Thesis Engine');
      await user.click(thesisButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });
  });

  describe('Upgrade Banner', () => {
    it('should show upgrade banner for free tier users', () => {
      render(<LeftSidebar />);

      expect(screen.getByTestId('upgrade-banner')).toBeInTheDocument();
    });

    it('should not show upgrade banner for pro users', () => {
      (useUser as any).mockReturnValue({
        tier: 'pro',
      });

      render(<LeftSidebar />);

      expect(screen.queryByTestId('upgrade-banner')).not.toBeInTheDocument();
    });

    it('should only show in expanded state', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        leftSidebarOpen: false,
      });

      render(<LeftSidebar />);

      expect(screen.queryByTestId('upgrade-banner')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no conversations', () => {
      (useChatStore as any).mockReturnValue({
        conversations: [],
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<LeftSidebar />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start a new chat to begin')).toBeInTheDocument();
    });
  });

  describe('Active States', () => {
    it('should highlight active conversation', () => {
      (useChatStore as any).mockReturnValue({
        conversations: mockConversations,
        currentConversationId: '1',
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<LeftSidebar />);

      const activeConversation = screen.getByText('Test Chat 1').closest('button');
      expect(activeConversation).toHaveClass('bg-secondary');
    });

    it('should highlight active research tool', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        activeContent: 'thesis',
      });

      render(<LeftSidebar />);

      const thesisButton = screen.getByText('Thesis Engine').closest('button');
      expect(thesisButton).toHaveClass('bg-primary/20');
    });
  });

  describe('Version Display', () => {
    it('should show version number when expanded', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION;
      process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';

      render(<LeftSidebar />);

      expect(screen.getByText('v1.0.0')).toBeInTheDocument();

      process.env.NEXT_PUBLIC_APP_VERSION = originalEnv;
    });
  });

  describe('Watchlist Dialog', () => {
    it('should open watchlist dialog when watchlist button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeftSidebar />);

      const watchlistButton = screen.getByText('Watchlists');
      await user.click(watchlistButton);

      // Dialog should be rendered
      expect(screen.getByTestId('watchlist-dialog')).toBeInTheDocument();
    });
  });
});
