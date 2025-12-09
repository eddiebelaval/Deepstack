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
  openGraph: {
    title: 'DeepStack',
    description: 'AI-powered trading assistant with emotional discipline frameworks',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeepStack',
    description: 'AI-powered trading assistant with emotional discipline frameworks',
  },
  // PWA / iOS home screen app
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DeepStack',
  },
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
