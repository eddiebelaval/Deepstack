import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, StaleWhileRevalidate, CacheFirst } from "serwist";

// Declare global types for service worker
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Network First for API routes (fresh data is essential for trading)
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        plugins: [],
      }),
    },
    // Network Only for authentication (never cache auth)
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.includes("/auth/") ||
        url.origin.includes("supabase"),
      handler: new NetworkOnly(),
    },
    // Network Only for trade execution (never cache trades!)
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.includes("/trade") ||
        url.pathname.includes("/order") ||
        url.origin.includes("alpaca"),
      handler: new NetworkOnly(),
    },
    // Stale While Revalidate for images
    {
      matcher: ({ request }: { request: Request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "image-cache",
        plugins: [],
      }),
    },
    // Cache First for static assets (fonts, scripts)
    {
      matcher: ({ request }: { request: Request }) =>
        request.destination === "font" ||
        request.destination === "script" ||
        request.destination === "style",
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [],
      }),
    },
    // Default cache strategy from Serwist
    ...defaultCache,
  ],
  // Offline fallback
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }: { request: Request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
