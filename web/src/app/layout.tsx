import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Providers from '@/components/providers'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner'
import { TourProvider, TourOverlay } from '@/components/onboarding'
import { TrialGlobalBanner } from '@/components/trial/TrialCountdownBanner'

// Urbanist font for brand name - Regular 400 weight only
const urbanist = localFont({
  src: '../fonts/Urbanist-VariableFont_wght.ttf',
  weight: '400',
  variable: '--font-urbanist',
  display: 'swap',
})

// iOS-optimized viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Enables safe-area-inset-* CSS env() variables for notch
  themeColor: '#b8860b', // Theme color for browser chrome
}

export const metadata: Metadata = {
  title: 'deepstack',
  description: 'AI-powered trading assistant with emotional discipline frameworks',
  keywords: ['trading', 'AI', 'stock analysis', 'portfolio tracker', 'options', 'emotional firewall'],
  authors: [{ name: 'deepstack' }],
  metadataBase: new URL('https://deepstack.trade'),

  // PWA manifest
  manifest: '/manifest.json',

  // Icons for all platforms
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  openGraph: {
    title: 'deepstack - Process Integrity Platform',
    description: 'Know. Refine. Act with Foundation. AI-powered trading assistant that tracks research quality, thesis maturity, and conviction integrity.',
    type: 'website',
    locale: 'en_US',
    url: 'https://deepstack.trade',
    siteName: 'deepstack',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'deepstack - Process Integrity Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'deepstack - Process Integrity Platform',
    description: 'Know. Refine. Act with Foundation. AI-powered trading assistant that tracks research quality, thesis maturity, and conviction integrity.',
    images: ['/og-image.png'],
  },

  // PWA / iOS home screen app
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'deepstack',
    startupImage: [
      // iPhone SE, iPod touch 5th+ gen
      { url: '/splash/splash-640x1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone 8, 7, 6s, 6
      { url: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone X, XS, 11 Pro
      { url: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 12, 13, 14
      { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14 Pro
      { url: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14 Pro Max, 15 Pro Max
      { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
    ],
  },
}


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${urbanist.variable} dark h-full overflow-hidden`} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased app-height w-full overflow-hidden fixed inset-0 overscroll-none">
        <Providers>
          <TourProvider>
            <PaywallModal />
            <TrialGlobalBanner />
            <div className="h-full w-full overflow-hidden relative flex flex-col">
              {children}
            </div>
            <TourOverlay />
            <DisclaimerBanner />
          </TourProvider>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
