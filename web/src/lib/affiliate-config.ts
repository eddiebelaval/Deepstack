/**
 * Affiliate partner configuration
 * Replace placeholder URLs with actual referral links when available
 */

export interface AffiliatePartner {
  id: string;
  name: string;
  referralUrl: string;
  tagline: string;
  cta: string;
  icon: 'alpaca' | 'robinhood' | 'webull';
  enabled: boolean;
}

export const AFFILIATES: Record<string, AffiliatePartner> = {
  // Primary: Alpaca (already integrated with deepstack API)
  // Apply for partnership: https://alpacamarkets.typeform.com/to/y2O8bdBA
  alpaca: {
    id: 'alpaca',
    name: 'Alpaca',
    referralUrl: 'https://app.alpaca.markets/signup', // Update with partner link once approved
    tagline: 'Commission-free stocks & ETFs',
    cta: 'Open Account',
    icon: 'alpaca',
    enabled: true,
  },
  // Secondary: Robinhood affiliate program
  // Apply at: https://app.impact.com/campaign-mediapartner-signup/Robinhood.brand?execution=e1s1
  robinhood: {
    id: 'robinhood',
    name: 'Robinhood',
    referralUrl: 'https://robinhood.com/signup', // Replace with Impact Radius affiliate link once approved
    tagline: 'Start investing today',
    cta: 'Get Started',
    icon: 'robinhood',
    enabled: false, // Enable once affiliate approved
  },
  // Tertiary: Webull affiliate program
  // Apply at: https://act.webullapp.com/mktb/partners/individual (need 5k+ followers)
  webull: {
    id: 'webull',
    name: 'Webull',
    referralUrl: 'https://www.webull.com/activity', // Replace with affiliate link once approved
    tagline: 'Zero commission trading',
    cta: 'Open Account',
    icon: 'webull',
    enabled: false, // Enable once affiliate approved
  },
};

// Get the primary enabled affiliate
export function getPrimaryAffiliate(): AffiliatePartner | null {
  const enabled = Object.values(AFFILIATES).filter(a => a.enabled);
  return enabled[0] || null;
}

// Storage key for dismissed affiliates
export const AFFILIATE_DISMISSED_KEY = 'deepstack_affiliate_dismissed';

// Check if user has dismissed the affiliate widget
export function isAffiliateDismissed(affiliateId: string): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(AFFILIATE_DISMISSED_KEY);
  if (!dismissed) return false;
  try {
    const parsed = JSON.parse(dismissed);
    return parsed[affiliateId] === true;
  } catch {
    return false;
  }
}

// Dismiss an affiliate widget
export function dismissAffiliate(affiliateId: string): void {
  if (typeof window === 'undefined') return;
  const dismissed = localStorage.getItem(AFFILIATE_DISMISSED_KEY);
  let parsed: Record<string, boolean> = {};
  try {
    if (dismissed) parsed = JSON.parse(dismissed);
  } catch {
    // ignore
  }
  parsed[affiliateId] = true;
  localStorage.setItem(AFFILIATE_DISMISSED_KEY, JSON.stringify(parsed));
}

// Track affiliate click for analytics
export function trackAffiliateClick(affiliateId: string, context: 'sidebar' | 'chat'): void {
  // TODO: Implement analytics tracking (Posthog, Mixpanel, etc.)
  console.log(`[Affiliate] Click: ${affiliateId} from ${context}`);
}
