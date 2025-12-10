/**
 * Loading skeleton for main app route
 * Matches DeepStackLayout structure for smooth transitions
 */
export default function Loading() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Simulated Mobile Header */}
      <div className="md:hidden h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Simulated Streaming Ticker (desktop only) */}
      <div className="hidden md:block h-9 border-b border-border bg-card">
        <div className="h-full px-4 flex items-center gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <aside className="hidden md:block w-14 md:w-64 border-r border-border bg-card">
          <div className="p-4 space-y-3">
            {/* New Chat Button */}
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />

            {/* Chat History Items */}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            {/* Centered Loading Spinner */}
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Loading deepstack...</p>
            </div>
          </div>
        </main>

        {/* Right Toolbar Skeleton (desktop only) */}
        <aside className="hidden xl:block w-12 border-l border-border bg-card">
          <div className="p-2 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-8 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full px-6 flex items-center justify-around">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-6 w-6 rounded bg-muted animate-pulse" />
              <div className="h-2 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
