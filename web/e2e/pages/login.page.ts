import { Page, Locator } from '@playwright/test';
import { BasePage } from '../fixtures/base.fixture';

/**
 * Login Page Object Model
 *
 * Represents the login page (/login) with authentication options.
 * Based on selectors from login.spec.ts
 *
 * Note: The login page may redirect based on authentication state,
 * so methods handle both logged-in and logged-out scenarios.
 */
export class LoginPage extends BasePage {
  // Branding
  readonly logo: Locator;

  // Authentication Options
  readonly emailInput: Locator;
  readonly sendMagicLinkButton: Locator;
  readonly googleSignInButton: Locator;

  // Footer Links
  readonly privacyLink: Locator;
  readonly termsLink: Locator;
  readonly helpLink: Locator;
  readonly id8labsLink: Locator;

  constructor(page: Page) {
    super(page);

    // Branding
    this.logo = page.getByText('deepstack').first();

    // Authentication
    this.emailInput = page.getByRole('textbox', { name: /Email/ });
    this.sendMagicLinkButton = page.getByRole('button', { name: /Send Magic Link/ });
    this.googleSignInButton = page.getByRole('button', { name: /Continue with Google/ });

    // Footer
    this.privacyLink = page.getByRole('link', { name: 'Privacy' });
    this.termsLink = page.getByRole('link', { name: 'Terms' });
    this.helpLink = page.getByRole('link', { name: 'Help' });
    this.id8labsLink = page.getByRole('link', { name: 'built by id8labs.app' });
  }

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await this.goto('/login');
  }

  /**
   * Navigate to login page and wait
   */
  async navigateAndWait(): Promise<void> {
    await this.navigate();
    await this.waitForNetworkIdle();
  }

  /**
   * Check if on login page (not redirected)
   */
  async isOnLoginPage(): Promise<boolean> {
    return await this.exists(this.emailInput) || await this.exists(this.googleSignInButton);
  }

  /**
   * Enter email address
   * @returns true if email input was visible and filled
   */
  async enterEmail(email: string): Promise<boolean> {
    return await this.fillIfExists(this.emailInput, email);
  }

  /**
   * Click Send Magic Link button
   * @returns true if button was visible and clicked
   */
  async clickSendMagicLink(): Promise<boolean> {
    if (await this.exists(this.sendMagicLinkButton)) {
      await this.sendMagicLinkButton.click();
      return true;
    }
    return false;
  }

  /**
   * Click Google Sign In button
   * @returns true if button was visible and clicked
   */
  async clickGoogleSignIn(): Promise<boolean> {
    if (await this.exists(this.googleSignInButton)) {
      await this.googleSignInButton.click();
      return true;
    }
    return false;
  }

  /**
   * Fill email and submit magic link form
   * @returns true if form was available and submitted
   */
  async submitMagicLinkForm(email: string): Promise<boolean> {
    const emailFilled = await this.enterEmail(email);
    if (emailFilled) {
      return await this.clickSendMagicLink();
    }
    return false;
  }

  /**
   * Get current email input value
   */
  async getEmailValue(): Promise<string | null> {
    if (await this.exists(this.emailInput)) {
      return await this.getInputValue(this.emailInput);
    }
    return null;
  }

  /**
   * Check if logo is visible (validates page loaded)
   */
  async isLogoVisible(): Promise<boolean> {
    return await this.exists(this.logo);
  }

  /**
   * Check if Google sign in option is available
   */
  async isGoogleSignInAvailable(): Promise<boolean> {
    return await this.exists(this.googleSignInButton);
  }

  /**
   * Check if magic link form is available
   */
  async isMagicLinkFormAvailable(): Promise<boolean> {
    return await this.exists(this.emailInput) && await this.exists(this.sendMagicLinkButton);
  }

  /**
   * Check if footer links are visible
   */
  async areFooterLinksVisible(): Promise<boolean> {
    return (
      await this.exists(this.privacyLink) &&
      await this.exists(this.termsLink) &&
      await this.exists(this.helpLink)
    );
  }

  /**
   * Click Privacy link in footer
   */
  async clickPrivacy(): Promise<void> {
    if (await this.exists(this.privacyLink)) {
      await this.privacyLink.click();
      await this.verifyUrl(/\/privacy/);
    }
  }

  /**
   * Click Terms link in footer
   */
  async clickTerms(): Promise<void> {
    if (await this.exists(this.termsLink)) {
      await this.termsLink.click();
      await this.verifyUrl(/\/terms/);
    }
  }

  /**
   * Click Help link in footer
   */
  async clickHelp(): Promise<void> {
    if (await this.exists(this.helpLink)) {
      await this.helpLink.click();
      await this.verifyUrl(/\/help/);
    }
  }

  /**
   * Verify page loaded (either login page or redirect)
   */
  async verifyPageLoaded(): Promise<void> {
    // Should at least see the logo
    await this.waitForElement(this.logo);
  }

  /**
   * Handle potential redirect after navigation
   * If user is already logged in, they might be redirected away from login
   */
  async handlePotentialRedirect(): Promise<'login' | 'redirected'> {
    await this.waitFor(1000);

    if (await this.isOnLoginPage()) {
      return 'login';
    }

    return 'redirected';
  }
}
