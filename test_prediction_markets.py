#!/usr/bin/env python3
"""
Test script for Prediction Markets API endpoints

Tests the following endpoints:
- GET /api/predictions/trending
- GET /api/predictions/search?q=fed
- GET /api/predictions/market/{platform}/{market_id}
- GET /api/predictions/categories
- GET /api/predictions/health
"""

import asyncio
import sys
from pathlib import Path

# Add core to path
sys.path.insert(0, str(Path(__file__).parent))

from core.data.prediction_markets import (
    KalshiClient,
    PolymarketClient,
    PredictionMarketManager,
)


async def test_kalshi_client():
    """Test Kalshi client directly."""
    print("\n=== Testing Kalshi Client ===")
    client = KalshiClient()

    try:
        # Test get markets
        print("\n1. Fetching Kalshi markets...")
        data = await client.get_markets(status="open", limit=5)
        markets = data.get("markets", [])
        print(f"   Found {len(markets)} markets")

        if markets:
            # Test normalize market
            print("\n2. Normalizing first market...")
            normalized = client.normalize_market(markets[0])
            print(f"   Title: {normalized.title}")
            print(f"   Yes Price: {normalized.yes_price:.2%}")
            print(f"   Volume: ${normalized.volume:,.0f}")
            print(f"   URL: {normalized.url}")

            # Test get single market
            print("\n3. Fetching single market...")
            ticker = markets[0].get("ticker")
            if ticker:
                market = await client.get_market(ticker)
                if market:
                    print(f"   Retrieved: {market.get('title')}")

        print("\n4. Searching markets...")
        results = await client.search_markets("fed")
        print(f"   Search 'fed' found {len(results)} markets")

    finally:
        await client.close()

    print("\nKalshi client test PASSED")


async def test_polymarket_client():
    """Test Polymarket client directly."""
    print("\n=== Testing Polymarket Client ===")
    client = PolymarketClient()

    try:
        # Test get markets
        print("\n1. Fetching Polymarket markets...")
        markets = await client.get_markets(limit=5, active=True)
        print(f"   Found {len(markets)} markets")

        if markets:
            # Test normalize market
            print("\n2. Normalizing first market...")
            normalized = client.normalize_market(markets[0])
            print(f"   Title: {normalized.title}")
            print(f"   Yes Price: {normalized.yes_price:.2%}")
            print(f"   Volume: ${normalized.volume:,.0f}")
            print(f"   URL: {normalized.url}")

        print("\n3. Searching markets...")
        results = await client.search_markets("trump")
        print(f"   Search 'trump' found {len(results)} markets")

    finally:
        await client.close()

    print("\nPolymarket client test PASSED")


async def test_manager():
    """Test PredictionMarketManager."""
    print("\n=== Testing PredictionMarketManager ===")
    manager = PredictionMarketManager()

    try:
        # Test trending markets
        print("\n1. Fetching trending markets...")
        markets = await manager.get_trending_markets(limit=10)
        print(f"   Found {len(markets)} trending markets")

        for i, market in enumerate(markets[:3], 1):
            print(f"   {i}. [{market.platform.value}] {market.title[:60]}")
            print(f"      Yes: {market.yes_price:.2%} | Volume: ${market.volume:,.0f}")

        # Test search
        print("\n2. Searching across platforms...")
        results = await manager.search("election")
        print(f"   Search 'election' found {len(results)} markets")

        # Test categories
        print("\n3. Fetching categories...")
        categories = await manager.get_categories()
        print(f"   Kalshi categories: {', '.join(categories['kalshi'][:5])}")
        print(f"   Polymarket categories: {', '.join(categories['polymarket'][:5])}")

        # Test market detail
        if markets:
            print("\n4. Fetching market detail...")
            market = markets[0]
            detail = await manager.get_market_detail(market.platform, market.id)
            if detail:
                print(f"   Retrieved: {detail.title}")

    finally:
        await manager.close()

    print("\nManager test PASSED")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("PREDICTION MARKETS API TEST SUITE")
    print("=" * 60)

    try:
        await test_kalshi_client()
        await test_polymarket_client()
        await test_manager()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED")
        print("=" * 60)
        return 0

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"TEST FAILED: {e}")
        print("=" * 60)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
