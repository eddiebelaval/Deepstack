import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UpgradeBanner,
  SidebarUpgradeBanner,
  ChatLimitBanner,
  FeatureLockedBanner,
} from '../upgrade-banner';

describe('UpgradeBanner', () => {
  describe('Rendering', () => {
    it('should render with default inline variant', () => {
      render(<UpgradeBanner />);
      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<UpgradeBanner title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render custom description', () => {
      render(<UpgradeBanner description="Custom description text" />);
      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('should render upgrade link', () => {
      render(<UpgradeBanner />);
      expect(screen.getByRole('link', { name: /upgrade/i })).toHaveAttribute('href', '/pricing');
    });
  });

  describe('Variants', () => {
    it('should render sidebar variant', () => {
      render(<UpgradeBanner variant="sidebar" />);
      expect(screen.getByText('Unlock Pro Features')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
    });

    it('should render prominent variant', () => {
      render(<UpgradeBanner variant="prominent" />);
      expect(screen.getByText('Ready to Trade Smarter?')).toBeInTheDocument();
    });

    it('should render minimal variant', () => {
      render(<UpgradeBanner variant="minimal" />);
      expect(screen.getByText('Upgrade')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  describe('Usage Indicator', () => {
    it('should show usage when showUsage is provided', () => {
      render(<UpgradeBanner showUsage={{ used: 3, limit: 5 }} />);
      expect(screen.getByText('3/5')).toBeInTheDocument();
      expect(screen.getByText('Daily AI Chats')).toBeInTheDocument();
    });

    it('should show progress bar for usage', () => {
      const { container } = render(<UpgradeBanner showUsage={{ used: 3, limit: 5 }} />);
      // Progress bar is a div with dynamic width
      const progressBar = container.querySelector('.h-1\\.5');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Callback', () => {
    it('should call onUpgradeClick when button is clicked', async () => {
      const user = userEvent.setup();
      const onUpgradeClick = vi.fn();
      render(<UpgradeBanner onUpgradeClick={onUpgradeClick} />);

      await user.click(screen.getByRole('link', { name: /upgrade/i }));
      expect(onUpgradeClick).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<UpgradeBanner className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Feature Parameter', () => {
    it('should show feature in title when provided', () => {
      render(<UpgradeBanner feature="Real-time Data" />);
      expect(screen.getByText('Upgrade for Real-time Data')).toBeInTheDocument();
    });
  });
});

describe('SidebarUpgradeBanner', () => {
  it('should render sidebar variant', () => {
    render(<SidebarUpgradeBanner />);
    expect(screen.getByText('Unlock Pro Features')).toBeInTheDocument();
  });

  it('should show usage when provided', () => {
    render(<SidebarUpgradeBanner showUsage={{ used: 2, limit: 5 }} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });
});

describe('ChatLimitBanner', () => {
  it('should render minimal variant when far from limit', () => {
    render(<ChatLimitBanner used={1} limit={10} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('should render inline variant when near limit', () => {
    render(<ChatLimitBanner used={8} limit={10} />);
    expect(screen.getByText('2 chats left today')).toBeInTheDocument();
  });

  it('should render prominent variant when at limit', () => {
    render(<ChatLimitBanner used={10} limit={10} />);
    expect(screen.getByText("You've reached your daily limit")).toBeInTheDocument();
  });

  it('should show singular chat text when 1 remaining', () => {
    render(<ChatLimitBanner used={9} limit={10} />);
    expect(screen.getByText('1 chat left today')).toBeInTheDocument();
  });
});

describe('FeatureLockedBanner', () => {
  it('should render feature name', () => {
    render(<FeatureLockedBanner feature="Advanced Analytics" />);
    expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
  });

  it('should show available with pro text', () => {
    render(<FeatureLockedBanner feature="Test Feature" />);
    expect(screen.getByText('Available with Pro')).toBeInTheDocument();
  });

  it('should render unlock button', () => {
    render(<FeatureLockedBanner feature="Test Feature" />);
    expect(screen.getByRole('link', { name: /unlock/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<FeatureLockedBanner feature="Test" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
