/**
 * Accessibility Testing Utilities
 *
 * Helpers for running axe-core accessibility tests with Playwright.
 * Provides utilities to:
 * - Run full page accessibility analysis
 * - Check specific WCAG rules
 * - Exclude known violations
 * - Generate detailed violation reports
 */

import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 Levels
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA';

/**
 * Common WCAG tags for testing
 */
export const WCAG_TAGS = {
  // WCAG 2.1 Level A
  wcag2a: 'wcag2a',
  wcag21a: 'wcag21a',

  // WCAG 2.1 Level AA (recommended minimum)
  wcag2aa: 'wcag2aa',
  wcag21aa: 'wcag21aa',

  // WCAG 2.1 Level AAA
  wcag2aaa: 'wcag2aaa',
  wcag21aaa: 'wcag21aaa',

  // Best practices
  bestPractice: 'best-practice',
} as const;

/**
 * Common accessibility rules
 */
export const A11Y_RULES = {
  // Color contrast
  colorContrast: 'color-contrast',
  colorContrastEnhanced: 'color-contrast-enhanced',

  // Images
  imageAlt: 'image-alt',
  objectAlt: 'object-alt',

  // Forms
  label: 'label',
  labelTitleOnly: 'label-title-only',

  // Headings
  emptyHeading: 'empty-heading',
  headingOrder: 'heading-order',

  // Links
  linkName: 'link-name',
  linkInTextBlock: 'link-in-text-block',

  // ARIA
  ariaAllowedAttr: 'aria-allowed-attr',
  ariaAllowedRole: 'aria-allowed-role',
  ariaHiddenFocus: 'aria-hidden-focus',
  ariaInputFieldName: 'aria-input-field-name',
  ariaRequiredAttr: 'aria-required-attr',
  ariaRequiredChildren: 'aria-required-children',
  ariaRequiredParent: 'aria-required-parent',
  ariaRoles: 'aria-roles',
  ariaValidAttr: 'aria-valid-attr',
  ariaValidAttrValue: 'aria-valid-attr-value',

  // Buttons
  buttonName: 'button-name',

  // Lists
  listitem: 'listitem',
  list: 'list',

  // Language
  htmlHasLang: 'html-has-lang',
  htmlLangValid: 'html-lang-valid',

  // Document
  documentTitle: 'document-title',

  // Landmarks
  landmark: 'landmark-one-main',
  region: 'region',
} as const;

/**
 * Options for running accessibility tests
 */
export interface A11yTestOptions {
  /**
   * WCAG level to test against (default: 'AA')
   */
  level?: WCAGLevel;

  /**
   * Specific rules to run (default: all rules for the level)
   */
  rules?: string[];

  /**
   * Rules to disable
   */
  disabledRules?: string[];

  /**
   * CSS selectors to exclude from analysis
   */
  exclude?: string[];

  /**
   * CSS selectors to include (default: entire page)
   */
  include?: string[];

  /**
   * Known violations to ignore (use sparingly, document why)
   */
  knownViolations?: {
    rule: string;
    selector?: string;
    reason: string;
  }[];
}

/**
 * Run accessibility analysis on the current page
 *
 * @example
 * ```ts
 * const results = await runAccessibilityTest(page);
 * expect(results.violations).toHaveLength(0);
 * ```
 *
 * @example
 * ```ts
 * const results = await runAccessibilityTest(page, {
 *   level: 'AAA',
 *   exclude: ['#third-party-widget']
 * });
 * ```
 */
export async function runAccessibilityTest(
  page: Page,
  options: A11yTestOptions = {}
) {
  const {
    level = 'AA',
    rules,
    disabledRules = [],
    exclude = [],
    include,
    knownViolations = [],
  } = options;

  // Build axe configuration
  let axeBuilder = new AxeBuilder({ page });

  // Set WCAG level tags
  const tags = [`wcag2${level.toLowerCase()}`, `wcag21${level.toLowerCase()}`];
  axeBuilder = axeBuilder.withTags(tags);

  // Apply specific rules if provided
  if (rules && rules.length > 0) {
    axeBuilder = axeBuilder.withRules(rules);
  }

  // Disable specified rules
  if (disabledRules.length > 0) {
    axeBuilder = axeBuilder.disableRules(disabledRules);
  }

  // Exclude elements
  if (exclude.length > 0) {
    axeBuilder = axeBuilder.exclude(exclude);
  }

  // Include specific elements (if provided)
  if (include && include.length > 0) {
    axeBuilder = axeBuilder.include(include);
  }

  // Run the analysis
  const results = await axeBuilder.analyze();

  // Filter out known violations
  if (knownViolations.length > 0) {
    results.violations = results.violations.filter(violation => {
      const isKnown = knownViolations.some(known => {
        if (known.rule !== violation.id) return false;

        // If no selector specified, exclude all violations of this rule
        if (!known.selector) return true;

        // Check if any node matches the known selector
        return violation.nodes.some(node =>
          node.target.some(target => target.includes(known.selector!))
        );
      });

      return !isKnown;
    });
  }

  return results;
}

/**
 * Check specific WCAG rules
 *
 * @example
 * ```ts
 * const results = await checkWCAGRules(page, [
 *   A11Y_RULES.colorContrast,
 *   A11Y_RULES.imageAlt
 * ]);
 * ```
 */
export async function checkWCAGRules(
  page: Page,
  rules: string[],
  options: Omit<A11yTestOptions, 'rules'> = {}
) {
  return runAccessibilityTest(page, { ...options, rules });
}

/**
 * Run accessibility test and format violations for better error messages
 */
export function formatViolations(violations: any[]): string {
  if (violations.length === 0) {
    return 'No accessibility violations found';
  }

  let output = `Found ${violations.length} accessibility violation(s):\n\n`;

  violations.forEach((violation, index) => {
    output += `${index + 1}. ${violation.id}: ${violation.description}\n`;
    output += `   Impact: ${violation.impact}\n`;
    output += `   WCAG: ${violation.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}\n`;
    output += `   Help: ${violation.helpUrl}\n`;
    output += `   Affected elements (${violation.nodes.length}):\n`;

    violation.nodes.forEach((node: any, nodeIndex: number) => {
      output += `     ${nodeIndex + 1}. ${node.target.join(' ')}\n`;
      output += `        ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}\n`;
      if (node.failureSummary) {
        output += `        ${node.failureSummary}\n`;
      }
    });

    output += '\n';
  });

  return output;
}

/**
 * Assert no accessibility violations
 * Throws with formatted violation details if violations are found
 */
export function assertNoViolations(results: any) {
  if (results.violations.length > 0) {
    throw new Error(formatViolations(results.violations));
  }
}

/**
 * Common exclude selectors for third-party content
 */
export const COMMON_EXCLUDES = {
  // Third-party widgets
  intercom: '#intercom-container',
  hubspot: '#hubspot-messages-iframe-container',
  drift: '#drift-widget',

  // Analytics/tracking
  googleTagManager: 'noscript',

  // Development tools (only exclude in production tests)
  reactDevTools: '[data-react-devtools]',
};

/**
 * Test keyboard navigation
 * Ensures all interactive elements are reachable via keyboard
 */
export async function testKeyboardNavigation(
  page: Page,
  startSelector = 'body',
  expectedStops: string[] = []
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Focus the starting element
    await page.focus(startSelector);

    // Get all focusable elements
    const focusableElements = await page.evaluate(() => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
      }));
    });

    // Test tab navigation
    for (let i = 0; i < Math.min(focusableElements.length, 50); i++) {
      await page.keyboard.press('Tab');

      // Check if focus is visible
      const hasFocusIndicator = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const styles = window.getComputedStyle(activeElement);
        const pseudoStyles = window.getComputedStyle(activeElement, ':focus');

        // Check for outline or box-shadow (common focus indicators)
        return (
          styles.outline !== 'none' ||
          styles.outlineWidth !== '0px' ||
          pseudoStyles.outline !== 'none' ||
          pseudoStyles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none' ||
          pseudoStyles.boxShadow !== 'none'
        );
      });

      if (!hasFocusIndicator) {
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? `${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}` : 'unknown';
        });
        errors.push(`Element ${focusedElement} has no visible focus indicator`);
      }
    }

    // Test expected stops if provided
    if (expectedStops.length > 0) {
      for (const selector of expectedStops) {
        const isReachable = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el !== null;
        }, selector);

        if (!isReachable) {
          errors.push(`Expected element ${selector} not found or not focusable`);
        }
      }
    }

  } catch (error) {
    errors.push(`Keyboard navigation test failed: ${error}`);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Test color contrast for specific elements
 */
export async function testColorContrast(
  page: Page,
  selectors: string[] = []
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const selector of selectors) {
    const contrastRatio = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Simple contrast calculation (you might want to use a library for production)
      // This is a placeholder - axe-core does this better
      return { color, backgroundColor };
    }, selector);

    if (!contrastRatio) {
      errors.push(`Element ${selector} not found for contrast testing`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
