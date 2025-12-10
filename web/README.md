# DeepStack Web

AI-powered trading assistant with real-time market data, portfolio tracking, and intelligent chat.

## Features

- **AI Chat Assistant** - Conversational interface for market analysis powered by Claude
- **Real-time Market Data** - Live quotes, charts, and watchlists via Alpaca API
- **Portfolio Tracking** - Track positions, P&L, and performance
- **Trading Journal** - Document trades with rich text and screenshots
- **Thesis Builder** - Structure and validate investment theses
- **Options Analysis** - Options chain viewer and strategy builder
- **Prediction Markets** - Track Polymarket and Kalshi contracts
- **Emotional Firewall** - Prevents impulsive trading decisions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Radix UI, shadcn/ui
- **State**: Zustand
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude via Vercel AI SDK
- **Charts**: Lightweight Charts
- **Testing**: Vitest + Playwright

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components organized by feature
├── lib/           # Utilities, stores, and shared logic
└── styles/        # Global styles
```

## Environment Variables

See `.env.example` for required variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `ANTHROPIC_API_KEY` - Claude API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key

## Deployment

Deployed on Vercel. Push to `main` triggers automatic deployment.

---

Built by [id8labs.app](https://id8labs.app)
