"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { MarketDataProvider } from '@/components/providers/MarketDataProvider'

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <MarketDataProvider autoConnect={true}>
          {children}
        </MarketDataProvider>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
