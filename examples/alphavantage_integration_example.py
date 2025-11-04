"""
Alpha Vantage Integration Example

Demonstrates usage of AlphaVantageClient for:
- Retrieving company fundamentals
- Getting earnings data
- Fetching company overview
- Handling rate limits
- Using cache effectively
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.data.alphavantage_client import AlphaVantageClient

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def basic_usage_example():
    """Basic usage of AlphaVantageClient."""
    logger.info("=" * 80)
    logger.info("Basic Usage Example")
    logger.info("=" * 80)

    # Initialize client with API key from environment
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("ALPHA_VANTAGE_API_KEY not set in environment")
        return

    client = AlphaVantageClient(api_key=api_key)

    try:
        # Test health check
        logger.info("\n1. Testing API connectivity...")
        is_healthy = await client.health_check()
        logger.info(f"   Health check: {'PASSED' if is_healthy else 'FAILED'}")

        if not is_healthy:
            logger.error("   API not accessible. Check your API key.")
            return

        # Get company overview
        logger.info("\n2. Fetching company overview for AAPL...")
        overview = await client.get_company_overview("AAPL")

        if overview:
            logger.info(f"   Company: {overview['name']}")
            logger.info(f"   Sector: {overview['sector']}")
            logger.info(f"   Industry: {overview['industry']}")
            logger.info(
                f"   Market Cap: ${overview['market_cap']:,.0f}"
                if overview["market_cap"]
                else "   Market Cap: N/A"
            )
            logger.info(f"   P/E Ratio: {overview['pe_ratio']}")
            logger.info(
                f"   ROE: {overview['roe']:.2%}" if overview["roe"] else "   ROE: N/A"
            )
        else:
            logger.warning("   No overview data retrieved")

        # Get fundamental metrics
        logger.info("\n3. Fetching fundamental metrics for AAPL...")
        fundamentals = await client.get_fundamentals("AAPL")

        if fundamentals:
            logger.info(f"   P/E Ratio: {fundamentals['pe_ratio']}")
            logger.info(f"   P/B Ratio: {fundamentals['pb_ratio']}")
            logger.info(
                f"   ROE: {fundamentals['roe']:.2%}"
                if fundamentals["roe"]
                else "   ROE: N/A"
            )
            logger.info(f"   Debt/Equity: {fundamentals['debt_to_equity']}")
            logger.info(
                f"   Profit Margin: {fundamentals['profit_margin']:.2%}"
                if fundamentals["profit_margin"]
                else "   Profit Margin: N/A"
            )
        else:
            logger.warning("   No fundamental data retrieved")

        # Get earnings data
        logger.info("\n4. Fetching earnings data for AAPL...")
        earnings = await client.get_earnings("AAPL")

        if earnings:
            logger.info(f"   Quarterly earnings: {len(earnings['quarterly'])} quarters")
            logger.info(f"   Annual earnings: {len(earnings['annual'])} years")

            if earnings["quarterly"]:
                latest = earnings["quarterly"][0]
                logger.info("\n   Latest Quarter:")
                logger.info(f"     Fiscal Date: {latest['fiscal_date_ending']}")
                logger.info(f"     Reported EPS: ${latest['reported_eps']}")
                logger.info(f"     Estimated EPS: ${latest['estimated_eps']}")
                logger.info(
                    f"     Surprise: {latest['surprise_percentage']:.2f}%"
                    if latest["surprise_percentage"]
                    else "     Surprise: N/A"
                )
        else:
            logger.warning("   No earnings data retrieved")

        # Show cache statistics
        logger.info("\n5. Cache statistics:")
        stats = client.get_cache_stats()
        logger.info(f"   Cached items: {stats['total_cached_items']}")
        logger.info(f"   Recent requests: {stats['recent_requests']}")
        logger.info(
            f"   Rate limit: {stats['rate_limit']}/{stats['rate_limit_window']}s"
        )

    finally:
        await client.close()
        logger.info("\n✓ Client session closed")


async def multiple_symbols_example():
    """Demonstrate fetching data for multiple symbols."""
    logger.info("\n" + "=" * 80)
    logger.info("Multiple Symbols Example")
    logger.info("=" * 80)

    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("ALPHA_VANTAGE_API_KEY not set in environment")
        return

    client = AlphaVantageClient(api_key=api_key)

    try:
        symbols = ["AAPL", "MSFT", "GOOGL"]

        logger.info(f"\nFetching overview for {len(symbols)} symbols...")
        logger.info("(This will respect rate limits - may take time)")

        for symbol in symbols:
            logger.info(f"\n{symbol}:")

            overview = await client.get_company_overview(symbol)
            if overview:
                logger.info(f"  Name: {overview['name']}")
                logger.info(f"  Sector: {overview['sector']}")
                logger.info(
                    f"  Market Cap: ${overview['market_cap']:,.0f}"
                    if overview["market_cap"]
                    else "  Market Cap: N/A"
                )
                logger.info(f"  P/E: {overview['pe_ratio']}")
            else:
                logger.warning(f"  No data available")

            # Small delay between requests to be polite
            await asyncio.sleep(0.5)

        # Show cache efficiency
        stats = client.get_cache_stats()
        logger.info(
            f"\nCache efficiency: {stats['total_cached_items']} items cached, "
            f"{stats['recent_requests']} API requests made"
        )

    finally:
        await client.close()


async def cache_demo_example():
    """Demonstrate caching effectiveness."""
    logger.info("\n" + "=" * 80)
    logger.info("Cache Demonstration Example")
    logger.info("=" * 80)

    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("ALPHA_VANTAGE_API_KEY not set in environment")
        return

    # Use shorter cache TTL for demo
    custom_ttl = {
        "fundamentals": 10,  # 10 seconds
        "earnings": 10,
        "insider": 10,
        "overview": 10,
    }

    client = AlphaVantageClient(api_key=api_key, cache_ttl=custom_ttl)

    try:
        logger.info("\n1. First request (will fetch from API)...")
        overview1 = await client.get_company_overview("AAPL")
        stats1 = client.get_cache_stats()
        logger.info(f"   API requests made: {stats1['recent_requests']}")
        logger.info(f"   Cached items: {stats1['total_cached_items']}")

        logger.info("\n2. Second request (will use cache)...")
        overview2 = await client.get_company_overview("AAPL")
        stats2 = client.get_cache_stats()
        logger.info(f"   API requests made: {stats2['recent_requests']}")
        logger.info(f"   Cached items: {stats2['total_cached_items']}")
        logger.info(f"   Same data returned: {overview1 == overview2}")

        logger.info("\n3. Waiting for cache to expire (11 seconds)...")
        await asyncio.sleep(11)

        logger.info("\n4. Third request (cache expired, will fetch from API)...")
        overview3 = await client.get_company_overview("AAPL")
        stats3 = client.get_cache_stats()
        logger.info(f"   API requests made: {stats3['recent_requests']}")
        logger.info(f"   Cached items: {stats3['total_cached_items']}")

        logger.info("\n5. Clearing cache manually...")
        client.clear_cache()
        stats4 = client.get_cache_stats()
        logger.info(f"   Cached items after clear: {stats4['total_cached_items']}")

    finally:
        await client.close()


async def error_handling_example():
    """Demonstrate error handling."""
    logger.info("\n" + "=" * 80)
    logger.info("Error Handling Example")
    logger.info("=" * 80)

    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("ALPHA_VANTAGE_API_KEY not set in environment")
        return

    client = AlphaVantageClient(api_key=api_key)

    try:
        # Test with invalid symbol
        logger.info("\n1. Testing with empty symbol...")
        result = await client.get_company_overview("")
        logger.info(f"   Result: {result}")

        # Test with symbol that doesn't exist
        logger.info("\n2. Testing with non-existent symbol...")
        result = await client.get_company_overview("NOTREAL12345")
        logger.info(f"   Result: {result}")

        # Test with invalid characters
        logger.info("\n3. Testing with invalid characters...")
        result = await client.get_company_overview("INVALID@SYMBOL")
        logger.info(f"   Result: {result}")

        logger.info("\n✓ Error handling working correctly")

    finally:
        await client.close()


async def deep_value_screening_example():
    """Example: Screen for deep value stocks using fundamental metrics."""
    logger.info("\n" + "=" * 80)
    logger.info("Deep Value Screening Example")
    logger.info("=" * 80)

    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("ALPHA_VANTAGE_API_KEY not set in environment")
        return

    client = AlphaVantageClient(api_key=api_key)

    try:
        # Sample of stocks to screen
        candidates = ["F", "T", "VZ", "PFE", "INTC"]

        logger.info("\nScreening for deep value opportunities...")
        logger.info("Criteria: P/E < 15, ROE > 10%, Profit Margin > 5%\n")

        results = []

        for symbol in candidates:
            logger.info(f"Analyzing {symbol}...")

            overview = await client.get_company_overview(symbol)
            if not overview:
                logger.info(f"  ⚠ No data available\n")
                continue

            pe = overview.get("pe_ratio")
            roe = overview.get("roe")
            margin = overview.get("profit_margin")

            logger.info(f"  P/E: {pe}")
            logger.info(f"  ROE: {roe:.2%}" if roe else "  ROE: N/A")
            logger.info(
                f"  Profit Margin: {margin:.2%}" if margin else "  Profit Margin: N/A"
            )

            # Check if meets criteria
            meets_criteria = (
                pe is not None
                and pe < 15
                and roe is not None
                and roe > 0.10
                and margin is not None
                and margin > 0.05
            )

            if meets_criteria:
                logger.info(f"  ✓ PASSED screening criteria")
                results.append(
                    {
                        "symbol": symbol,
                        "name": overview["name"],
                        "pe_ratio": pe,
                        "roe": roe,
                        "profit_margin": margin,
                    }
                )
            else:
                logger.info(f"  ✗ Did not meet criteria")

            logger.info("")
            await asyncio.sleep(0.5)  # Be polite to API

        # Show results
        logger.info("=" * 80)
        logger.info(f"Screening Results: {len(results)} stocks passed\n")

        for stock in results:
            logger.info(f"{stock['symbol']} - {stock['name']}")
            logger.info(f"  P/E: {stock['pe_ratio']:.2f}")
            logger.info(f"  ROE: {stock['roe']:.2%}")
            logger.info(f"  Profit Margin: {stock['profit_margin']:.2%}\n")

    finally:
        await client.close()


async def main():
    """Run all examples."""
    try:
        # Check for API key
        if not os.getenv("ALPHA_VANTAGE_API_KEY"):
            logger.error("\n" + "!" * 80)
            logger.error("ALPHA_VANTAGE_API_KEY environment variable not set")
            logger.error("!" * 80)
            logger.error("\nPlease set your Alpha Vantage API key:")
            logger.error("  export ALPHA_VANTAGE_API_KEY='your_api_key_here'")
            logger.error(
                "\nGet a free API key at: https://www.alphavantage.co/support/#api-key"
            )
            return

        # Run examples
        await basic_usage_example()
        await asyncio.sleep(2)

        await multiple_symbols_example()
        await asyncio.sleep(2)

        await cache_demo_example()
        await asyncio.sleep(2)

        await error_handling_example()
        await asyncio.sleep(2)

        await deep_value_screening_example()

        logger.info("\n" + "=" * 80)
        logger.info("All examples completed successfully!")
        logger.info("=" * 80)

    except KeyboardInterrupt:
        logger.info("\n\nExamples interrupted by user")
    except Exception as e:
        logger.error(f"\n\nError running examples: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
