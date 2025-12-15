import { NextRequest, NextResponse } from 'next/server';
import { serverCache, CACHE_TTL, marketCacheKey } from '@/lib/cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Popular symbols for local fallback when backend is unavailable
const FALLBACK_SYMBOLS = [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', class: 'us_equity', exchange: 'ARCA' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', class: 'us_equity', exchange: 'ARCA' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', class: 'us_equity', exchange: 'ARCA' },
    { symbol: 'AAPL', name: 'Apple Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', class: 'us_equity', exchange: 'NASDAQ' },
    { symbol: 'BTC/USD', name: 'Bitcoin', class: 'crypto', exchange: 'CRYPTO' },
    { symbol: 'ETH/USD', name: 'Ethereum', class: 'crypto', exchange: 'CRYPTO' },
    { symbol: 'DOGE/USD', name: 'Dogecoin', class: 'crypto', exchange: 'CRYPTO' },
    { symbol: 'XRP/USD', name: 'Ripple', class: 'crypto', exchange: 'CRYPTO' },
];

interface Asset {
    symbol: string;
    name: string;
    class: string;
    exchange: string;
}

interface AssetsResponse {
    assets: Asset[];
    fallback?: boolean;
    warning?: string;
    cached?: boolean;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const assetClass = searchParams.get('class'); // 'us_equity', 'crypto', or undefined for all

    // Check cache first
    const cacheKey = marketCacheKey('assets', { search, limit, class: assetClass || undefined });
    const cached = serverCache.get<AssetsResponse>(cacheKey);

    if (cached) {
        return NextResponse.json({ ...cached, cached: true });
    }

    try {
        // Try to fetch from backend which calls Alpaca
        const response = await fetch(
            `${API_BASE_URL}/api/market/assets?search=${encodeURIComponent(search)}&limit=${limit}${assetClass ? `&class=${assetClass}` : ''}`,
            {
                headers: { 'Content-Type': 'application/json' },
                // Use next.js revalidation for edge caching
                next: { revalidate: CACHE_TTL.ASSETS },
            }
        );

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        serverCache.set(cacheKey, data, CACHE_TTL.ASSETS);

        return NextResponse.json(data);
    } catch (error) {
        // Fallback to local search when backend unavailable
        console.warn('Backend unavailable for assets, using fallback:', error);

        const searchLower = search.toLowerCase();
        const filtered = FALLBACK_SYMBOLS.filter(asset => {
            const matchesSearch = !search ||
                asset.symbol.toLowerCase().includes(searchLower) ||
                asset.name.toLowerCase().includes(searchLower);
            const matchesClass = !assetClass || asset.class === assetClass;
            return matchesSearch && matchesClass;
        }).slice(0, limit);

        const fallbackResponse: AssetsResponse = {
            assets: filtered,
            fallback: true,
            warning: 'Using local symbol list - backend unavailable'
        };

        // Don't cache fallback responses for long
        serverCache.set(cacheKey, fallbackResponse, 60);

        return NextResponse.json(fallbackResponse);
    }
}
