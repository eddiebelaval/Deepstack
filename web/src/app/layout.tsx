import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const metadata: Metadata = {
  title: 'DeepStack',
  description: 'Autonomous trading agent powered by Claude',
}

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen grid grid-rows-[auto_1fr]">
            <nav className="border-b border-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="font-mono font-bold text-green-400">DEEPSTACK</div>
              <div id="automation-controls" className="flex gap-2 text-sm">
                {/* Placeholder controls; wired on pages */}
              </div>
            </nav>
            <main className="p-4 max-w-7xl mx-auto w-full">{children}</main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  )
}
