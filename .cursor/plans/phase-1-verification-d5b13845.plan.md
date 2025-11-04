<!-- d5b13845-d860-4545-897e-b18ce444b79f 479d0a78-c0b5-4ca0-8233-91fa889ad107 -->
# React Web UI for DeepStack

## Clarifications (answer briefly)

1) React stack?

- a) Next.js 14 (App Router) + TypeScript + Tailwind (default)
- b) Vite + React + TypeScript + MUI
2) UI kit?
- a) Tailwind (default)
- b) MUI
- c) Chakra

If you don’t choose, I’ll proceed with a) Next.js + Tailwind.

## High-Level Design

- Create `web/` as a separate React app consuming the existing FastAPI API and WebSocket.
- Keep CLI intact; web UI runs concurrently (`localhost:5173/3000`), backend on `:8000`.
- Client-side API SDK mirrors CLI `APIClient` with fetch/axios.
- Pages/Routes:
- `/` Dashboard: portfolio summary, recent activity
- `/positions` Positions table with P&L
- `/risk` Risk metrics (heat, Kelly, loss limits)
- `/scanner` Market scanner with strategy filter and details
- Global controls: Start/Stop automation; Status indicator
- Real-time: WebSocket `/ws` for status/positions/alerts; fallback to polling.
- State: React Query for data fetching + caching; lightweight Zustand for UI state.
- Theming: Tailwind; responsive, dark mode optional.

## Implementation Steps

1) Bootstrap app

- Next.js 14 + TS + Tailwind in `web/`
- Env config: `NEXT_PUBLIC_API_URL` default `http://127.0.0.1:8000`
- CORS already allowed in FastAPI; verify origins include `http://localhost:3000`

2) API SDK

- Port CLI `APIClient` to `web/src/lib/api.ts` (health, quote, positions, account, orders, automation start/stop/status)
- React Query hooks: `useHealth`, `usePositions`, `useAccount`, `useAutomationStatus`

3) Pages & Components

- Layout: top navbar (status, automation buttons), sidebar/nav
- Dashboard: summary cards, activity list, quick actions
- Positions: virtualized table (TanStack Table), sorting, P&L coloring
- Risk: metrics grid, heat/kelly, loss limits, gauges
- Scanner: strategy selector, results list, details drawer

4) Realtime Updates

- WebSocket client to `/ws`; context provider broadcasts updates to pages
- Auto-reconnect; debounce UI updates

5) Automation Controls

- Buttons: Start (cadence select), Stop, Status pill
- Toasts/snackbars on actions; error handling

6) QA & Polishing

- Error states, loading skeletons, empty states
- Mobile-friendly responsive layout
- Linting/formatting: ESLint + Prettier

7) Docs & Scripts

- `web/README.md` with `pnpm|npm` scripts
- Update root README with web UI section

## Acceptance Criteria

- All pages load and display live data from FastAPI
- Start/Stop automation works from the navbar
- Positions/risk/quotes/scan render without errors
- WebSocket updates reflect in UI within ~1s (or polling fallback)

## Deliverables

- `web/` Next.js project
- API SDK + hooks
- 4 feature pages with shared layout and components
- Documentation and run scripts

### To-dos

- [ ] Audit StrategyAgent outputs vs deep value + squeeze criteria
- [ ] Validate portfolio heat, caps, and stop logic with samples
- [ ] Verify OrderManager + PaperTrader order flow and persistence
- [ ] Exercise /automation endpoints and orchestrator cycle
- [ ] Probe API endpoints and CLI direct commands behavior
- [ ] Validate config loading, defaults, and env overrides
- [ ] Check WebSocket endpoint and logging presence
- [ ] Produce markdown audit report with issues and fixes