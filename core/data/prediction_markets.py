"""
Prediction Markets Data Integration

Provides unified API for prediction market data from:
- Kalshi (CFTC-regulated prediction market exchange)
- Polymarket (crypto-based prediction markets)

Features:
- Real-time market data
- Market search and discovery
- Historical price data
- Unified data models across platforms
- In-memory caching for performance
"""

import asyncio
import logging
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

import httpx
from cachetools import TTLCache
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class Platform(str, Enum):
    """Prediction market platforms."""

    KALSHI = "kalshi"
    POLYMARKET = "polymarket"


class PredictionMarket(BaseModel):
    """Unified prediction market model across platforms."""

    id: str
    platform: Platform
    title: str
    category: str
    yes_price: float = Field(..., ge=0.0, le=1.0, description="Probability 0.00-1.00")
    no_price: float = Field(..., ge=0.0, le=1.0, description="Probability 0.00-1.00")
    volume: float
    volume_24h: Optional[float] = None
    open_interest: Optional[float] = None
    end_date: Optional[datetime] = None
    status: str  # active, closed, settled
    url: str
    description: Optional[str] = None


class KalshiClient:
    """
    Kalshi API client for CFTC-regulated prediction markets.

    API Documentation: https://trading-api.readme.io/reference/getting-started
    No authentication required for public market data.
    """

    def __init__(self, base_url: str = "https://api.elections.kalshi.com/trade-api/v2"):
        self.base_url = base_url
        self.session: Optional[httpx.AsyncClient] = None
        self._market_cache = TTLCache(maxsize=100, ttl=300)  # 5 min TTL
        self._quote_cache = TTLCache(maxsize=500, ttl=30)  # 30 sec TTL

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create async HTTP session."""
        if self.session is None or self.session.is_closed:
            self.session = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self.session

    async def close(self):
        """Close HTTP session."""
        if self.session and not self.session.is_closed:
            await self.session.aclose()

    async def get_markets(
        self,
        status: str = "open",
        limit: int = 100,
        cursor: Optional[str] = None,
        series_ticker: Optional[str] = None,
    ) -> Dict:
        """
        Get markets from Kalshi.

        Args:
            status: Market status ('open', 'closed', 'settled')
            limit: Max markets to return (max 100)
            cursor: Pagination cursor
            series_ticker: Filter by series (e.g., 'FED' for Fed events)

        Returns:
            Raw Kalshi API response
        """
        try:
            session = await self._get_session()

            params = {"status": status, "limit": min(limit, 100)}

            if cursor:
                params["cursor"] = cursor
            if series_ticker:
                params["series_ticker"] = series_ticker

            response = await session.get("/markets", params=params)
            response.raise_for_status()

            data = response.json()
            logger.debug(f"Fetched {len(data.get('markets', []))} markets from Kalshi")
            return data

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Kalshi HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise
        except Exception as e:
            logger.error(f"Error fetching Kalshi markets: {e}")
            raise

    async def get_market(self, ticker: str) -> Optional[Dict]:
        """
        Get single market by ticker.

        Args:
            ticker: Kalshi market ticker (e.g., 'FED-25JAN-T0.625')

        Returns:
            Market data or None if not found
        """
        try:
            # Check cache
            cache_key = f"market:{ticker}"
            if cache_key in self._market_cache:
                logger.debug(f"Using cached market data for {ticker}")
                return self._market_cache[cache_key]

            session = await self._get_session()
            response = await session.get(f"/markets/{ticker}")
            response.raise_for_status()

            data = response.json()
            market = data.get("market")

            # Cache result
            if market:
                self._market_cache[cache_key] = market

            return market

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Market not found: {ticker}")
                return None
            logger.error(
                f"Kalshi HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise
        except Exception as e:
            logger.error(f"Error fetching Kalshi market {ticker}: {e}")
            raise

    async def get_market_history(
        self, ticker: str, limit: int = 100
    ) -> Optional[List[Dict]]:
        """
        Get historical trades for a market.

        Args:
            ticker: Market ticker
            limit: Max trades to return

        Returns:
            List of historical trades
        """
        try:
            session = await self._get_session()
            response = await session.get(
                f"/markets/{ticker}/history", params={"limit": limit}
            )
            response.raise_for_status()

            data = response.json()
            return data.get("history", [])

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            logger.error(f"Kalshi HTTP error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Error fetching Kalshi market history: {e}")
            raise

    async def get_orderbook(self, ticker: str, depth: int = 10) -> Optional[Dict]:
        """
        Get orderbook for a market.

        Args:
            ticker: Market ticker
            depth: Order book depth

        Returns:
            Orderbook data with bids/asks
        """
        try:
            session = await self._get_session()
            response = await session.get(
                f"/markets/{ticker}/orderbook", params={"depth": depth}
            )
            response.raise_for_status()

            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            logger.error(f"Kalshi HTTP error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Error fetching Kalshi orderbook: {e}")
            raise

    async def search_markets(self, query: str) -> List[Dict]:
        """
        Search markets by query string (client-side filtering).

        Args:
            query: Search query

        Returns:
            List of matching markets
        """
        try:
            # Fetch open markets and filter locally
            data = await self.get_markets(status="open", limit=100)
            markets = data.get("markets", [])

            query_lower = query.lower()
            filtered = [
                m
                for m in markets
                if query_lower in m.get("title", "").lower()
                or query_lower in m.get("ticker", "").lower()
            ]

            logger.debug(f"Search '{query}' found {len(filtered)} markets")
            return filtered

        except Exception as e:
            logger.error(f"Error searching Kalshi markets: {e}")
            return []

    def normalize_market(self, raw: Dict) -> PredictionMarket:
        """
        Convert Kalshi market format to unified PredictionMarket.

        Args:
            raw: Raw Kalshi market data

        Returns:
            Normalized PredictionMarket
        """
        # Kalshi prices are in cents (0-100), normalize to 0.00-1.00
        yes_price = raw.get("yes_bid", 50) / 100.0
        no_price = raw.get("no_bid", 50) / 100.0

        # Parse end date
        end_date = None
        if raw.get("close_time"):
            try:
                end_date = datetime.fromisoformat(
                    raw["close_time"].replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                logger.debug(f"Failed to parse close_time: {raw.get('close_time')}")

        return PredictionMarket(
            id=raw.get("ticker", ""),
            platform=Platform.KALSHI,
            title=raw.get("title", ""),
            category=raw.get("category", "Unknown"),
            yes_price=yes_price,
            no_price=no_price,
            volume=float(raw.get("volume", 0)),
            volume_24h=float(raw.get("volume_24h", 0)),
            open_interest=float(raw.get("open_interest", 0)),
            end_date=end_date,
            status=raw.get("status", "active"),
            url=f"https://kalshi.com/markets/{raw.get('ticker', '')}",
            description=raw.get("subtitle"),
        )


class PolymarketClient:
    """
    Polymarket API client for crypto-based prediction markets.

    API Documentation: https://docs.polymarket.com/
    No authentication required for public market data.
    """

    def __init__(self, base_url: str = "https://gamma-api.polymarket.com"):
        self.base_url = base_url
        self.session: Optional[httpx.AsyncClient] = None
        self._market_cache = TTLCache(maxsize=100, ttl=300)  # 5 min TTL
        self._quote_cache = TTLCache(maxsize=500, ttl=30)  # 30 sec TTL

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create async HTTP session."""
        if self.session is None or self.session.is_closed:
            self.session = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self.session

    async def close(self):
        """Close HTTP session."""
        if self.session and not self.session.is_closed:
            await self.session.aclose()

    async def get_markets(
        self, limit: int = 100, offset: int = 0, active: bool = True
    ) -> List[Dict]:
        """
        Get markets from Polymarket.

        Args:
            limit: Max markets to return
            offset: Pagination offset
            active: Filter for active markets only

        Returns:
            List of market data
        """
        try:
            session = await self._get_session()

            params = {"limit": limit, "offset": offset}

            if active:
                params["active"] = "true"
                params["closed"] = "false"  # Exclude closed markets

            response = await session.get("/markets", params=params)
            response.raise_for_status()

            markets = response.json()
            logger.debug(f"Fetched {len(markets)} markets from Polymarket")
            return markets if isinstance(markets, list) else []

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Polymarket HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise
        except Exception as e:
            logger.error(f"Error fetching Polymarket markets: {e}")
            raise

    async def get_market(self, condition_id: str) -> Optional[Dict]:
        """
        Get single market by condition ID.

        Args:
            condition_id: Polymarket condition ID

        Returns:
            Market data or None if not found
        """
        try:
            # Check cache
            cache_key = f"market:{condition_id}"
            if cache_key in self._market_cache:
                logger.debug(f"Using cached market data for {condition_id}")
                return self._market_cache[cache_key]

            session = await self._get_session()
            response = await session.get(f"/markets/{condition_id}")
            response.raise_for_status()

            market = response.json()

            # Cache result
            if market:
                self._market_cache[cache_key] = market

            return market

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Market not found: {condition_id}")
                return None
            logger.error(f"Polymarket HTTP error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Error fetching Polymarket market: {e}")
            raise

    async def get_prices_history(
        self, token_id: str, fidelity: int = 60
    ) -> Optional[List[Dict]]:
        """
        Get historical prices for a market.

        Args:
            token_id: Token ID
            fidelity: Time interval in seconds

        Returns:
            List of price history points
        """
        try:
            session = await self._get_session()
            response = await session.get(
                "/prices-history", params={"market": token_id, "fidelity": fidelity}
            )
            response.raise_for_status()

            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            logger.error(f"Polymarket HTTP error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Error fetching Polymarket price history: {e}")
            raise

    async def search_markets(self, query: str) -> List[Dict]:
        """
        Search markets by query string.

        Polymarket's Gamma API doesn't have a proper search parameter,
        so we fetch active markets and filter client-side.

        Args:
            query: Search query

        Returns:
            List of matching markets
        """
        try:
            session = await self._get_session()

            # Fetch active markets (closed=false) and filter client-side
            # The 'query' param doesn't work reliably on Gamma API
            response = await session.get(
                "/markets", params={"closed": "false", "limit": 200}
            )
            response.raise_for_status()

            markets = response.json()
            if not isinstance(markets, list):
                return []

            # Client-side filtering by query in title/question
            query_lower = query.lower()
            filtered = [
                m
                for m in markets
                if query_lower in m.get("question", "").lower()
                or query_lower in m.get("title", "").lower()
                or query_lower in m.get("description", "").lower()
            ]

            logger.debug(
                f"Search '{query}' found {len(filtered)} Polymarket "
                f"markets (from {len(markets)} total)"
            )
            return filtered

        except Exception as e:
            logger.error(f"Error searching Polymarket markets: {e}")
            return []

    def normalize_market(self, raw: Dict) -> PredictionMarket:
        """
        Convert Polymarket format to unified PredictionMarket.

        Args:
            raw: Raw Polymarket market data

        Returns:
            Normalized PredictionMarket
        """
        # Polymarket prices are already 0-1
        # They may have 'outcomes' array with prices
        yes_price = 0.5
        no_price = 0.5

        # Try to extract prices from outcomes
        # Note: outcomePrices can be a JSON string or an actual list
        outcome_prices = raw.get("outcomePrices")
        if outcome_prices:
            # Parse JSON string if needed
            if isinstance(outcome_prices, str):
                try:
                    import json

                    outcome_prices = json.loads(outcome_prices)
                except (json.JSONDecodeError, TypeError):
                    outcome_prices = None

            if isinstance(outcome_prices, list) and len(outcome_prices) >= 1:
                yes_price = float(outcome_prices[0])
                if len(outcome_prices) >= 2:
                    no_price = float(outcome_prices[1])
        elif "tokens" in raw and isinstance(raw["tokens"], list):
            # Alternative format
            if len(raw["tokens"]) >= 1:
                yes_price = float(raw["tokens"][0].get("price", 0.5))
            if len(raw["tokens"]) >= 2:
                no_price = float(raw["tokens"][1].get("price", 0.5))

        # Parse end date
        end_date = None
        if raw.get("endDate"):
            try:
                end_date = datetime.fromisoformat(raw["endDate"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                logger.debug(f"Failed to parse endDate: {raw.get('endDate')}")

        return PredictionMarket(
            id=raw.get("conditionId", raw.get("id", "")),
            platform=Platform.POLYMARKET,
            title=raw.get("question", raw.get("title", "")),
            category=raw.get("category", "Unknown"),
            yes_price=yes_price,
            no_price=no_price,
            volume=float(raw.get("volume", 0)),
            volume_24h=float(raw.get("volume24hr", 0)),
            open_interest=None,  # Polymarket doesn't expose OI
            end_date=end_date,
            status="active" if raw.get("active", True) else "closed",
            url=f"https://polymarket.com/event/{raw.get('slug', raw.get('id', ''))}",
            description=raw.get("description"),
        )


class PredictionMarketManager:
    """
    Unified manager for multiple prediction market platforms.

    Provides single interface to query Kalshi and Polymarket simultaneously.
    """

    def __init__(self):
        self.kalshi = KalshiClient()
        self.polymarket = PolymarketClient()
        logger.info("PredictionMarketManager initialized")

    async def close(self):
        """Close all client sessions."""
        await self.kalshi.close()
        await self.polymarket.close()

    async def get_trending_markets(
        self, limit: int = 20, category: Optional[str] = None
    ) -> List[PredictionMarket]:
        """
        Get trending markets from both platforms, sorted by volume.

        Args:
            limit: Max markets to return
            category: Optional category filter

        Returns:
            List of PredictionMarket sorted by volume
        """
        try:
            # Fetch from both platforms in parallel
            kalshi_task = self.kalshi.get_markets(status="open", limit=50)
            polymarket_task = self.polymarket.get_markets(limit=50, active=True)

            kalshi_data, polymarket_data = await asyncio.gather(
                kalshi_task, polymarket_task, return_exceptions=True
            )

            markets: List[PredictionMarket] = []

            # Process Kalshi markets
            if isinstance(kalshi_data, dict):
                for raw in kalshi_data.get("markets", []):
                    try:
                        market = self.kalshi.normalize_market(raw)
                        if (
                            category is None
                            or market.category.lower() == category.lower()
                        ):
                            markets.append(market)
                    except Exception as e:
                        logger.warning(f"Failed to normalize Kalshi market: {e}")

            # Process Polymarket markets
            if isinstance(polymarket_data, list):
                for raw in polymarket_data:
                    try:
                        market = self.polymarket.normalize_market(raw)
                        if (
                            category is None
                            or market.category.lower() == category.lower()
                        ):
                            markets.append(market)
                    except Exception as e:
                        logger.warning(f"Failed to normalize Polymarket market: {e}")

            # Sort by volume (24h if available, else total volume)
            markets.sort(
                key=lambda m: m.volume_24h if m.volume_24h else m.volume,
                reverse=True,
            )

            return markets[:limit]

        except Exception as e:
            logger.error(f"Error getting trending markets: {e}")
            return []

    async def search(self, query: str) -> List[PredictionMarket]:
        """
        Search both platforms for markets matching query.

        Args:
            query: Search query string

        Returns:
            List of matching PredictionMarket
        """
        try:
            # Search both platforms in parallel
            kalshi_task = self.kalshi.search_markets(query)
            polymarket_task = self.polymarket.search_markets(query)

            kalshi_results, polymarket_results = await asyncio.gather(
                kalshi_task, polymarket_task, return_exceptions=True
            )

            markets: List[PredictionMarket] = []

            # Process Kalshi results
            if isinstance(kalshi_results, list):
                for raw in kalshi_results:
                    try:
                        markets.append(self.kalshi.normalize_market(raw))
                    except Exception as e:
                        logger.warning(f"Failed to normalize Kalshi market: {e}")

            # Process Polymarket results
            if isinstance(polymarket_results, list):
                for raw in polymarket_results:
                    try:
                        markets.append(self.polymarket.normalize_market(raw))
                    except Exception as e:
                        logger.warning(f"Failed to normalize Polymarket market: {e}")

            return markets

        except Exception as e:
            logger.error(f"Error searching markets: {e}")
            return []

    async def get_market_detail(
        self, platform: Platform, market_id: str
    ) -> Optional[PredictionMarket]:
        """
        Get detailed market data from specific platform.

        Args:
            platform: Platform enum (KALSHI or POLYMARKET)
            market_id: Market identifier

        Returns:
            PredictionMarket or None if not found
        """
        try:
            if platform == Platform.KALSHI:
                raw = await self.kalshi.get_market(market_id)
                if raw:
                    return self.kalshi.normalize_market(raw)
            elif platform == Platform.POLYMARKET:
                raw = await self.polymarket.get_market(market_id)
                if raw:
                    return self.polymarket.normalize_market(raw)

            return None

        except Exception as e:
            logger.error(f"Error getting market detail: {e}")
            return None

    async def get_categories(self) -> Dict[str, List[str]]:
        """
        Get available categories per platform.

        Returns:
            Dict mapping platform name to list of categories
        """
        try:
            # Fetch markets and extract unique categories
            kalshi_task = self.kalshi.get_markets(status="open", limit=100)
            polymarket_task = self.polymarket.get_markets(limit=100)

            kalshi_data, polymarket_data = await asyncio.gather(
                kalshi_task, polymarket_task, return_exceptions=True
            )

            kalshi_categories = set()
            polymarket_categories = set()

            if isinstance(kalshi_data, dict):
                for raw in kalshi_data.get("markets", []):
                    if "category" in raw:
                        kalshi_categories.add(raw["category"])

            if isinstance(polymarket_data, list):
                for raw in polymarket_data:
                    if "category" in raw:
                        polymarket_categories.add(raw["category"])

            return {
                "kalshi": sorted(list(kalshi_categories)),
                "polymarket": sorted(list(polymarket_categories)),
            }

        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return {"kalshi": [], "polymarket": []}
