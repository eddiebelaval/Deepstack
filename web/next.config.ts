import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";
import packageJson from "./package.json";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable in development and when using Turbopack (not supported yet)
  disable: process.env.NODE_ENV === "development" || process.env.TURBOPACK === "1",
});

// Content Security Policy configuration
// Reference: OWASP CSP Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://*.sentry.io;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CORS Headers - same-origin by default
          // Reference: OWASP CORS Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html
          {
            key: 'Access-Control-Allow-Origin',
            value: 'same-origin',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          // Content Security Policy
          // Mitigates: XSS (A7:2017), Injection (A03:2021)
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          // Existing security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Additional security headers
          // Prevents DNS prefetching to reduce privacy leaks
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          // Strict Transport Security - enforce HTTPS
          // Reference: OWASP HSTS - https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Permissions Policy - disable unnecessary browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry for error monitoring
const sentryConfig = withSentryConfig(withSerwist(nextConfig), {
  // Suppresses source map upload logs during build
  silent: true,
  // Upload source maps to Sentry for better stack traces
  widenClientFileUpload: true,
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});

export default sentryConfig;
