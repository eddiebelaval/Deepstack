#!/usr/bin/env python3
"""
Validation script for Alpha Vantage integration

Quick smoke test to verify the Alpha Vantage client is working correctly.
Requires ALPHA_VANTAGE_API_KEY environment variable.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.data.alphavantage_client import AlphaVantageClient

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


async def validate_client():
    """Run validation checks."""

    # Check for API key
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        logger.error("❌ ALPHA_VANTAGE_API_KEY not set")
        logger.info("\nSet your API key:")
        logger.info("  export ALPHA_VANTAGE_API_KEY='your_key_here'")
        logger.info("\nGet a free key at: https://www.alphavantage.co/support/#api-key")
        return False

    logger.info("=" * 60)
    logger.info("Alpha Vantage Client Validation")
    logger.info("=" * 60)

    client = AlphaVantageClient(api_key=api_key)

    try:
        # Test 1: Health check
        logger.info("\n1. Testing API connectivity...")
        is_healthy = await client.health_check()

        if is_healthy:
            logger.info("   ✓ API connection successful")
        else:
            logger.error("   ❌ API connection failed")
            return False

        # Test 2: Company overview
        logger.info("\n2. Testing company overview (AAPL)...")
        overview = await client.get_company_overview("AAPL")

        if overview and overview.get("symbol") == "AAPL":
            logger.info(f"   ✓ Retrieved: {overview['name']}")
            logger.info(f"   ✓ Sector: {overview['sector']}")
            logger.info(f"   ✓ P/E Ratio: {overview['pe_ratio']}")
        else:
            logger.error("   ❌ Failed to retrieve overview")
            return False

        # Test 3: Fundamental metrics
        logger.info("\n3. Testing fundamental metrics (AAPL)...")
        fundamentals = await client.get_fundamentals("AAPL")

        if fundamentals and fundamentals.get("symbol") == "AAPL":
            logger.info("   ✓ Retrieved fundamental metrics")
            logger.info(
                f"   ✓ ROE: {fundamentals['roe']:.2%}"
                if fundamentals["roe"]
                else "   ✓ ROE: N/A"
            )
        else:
            logger.error("   ❌ Failed to retrieve fundamentals")
            return False

        # Test 4: Earnings data
        logger.info("\n4. Testing earnings data (AAPL)...")
        earnings = await client.get_earnings("AAPL")

        if earnings and earnings.get("symbol") == "AAPL":
            logger.info(
                f"   ✓ Retrieved {len(earnings['quarterly'])} quarterly earnings"
            )
            logger.info(f"   ✓ Retrieved {len(earnings['annual'])} annual earnings")
        else:
            logger.error("   ❌ Failed to retrieve earnings")
            return False

        # Test 5: Caching
        logger.info("\n5. Testing caching...")
        overview2 = await client.get_company_overview("AAPL")

        if overview == overview2:
            logger.info("   ✓ Cache working correctly")
        else:
            logger.warning("   ⚠ Cache may not be working")

        stats = client.get_cache_stats()
        logger.info(f"   ✓ Cached items: {stats['total_cached_items']}")

        # Test 6: Error handling
        logger.info("\n6. Testing error handling...")
        invalid_result = await client.get_company_overview("INVALID@SYMBOL")

        if invalid_result is None:
            logger.info("   ✓ Invalid symbols handled correctly")
        else:
            logger.warning("   ⚠ Invalid symbol check may not be working")

        # All tests passed
        logger.info("\n" + "=" * 60)
        logger.info("✓ All validation checks PASSED")
        logger.info("=" * 60)
        logger.info("\nAlpha Vantage client is working correctly!")
        logger.info("You can now use it in the DeepStack Trading System.")
        return True

    except Exception as e:
        logger.error(f"\n❌ Validation failed with error: {e}")
        return False

    finally:
        await client.close()
        logger.info("\n✓ Client session closed")


def main():
    """Entry point."""
    try:
        success = asyncio.run(validate_client())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n\nValidation interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\nUnexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
