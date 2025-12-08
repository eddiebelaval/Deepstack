import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import Providers from '@/components/providers'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner'

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
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>
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
