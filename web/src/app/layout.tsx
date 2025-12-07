import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import Providers from '@/components/providers'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner'

export const metadata: Metadata = {
  title: 'DeepStack',
  description: 'Autonomous trading agent powered by Claude',
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
      </body>
    </html>
  )
}
