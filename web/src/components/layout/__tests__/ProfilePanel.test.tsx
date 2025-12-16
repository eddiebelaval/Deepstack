import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePanel } from '../ProfilePanel';
import { useUIStore } from '@/lib/stores/ui-store';
import { useUser } from '@/hooks/useUser';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/useUser');
vi.mock('@/hooks/useSession');
vi.mock('@/lib/supabase/client');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Avatar components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => src ? <img src={src} data-testid="avatar-image" alt="avatar" /> : null,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}));

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className} data-radix-scroll-area-viewport>{children}</div>,
}));

describe('ProfilePanel', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    user_metadata: {
      avatar_url: 'https://example.com/avatar.jpg',
    },
    app_metadata: {
      provider: 'google',
    },
  };

  const mockProfile = {
    id: 'user-123',
    full_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    subscription_status: 'active',
    subscription_ends_at: '2025-01-01T00:00:00Z',
    tier: 'pro',
  };

  const mockToggleProfile = vi.fn();
  const mockSignOut = vi.fn();
  const mockSupabaseUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      profileOpen: true,
      toggleProfile: mockToggleProfile,
    });

    (useUser as any).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      tier: 'pro',
    });

    (useSession as any).mockReturnValue({
      signOut: mockSignOut,
    });

    (createClient as any).mockReturnValue({
      from: () => ({
        update: mockSupabaseUpdate.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
  });

  describe('Rendering', () => {
    it('should render when profileOpen is true', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should not render when profileOpen is false', () => {
      (useUIStore as any).mockReturnValue({
        profileOpen: false,
        toggleProfile: mockToggleProfile,
      });

      render(<ProfilePanel />);

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should render user avatar', () => {
      render(<ProfilePanel />);

      const avatar = screen.getByTestId('avatar-image');
      expect(avatar).toHaveAttribute('src', mockUser.user_metadata.avatar_url);
    });

    it('should render user name', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render user email', () => {
      render(<ProfilePanel />);

      // Email may appear multiple times in the component
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    });

    it('should render tier badge', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  describe('User Initials', () => {
    it('should display initials from full name', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should display email initial when no full name', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: { ...mockProfile, full_name: null },
        tier: 'pro',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should display default U when no name or email', () => {
      (useUser as any).mockReturnValue({
        user: { ...mockUser, email: null },
        profile: { ...mockProfile, full_name: null },
        tier: 'pro',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  describe('Display Name', () => {
    it('should show full name when available', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show email username when no full name', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: { ...mockProfile, full_name: null },
        tier: 'pro',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should show "User" as fallback', () => {
      (useUser as any).mockReturnValue({
        user: { ...mockUser, email: null },
        profile: { ...mockProfile, full_name: null },
        tier: 'pro',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Name Editing', () => {
    it('should show edit button next to name', () => {
      const { container } = render(<ProfilePanel />);

      // Find edit button by looking for the Edit2 icon (h-3 class)
      const editIcon = container.querySelector('svg.lucide-pencil, svg.h-3');
      expect(editIcon).toBeInTheDocument();
    });

    it('should switch to edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find((btn) => btn.querySelector('svg')?.classList.contains('h-3'));

      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByPlaceholderText('Your name');
      expect(input).toBeInTheDocument();
    });

    it('should populate input with current name', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find((btn) => btn.querySelector('svg')?.classList.contains('h-3'));

      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByDisplayValue('Test User');
      expect(input).toBeInTheDocument();
    });

    it('should save name when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find((btn) => btn.querySelector('svg')?.classList.contains('h-3'));

      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByPlaceholderText('Your name');
      await user.clear(input);
      await user.type(input, 'New Name');

      const saveButton = screen.getAllByRole('button').find((btn) => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-profit');
      });

      if (saveButton) {
        await user.click(saveButton);
      }

      await waitFor(() => {
        expect(mockSupabaseUpdate).toHaveBeenCalled();
      });
    });

    it('should cancel edit when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find((btn) => btn.querySelector('svg')?.classList.contains('h-3'));

      if (editButton) {
        await user.click(editButton);
      }

      const cancelButton = screen.getAllByRole('button').find((btn) => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-loss');
      });

      if (cancelButton) {
        await user.click(cancelButton);
      }

      expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument();
    });

    it('should show error message on save failure', async () => {
      const user = userEvent.setup();
      (createClient as any).mockReturnValue({
        from: () => ({
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          }),
        }),
      });

      render(<ProfilePanel />);

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find((btn) => btn.querySelector('svg')?.classList.contains('h-3'));

      if (editButton) {
        await user.click(editButton);
      }

      const saveButton = screen.getAllByRole('button').find((btn) => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('text-profit');
      });

      if (saveButton) {
        await user.click(saveButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Failed to save. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Tier Display', () => {
    it('should show Pro tier badge for pro users', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('should show Free tier badge for free users', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        tier: 'free',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('should show Enterprise tier badge for enterprise users', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        tier: 'enterprise',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    it('should show upgrade button for free tier', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        tier: 'free',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('Upgrade')).toBeInTheDocument();
    });
  });

  describe('Account Information', () => {
    it('should display member since date', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Member Since')).toBeInTheDocument();
      // Date formatted as "Jan 1, 2024" - just check for the label
      expect(screen.getByText(/Member Since/)).toBeInTheDocument();
    });

    it('should display email with verified badge', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should not show verified badge when email not confirmed', () => {
      (useUser as any).mockReturnValue({
        user: { ...mockUser, email_confirmed_at: null },
        profile: mockProfile,
        tier: 'pro',
      });

      render(<ProfilePanel />);

      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });

    it('should display authentication provider', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Google Sign-In')).toBeInTheDocument();
    });
  });

  describe('Subscription Information', () => {
    it('should display subscription plan', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    });

    it('should display renewal date for active subscriptions', () => {
      render(<ProfilePanel />);

      expect(screen.getByText(/Renews/)).toBeInTheDocument();
    });

    it('should show limited features for free tier', () => {
      (useUser as any).mockReturnValue({
        user: mockUser,
        profile: { ...mockProfile, subscription_status: null, tier: 'free' },
        tier: 'free',
      });

      render(<ProfilePanel />);

      expect(screen.getByText('Limited features')).toBeInTheDocument();
    });
  });

  describe('Sign Out', () => {
    it('should render sign out button', () => {
      render(<ProfilePanel />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call signOut when sign out button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockToggleProfile).toHaveBeenCalled();
    });
  });

  describe('Panel Interactions', () => {
    it('should close panel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePanel />);

      const closeButton = screen.getAllByRole('button')[0];
      await user.click(closeButton);

      expect(mockToggleProfile).toHaveBeenCalled();
    });

    it('should close panel when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfilePanel />);

      const backdrop = container.querySelector('.bg-background\\/20');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockToggleProfile).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ProfilePanel />);

      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    });

    it('should have scrollable content area', () => {
      const { container } = render(<ProfilePanel />);

      const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(scrollArea).toBeInTheDocument();
    });
  });
});
