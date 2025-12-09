import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import Providers from '@/components/providers'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner'
import { WelcomeModal } from '@/components/onboarding'

// iOS-optimized viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Enables safe-area-inset-* CSS env() variables for notch
}

export const metadata: Metadata = {
  title: 'DeepStack',
  description: 'AI-powered trading assistant with emotional discipline frameworks',
  keywords: ['trading', 'AI', 'stock analysis', 'portfolio tracker', 'options', 'emotional firewall'],
  authors: [{ name: 'DeepStack' }],

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
    title: 'DeepStack',
    description: 'AI-powered trading assistant with emotional discipline frameworks',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/landing-preview.png', width: 1280, height: 720 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeepStack',
    description: 'AI-powered trading assistant with emotional discipline frameworks',
    images: ['/landing-preview.png'],
  },

  // PWA / iOS home screen app
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DeepStack',
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

  // Theme color for browser chrome
  themeColor: '#b8860b',
}


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>
          <WelcomeModal />
          <PaywallModal />
          <div className="pb-24">
            {children}
          </div>
          <DisclaimerBanner />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
