/**
 * URL Validation Utilities
 *
 * Validates URLs for security before rendering in img tags or links.
 * Prevents loading content from untrusted sources.
 */

/**
 * List of trusted domains for image/media content.
 * Add your Supabase storage domain and any CDNs you use.
 */
const TRUSTED_IMAGE_DOMAINS = [
  // Supabase storage
  'supabase.co',
  'supabase.in',
  // Common CDNs (add as needed)
  'cloudinary.com',
  'imgix.net',
  'unsplash.com',
  // Local development
  'localhost',
  '127.0.0.1',
];

/**
 * Validates that a URL is safe to use as an image source.
 *
 * @param url - The URL to validate
 * @returns true if the URL is from a trusted source
 *
 * @example
 * isValidImageUrl('https://xyz.supabase.co/storage/v1/object/public/screenshots/img.png') // true
 * isValidImageUrl('https://evil.com/tracking.gif') // false
 * isValidImageUrl('javascript:alert(1)') // false
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow https (and http for localhost)
    if (parsed.protocol !== 'https:') {
      if (parsed.protocol === 'http:' && !isLocalhost(parsed.hostname)) {
        return false;
      }
    }

    // Block javascript: and data: URLs (except safe data URIs)
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      // Allow data: URIs for images only
      if (parsed.protocol === 'data:' && url.startsWith('data:image/')) {
        return true;
      }
      return false;
    }

    // Check if domain is trusted
    return isTrustedDomain(parsed.hostname);
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Checks if a hostname is in the trusted domains list.
 */
function isTrustedDomain(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  return TRUSTED_IMAGE_DOMAINS.some((domain) => {
    const lowerDomain = domain.toLowerCase();
    // Match exact domain or subdomain
    return lowerHostname === lowerDomain || lowerHostname.endsWith(`.${lowerDomain}`);
  });
}

/**
 * Checks if a hostname is localhost.
 */
function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Sanitizes a URL for safe rendering. Returns empty string if invalid.
 *
 * @param url - The URL to sanitize
 * @param options - Validation options
 * @returns The original URL if valid, empty string otherwise
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  options: { allowAnyHttps?: boolean } = {}
): string {
  if (!url) {
    return '';
  }

  // If allowAnyHttps is true, just validate it's a proper https URL
  if (options.allowAnyHttps) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhost(parsed.hostname))) {
        return url;
      }
    } catch {
      return '';
    }
    return '';
  }

  // Otherwise use strict domain validation
  return isValidImageUrl(url) ? url : '';
}

/**
 * Creates a placeholder image URL for invalid/missing images.
 */
export function getPlaceholderImageUrl(width = 100, height = 100): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='%23374151' width='${width}' height='${height}'/%3E%3Ctext fill='%236B7280' font-family='sans-serif' font-size='12' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E`;
}

export default isValidImageUrl;
