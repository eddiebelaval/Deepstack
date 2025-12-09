import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import packageJson from "./package.json";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable in development and when using Turbopack (not supported yet)
  disable: process.env.NODE_ENV === "development" || process.env.TURBOPACK === "1",
});

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
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
