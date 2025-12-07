"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { MarketDataProvider } from '@/components/providers/MarketDataProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ErrorBoundary } from '@/components/error'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={true}
        disableTransitionOnChange
      >
        <AuthProvider>
          <OfflineBanner />
          <ErrorBoundary level="page">
            <MarketDataProvider autoConnect={true}>
              {children}
            </MarketDataProvider>
          </ErrorBoundary>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
