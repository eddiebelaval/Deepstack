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
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

import httpx
from cachetools import TTLCache
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def infer_category(title: str, description: Optional[str] = None) -> str:
    """
    Infer market category from title and description text.

    Used when API doesn't provide category (e.g., Polymarket).

    Args:
        title: Market title/question
        description: Optional market description

    Returns:
        Inferred category string
    """
    text = (title + " " + (description or "")).lower()

    # Economics/Finance keywords
    if any(
        kw in text
        for kw in [
            "fed",
            "rate",
            "inflation",
            "gdp",
            "cpi",
            "fomc",
            "interest",
            "treasury",
            "bond",
            "yield",
            "unemployment",
            "jobs",
            "payroll",
            "recession",
            "tariff",
            "trade war",
        ]
    ):
        return "Economics"

    # Crypto keywords
    if any(
        kw in text
        for kw in [
            "bitcoin",
            "btc",
            "ethereum",
            "eth",
            "crypto",
            "solana",
            "sol",
            "dogecoin",
            "doge",
            "xrp",
            "ripple",
            "cardano",
            "ada",
            "polygon",
            "avalanche",
            "chainlink",
            "uniswap",
            "defi",
            "nft",
        ]
    ):
        return "Crypto"

    # Stocks/Earnings keywords
    if any(
        kw in text
        for kw in [
            "stock",
            "share",
            "earnings",
            "aapl",
            "nvda",
            "tsla",
            "msft",
            "amzn",
            "googl",
            "meta",
            "price target",
            "market cap",
            "ipo",
            "nasdaq",
            "s&p",
            "dow",
            "spy",
            "qqq",
        ]
    ):
        return "Stocks"

    # Politics keywords
    if any(
        kw in text
        for kw in [
            "election",
            "president",
            "congress",
            "senate",
            "house",
            "vote",
            "democrat",
            "republican",
            "trump",
            "biden",
            "governor",
            "mayor",
            "primary",
            "caucus",
            "impeach",
            "supreme court",
        ]
    ):
        return "Politics"

    # Sports keywords
    if any(
        kw in text
        for kw in [
            "nfl",
            "nba",
            "mlb",
            "nhl",
            "super bowl",
            "championship",
            "playoffs",
            "world series",
            "stanley cup",
            "finals",
            "mvp",
            "quarterback",
            "touchdown",
            "home run",
            "soccer",
            "fifa",
        ]
    ):
        return "Sports"

    # Commodities keywords
    if any(
        kw in text
        for kw in [
            "oil",
            "gold",
            "silver",
            "copper",
            "wheat",
            "corn",
            "natural gas",
            "crude",
            "brent",
            "wti",
            "commodity",
            "opec",
        ]
    ):
        return "Commodities"

    return "Other"


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

        # Extract series ticker for URL by removing numeric suffix
        # (e.g., KXNEWPOPE-70 -> KXNEWPOPE)
        event_ticker = raw.get("event_ticker", raw.get("ticker", ""))
        series_ticker = re.sub(r"-\d+$", "", event_ticker)

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
            url=f"https://kalshi.com/markets/{series_ticker}",
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

        # Extract event slug from events array (markets are children of events)
        # Polymarket URLs use event slug, not market slug
        event_slug = None
        events = raw.get("events", [])
        if isinstance(events, list) and len(events) > 0:
            event_slug = events[0].get("slug")

        # Fall back to market slug if no event slug available
        url_slug = event_slug or raw.get("slug", raw.get("id", ""))

        # Extract title and description for category inference
        title = raw.get("question", raw.get("title", ""))
        description = raw.get("description")

        # Get category from API or infer from title/description
        category = raw.get("category")
        if not category or category == "Unknown":
            category = infer_category(title, description)

        return PredictionMarket(
            id=raw.get("conditionId", raw.get("id", "")),
            platform=Platform.POLYMARKET,
            title=title,
            category=category,
            yes_price=yes_price,
            no_price=no_price,
            volume=float(raw.get("volume", 0)),
            volume_24h=float(raw.get("volume24hr", 0)),
            open_interest=None,  # Polymarket doesn't expose OI
            end_date=end_date,
            status="active" if raw.get("active", True) else "closed",
            url=f"https://polymarket.com/event/{url_slug}",
            description=description,
        )


class PredictionMarketManager:
    """
    Unified manager for multiple prediction market platforms.

    Provides single interface to query Kalshi and Polymarket simultaneously.
    Includes caching to reduce external API calls and improve response times.
    """

    # Cache TTL in seconds (30 seconds for trending data)
    CACHE_TTL = 30

    def __init__(self):
        self.kalshi = KalshiClient()
        self.polymarket = PolymarketClient()
        # Cache for combined market data (key: cache_key, value: (timestamp, data))
        self._trending_cache: TTLCache = TTLCache(maxsize=50, ttl=self.CACHE_TTL)
        self._new_markets_cache: TTLCache = TTLCache(maxsize=50, ttl=self.CACHE_TTL)
        # Locks to prevent concurrent fetches for the same cache key
        self._fetch_locks: Dict[str, asyncio.Lock] = {}
        logger.info("PredictionMarketManager initialized with caching")

    async def close(self):
        """Close all client sessions."""
        await self.kalshi.close()
        await self.polymarket.close()

    def _get_lock(self, cache_key: str) -> asyncio.Lock:
        """Get or create a lock for a cache key to prevent concurrent fetches."""
        if cache_key not in self._fetch_locks:
            self._fetch_locks[cache_key] = asyncio.Lock()
        return self._fetch_locks[cache_key]

    async def get_trending_markets(
        self,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None,
        source: Optional[str] = None,
    ) -> List[PredictionMarket]:
        """
        Get trending markets from both platforms, sorted by volume.

        Uses caching to reduce external API calls. Cache key is based on
        category and source filters only - pagination is applied after cache lookup.
        Uses locking to prevent multiple concurrent fetches for the same data.

        Args:
            limit: Max markets to return
            offset: Pagination offset for infinite scroll
            category: Optional category filter
            source: Optional platform filter (kalshi, polymarket)

        Returns:
            List of PredictionMarket sorted by volume
        """
        # Build cache key from filter params (not pagination)
        cache_key = f"trending:{category or 'all'}:{source or 'all'}"

        # Check cache first (outside lock for fast cache hits)
        if cache_key in self._trending_cache:
            cached_markets = self._trending_cache[cache_key]
            logger.debug(f"Cache hit for {cache_key}, {len(cached_markets)} markets")
            return cached_markets[offset : offset + limit]

        # Acquire lock to prevent concurrent fetches
        async with self._get_lock(cache_key):
            # Double-check cache after acquiring lock (may have been populated)
            if cache_key in self._trending_cache:
                cached_markets = self._trending_cache[cache_key]
                logger.debug(f"Cache hit (after lock) for {cache_key}")
                return cached_markets[offset : offset + limit]

            try:
                # Fetch a large batch to cache (supports pagination from cache)
                fetch_limit = 200

                # Only fetch from requested source(s)
                fetch_kalshi = source is None or source == "kalshi"
                fetch_polymarket = source is None or source == "polymarket"

                kalshi_task = (
                    self.kalshi.get_markets(status="open", limit=fetch_limit)
                    if fetch_kalshi
                    else None
                )
                polymarket_task = (
                    self.polymarket.get_markets(limit=fetch_limit, active=True)
                    if fetch_polymarket
                    else None
                )

                # Gather only non-None tasks
                tasks = [t for t in [kalshi_task, polymarket_task] if t is not None]
                results = (
                    await asyncio.gather(*tasks, return_exceptions=True)
                    if tasks
                    else []
                )

                # Map results back to sources
                result_idx = 0
                kalshi_data = None
                polymarket_data = None
                if fetch_kalshi:
                    kalshi_data = (
                        results[result_idx] if result_idx < len(results) else None
                    )
                    result_idx += 1
                if fetch_polymarket:
                    polymarket_data = (
                        results[result_idx] if result_idx < len(results) else None
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
                            logger.warning(
                                f"Failed to normalize Polymarket market: {e}"
                            )

                # Sort by volume (24h if available, else total volume)
                markets.sort(
                    key=lambda m: m.volume_24h if m.volume_24h else m.volume,
                    reverse=True,
                )

                # Cache the full sorted list
                self._trending_cache[cache_key] = markets
                logger.debug(f"Cached {len(markets)} markets for {cache_key}")

                # Apply pagination: skip offset, take limit
                return markets[offset : offset + limit]

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

    async def get_new_markets(
        self,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None,
        source: Optional[str] = None,
    ) -> List[PredictionMarket]:
        """
        Get recently created/opened markets from both platforms.

        Polymarket API returns markets with 'startDate' or 'createdAt'.
        Kalshi API returns markets with 'open_time'.

        Uses caching to reduce external API calls.

        Args:
            limit: Max markets to return
            offset: Pagination offset for infinite scroll
            category: Optional category filter
            source: Optional platform filter (kalshi, polymarket)

        Returns:
            List of PredictionMarket sorted by creation date (newest first)
        """
        # Build cache key from filter params (not pagination)
        cache_key = f"new:{category or 'all'}:{source or 'all'}"

        # Check cache first
        if cache_key in self._new_markets_cache:
            cached_markets = self._new_markets_cache[cache_key]
            logger.debug(f"Cache hit for {cache_key}, {len(cached_markets)} markets")
            return cached_markets[offset : offset + limit]

        try:
            # Fetch a large batch to cache
            fetch_limit = 200

            # Only fetch from requested source(s)
            fetch_kalshi = source is None or source == "kalshi"
            fetch_polymarket = source is None or source == "polymarket"

            kalshi_task = (
                self.kalshi.get_markets(status="open", limit=fetch_limit)
                if fetch_kalshi
                else None
            )
            polymarket_task = (
                self.polymarket.get_markets(limit=fetch_limit, active=True)
                if fetch_polymarket
                else None
            )

            # Gather only non-None tasks
            tasks = [t for t in [kalshi_task, polymarket_task] if t is not None]
            results = (
                await asyncio.gather(*tasks, return_exceptions=True) if tasks else []
            )

            # Map results back to sources
            result_idx = 0
            kalshi_data = None
            polymarket_data = None
            if fetch_kalshi:
                kalshi_data = results[result_idx] if result_idx < len(results) else None
                result_idx += 1
            if fetch_polymarket:
                polymarket_data = (
                    results[result_idx] if result_idx < len(results) else None
                )

            markets_with_dates: List[tuple] = []  # (market, created_date)

            # Process Kalshi markets - use 'open_time' as creation date
            if isinstance(kalshi_data, dict):
                for raw in kalshi_data.get("markets", []):
                    try:
                        market = self.kalshi.normalize_market(raw)
                        if (
                            category is None
                            or market.category.lower() == category.lower()
                        ):
                            # Parse open_time as creation date
                            created = None
                            if raw.get("open_time"):
                                try:
                                    created = datetime.fromisoformat(
                                        raw["open_time"].replace("Z", "+00:00")
                                    )
                                except (ValueError, TypeError):
                                    pass
                            markets_with_dates.append((market, created))
                    except Exception as e:
                        logger.warning(f"Failed to normalize Kalshi market: {e}")

            # Process Polymarket markets - use 'startDate' or 'createdAt'
            if isinstance(polymarket_data, list):
                for raw in polymarket_data:
                    try:
                        market = self.polymarket.normalize_market(raw)
                        if (
                            category is None
                            or market.category.lower() == category.lower()
                        ):
                            # Parse startDate or createdAt as creation date
                            created = None
                            date_str = raw.get("startDate") or raw.get("createdAt")
                            if date_str:
                                try:
                                    created = datetime.fromisoformat(
                                        date_str.replace("Z", "+00:00")
                                    )
                                except (ValueError, TypeError):
                                    pass
                            markets_with_dates.append((market, created))
                    except Exception as e:
                        logger.warning(f"Failed to normalize Polymarket market: {e}")

            # Sort by creation date (newest first), None dates go to end
            # Use timezone-aware datetime.min to avoid comparison errors
            markets_with_dates.sort(
                key=lambda x: (
                    x[1] if x[1] else datetime.min.replace(tzinfo=timezone.utc)
                ),
                reverse=True,
            )

            # Extract just the markets (without dates) for caching
            sorted_markets = [m[0] for m in markets_with_dates]

            # Cache the full sorted list
            self._new_markets_cache[cache_key] = sorted_markets
            logger.debug(f"Cached {len(sorted_markets)} new markets for {cache_key}")

            # Apply pagination: skip offset, take limit
            return sorted_markets[offset : offset + limit]

        except Exception as e:
            logger.error(f"Error getting new markets: {e}")
            return []

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
