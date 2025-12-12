import { Page, Locator } from '@playwright/test';
import { BasePage } from '../fixtures/base.fixture';

/**
 * Landing Page Object Model
 *
 * Represents the main landing page (/) with all its elements and interactions.
 * Based on selectors from landing.spec.ts and navigation.spec.ts
 */
export class LandingPage extends BasePage {
  // Navigation Links
  readonly tryDemoLink: Locator;
  readonly signInLink: Locator;
  readonly helpLink: Locator;

  // Hero Section
  readonly logo: Locator;
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;

  // CTA Buttons
  readonly startFreeAnalysisButton: Locator;
  readonly launchDeepStackButton: Locator;

  // Features Section
  readonly aiChatAssistantFeature: Locator;
  readonly realTimeMarketDataFeature: Locator;
  readonly emotionalFirewallFeature: Locator;

  // Footer
  readonly footer: Locator;
  readonly helpCenterLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;
  readonly id8labsLink: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation
    this.tryDemoLink = page.getByRole('link', { name: 'Try Demo' });
    this.signInLink = page.getByRole('link', { name: 'Sign In' });
    this.helpLink = page.getByRole('link', { name: 'Help' }).first();

    // Hero Section
    this.logo = page.getByText('deepstack').first();
    this.heroTitle = page.getByRole('heading', { level: 1 });
    this.heroSubtitle = page.getByText(/research platform/i).first();

    // CTA Buttons (actual button text from page)
    this.startFreeAnalysisButton = page.getByRole('link', { name: /Start Researching Free/ });
    this.launchDeepStackButton = page.getByRole('link', { name: /Launch deepstack/i });

    // Features (actual heading names from page)
    this.aiChatAssistantFeature = page.getByRole('heading', { name: 'AI Research Assistant' });
    this.realTimeMarketDataFeature = page.getByRole('heading', { name: 'Live Market Data' });
    this.emotionalFirewallFeature = page.getByRole('heading', { name: 'Emotional Firewall' });

    // Footer
    this.footer = page.locator('footer, [role="contentinfo"]');
    this.helpCenterLink = page.getByRole('link', { name: 'Help Center' });
    this.id8labsLink = page.getByRole('link', { name: 'built by id8labs.app' });

    // Footer links need to be scoped to footer to avoid conflicts
    this.termsLink = this.footer.getByRole('link', { name: 'Terms' });
    this.privacyLink = this.footer.getByRole('link', { name: 'Privacy' });
  }

  /**
   * Navigate to landing page
   */
  async navigate(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Navigate to landing page and wait for load
   */
  async navigateAndWait(): Promise<void> {
    await this.navigate();
    await this.waitForNetworkIdle();
  }

  /**
   * Click Try Demo and navigate to app
   */
  async clickTryDemo(): Promise<void> {
    await this.tryDemoLink.click();
    await this.verifyUrl(/\/app/);
  }

  /**
   * Click Sign In and navigate to login
   */
  async clickSignIn(): Promise<void> {
    await this.signInLink.click();
  }

  /**
   * Click Start Free Analysis CTA
   */
  async clickStartFreeAnalysis(): Promise<void> {
    await this.startFreeAnalysisButton.click();
    await this.verifyUrl(/\/app/);
  }

  /**
   * Click Launch DeepStack CTA
   */
  async clickLaunchDeepStack(): Promise<void> {
    await this.launchDeepStackButton.click();
    await this.verifyUrl(/\/app/);
  }

  /**
   * Click Help link in navigation
   */
  async clickHelp(): Promise<void> {
    await this.helpLink.click();
    await this.verifyUrl(/\/help/);
  }

  /**
   * Scroll to footer and click Terms link
   */
  async clickTermsInFooter(): Promise<void> {
    await this.dismissModals();
    await this.scrollToBottom();
    await this.termsLink.click();
    await this.verifyUrl(/\/terms/);
  }

  /**
   * Scroll to footer and click Privacy link
   */
  async clickPrivacyInFooter(): Promise<void> {
    await this.dismissModals();
    await this.scrollToBottom();
    await this.privacyLink.click();
    await this.verifyUrl(/\/privacy/);
  }

  /**
   * Scroll to footer and click Help Center link
   */
  async clickHelpCenter(): Promise<void> {
    await this.scrollToBottom();
    await this.helpCenterLink.click();
    await this.verifyUrl(/\/help/);
  }

  /**
   * Verify page title contains "deepstack" (case-insensitive)
   */
  async verifyPageTitle(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    const title = await this.page.title();
    if (!title.toLowerCase().includes('deepstack')) {
      throw new Error(`Expected title to contain "deepstack", got: ${title}`);
    }
  }

  /**
   * Check if all hero elements are visible
   */
  async areHeroElementsVisible(): Promise<boolean> {
    return (
      await this.exists(this.logo) &&
      await this.exists(this.heroTitle) &&
      await this.exists(this.heroSubtitle)
    );
  }

  /**
   * Check if all navigation links are visible
   */
  async areNavigationLinksVisible(): Promise<boolean> {
    return (
      await this.exists(this.tryDemoLink) &&
      await this.exists(this.signInLink) &&
      await this.exists(this.helpLink)
    );
  }

  /**
   * Check if all feature headings are visible (scrolls to features section first)
   */
  async areFeatureHeadingsVisible(): Promise<boolean> {
    // Features are below the fold, scroll to them first
    await this.aiChatAssistantFeature.scrollIntoViewIfNeeded().catch(() => {});
    return (
      await this.exists(this.aiChatAssistantFeature) &&
      await this.exists(this.realTimeMarketDataFeature) &&
      await this.exists(this.emotionalFirewallFeature)
    );
  }

  /**
   * Check if all CTA buttons are visible
   */
  async areCtaButtonsVisible(): Promise<boolean> {
    // Check hero CTA first (already visible)
    const hasHeroCta = await this.exists(this.startFreeAnalysisButton);
    // Launch button is at the bottom, scroll to it
    await this.launchDeepStackButton.scrollIntoViewIfNeeded().catch(() => {});
    const hasBottomCta = await this.exists(this.launchDeepStackButton);
    return hasHeroCta && hasBottomCta;
  }

  /**
   * Scroll to footer and check if footer links are visible
   */
  async areFooterLinksVisible(): Promise<boolean> {
    await this.scrollToBottom();
    return (
      await this.exists(this.helpCenterLink) &&
      await this.exists(this.termsLink) &&
      await this.exists(this.privacyLink) &&
      await this.exists(this.id8labsLink)
    );
  }
}
