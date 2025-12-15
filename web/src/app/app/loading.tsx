/**
 * Loading skeleton for main app route
 * Matches DeepStackLayout structure for smooth transitions
 * High-fidelity skeletons match actual UI structure
 */
export default function Loading() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Simulated Mobile Header - matches MobileHeader structure */}
      <div className="md:hidden h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Menu button */}
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          {/* Logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/20 animate-pulse" />
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
          </div>
          {/* Settings button */}
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>

      {/* Simulated Streaming Ticker (desktop only) - LED style */}
      <div className="hidden md:block h-9 border-b border-border led-ticker-container">
        <div className="h-full px-4 flex items-center gap-6">
          {/* Connection dot placeholder */}
          <div className="h-2 w-2 rounded-full bg-green-500/50 animate-pulse" />
          {/* Ticker items - match actual ticker structure */}
          {['SPY', 'QQQ', 'NVDA', 'AAPL', 'BTC'].map((symbol, i) => (
            <div key={i} className="flex items-center gap-3 whitespace-nowrap">
              <span className={`font-mono font-bold text-sm tracking-wide ${i === 4 ? 'text-amber-400/50' : 'text-primary/50'} animate-pulse`}>
                {symbol}
              </span>
              <span className="font-mono text-sm text-foreground/30 animate-pulse">
                —
              </span>
              <span className="flex items-center gap-1 font-mono text-sm text-muted-foreground/50 animate-pulse">
                <span className="text-base leading-none">↑</span>
                <span>—%</span>
              </span>
              <span className="text-primary/20 mx-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton - matches LeftSidebar structure */}
        <aside className="hidden md:flex md:flex-col w-64 border-r border-sidebar-border bg-sidebar">
          {/* Header with Logo & Toggle */}
          <div className="flex items-center justify-between h-14 border-b border-sidebar-border px-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary/30 animate-pulse" />
              <div className="h-5 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          </div>

          {/* New Chat Button */}
          <div className="p-2">
            <div className="w-full h-11 rounded-xl bg-primary/30 animate-pulse flex items-center justify-start px-4 gap-2">
              <div className="h-4 w-4 rounded bg-primary-foreground/30" />
              <div className="h-4 w-16 rounded bg-primary-foreground/30" />
            </div>
          </div>

          {/* Research Tools Section */}
          <div className="px-2 space-y-1 border-b border-sidebar-border pb-3 mb-3">
            <div className="px-1 py-1">
              <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
            </div>
            {/* Thesis Engine */}
            <div className="w-full h-10 rounded-xl bg-muted/50 animate-pulse flex items-center px-3 gap-2">
              <div className="h-4 w-4 rounded bg-amber-500/40" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            {/* Trade Journal */}
            <div className="w-full h-10 rounded-xl bg-muted/50 animate-pulse flex items-center px-3 gap-2">
              <div className="h-4 w-4 rounded bg-blue-500/40" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
            {/* Insights */}
            <div className="w-full h-10 rounded-xl bg-muted/50 animate-pulse flex items-center px-3 gap-2">
              <div className="h-4 w-4 rounded bg-purple-500/40" />
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
            {/* Watchlists */}
            <div className="w-full h-10 rounded-xl bg-muted/50 animate-pulse flex items-center px-3 gap-2">
              <div className="h-4 w-4 rounded bg-green-500/40" />
              <div className="h-4 w-18 rounded bg-muted" />
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 px-2 overflow-hidden">
            {/* Today group */}
            <div className="mb-4">
              <div className="px-3 py-1">
                <div className="h-2.5 w-10 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-10 rounded-xl bg-muted/40 animate-pulse flex items-center px-3 gap-2">
                    <div className="h-4 w-4 rounded bg-muted" />
                    <div className="h-3.5 w-32 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
            {/* Yesterday group */}
            <div className="mb-4">
              <div className="px-3 py-1">
                <div className="h-2.5 w-16 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="w-full h-10 rounded-xl bg-muted/40 animate-pulse flex items-center px-3 gap-2">
                    <div className="h-4 w-4 rounded bg-muted" />
                    <div className="h-3.5 w-28 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section - User Menu */}
          <div className="mt-auto border-t border-sidebar-border p-2">
            <div className="w-full h-12 rounded-xl bg-muted/50 animate-pulse flex items-center px-3 gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="h-2.5 w-32 rounded bg-muted/60" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            {/* Centered Loading Spinner with deepstack branding */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded bg-primary/30 animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Loading deepstack...</p>
            </div>
          </div>
        </main>

        {/* Right Toolbar Skeleton (desktop only) */}
        <aside className="hidden xl:flex xl:flex-col w-12 border-l border-border bg-card">
          <div className="p-2 space-y-2 mt-2">
            {/* Tool icons - Chart, Portfolio, Alerts, Settings */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 w-9 mx-auto rounded-lg bg-muted/60 animate-pulse" />
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation - matches BottomNav structure */}
      <div className="md:hidden h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
        <div className="h-full px-6 flex items-center justify-around">
          {/* Chat, Markets, Portfolio, Settings */}
          {[
            { label: 'Chat', active: true },
            { label: 'Markets', active: false },
            { label: 'Portfolio', active: false },
            { label: 'Settings', active: false },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`h-6 w-6 rounded-lg ${item.active ? 'bg-primary/40' : 'bg-muted/60'} animate-pulse`} />
              <div className={`h-2 w-10 rounded ${item.active ? 'bg-primary/30' : 'bg-muted/40'} animate-pulse`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
