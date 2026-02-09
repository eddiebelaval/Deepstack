"""
Quiver Quantitative API Integration

Provides congressional trading data from Quiver Quantitative with:
- Recent congress trades
- Ticker-specific congress trades
- Politician-specific congress trades
- Daily rate limiting (free tier: 100 req/day)
- Async operations with 4-hour caching
- Graceful degradation when API key is missing
"""

import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)


@dataclass
class CongressTrade:
    """A single congressional trade disclosure."""

    politician: str
    party: str  # D, R, or I
    chamber: str  # House or Senate
    state: str
    ticker: str
    company_name: str
    transaction_type: str  # purchase or sale
    transaction_date: str
    disclosure_date: str
    amount_min: Optional[float]
    amount_max: Optional[float]
    asset_type: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class QuiverClient:
    """
    Quiver Quantitative API client for DeepStack Trading System.

    Provides congressional trading data with:
    - Recent trades across all politicians
    - Ticker-specific trade lookups
    - Politician-specific trade lookups
    - Daily rate limiting (100 req/day for free tier)
    - In-memory caching with 4-hour TTL
    - Graceful degradation when API key is missing
    """

    BASE_URL = "https://api.quiverquant.com/beta"
    CACHE_TTL_SECONDS = 4 * 3600  # 4 hours
    DAILY_RATE_LIMIT = 100

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Quiver Quantitative client.

        Args:
            api_key: Quiver API key. Falls back to QUIVER_API_KEY env var.
                     If neither is set, client operates in degraded mode
                     (returns empty results).
        """
        self.api_key = api_key or os.environ.get("QUIVER_API_KEY")

        if not self.api_key:
            logger.warning(
                "QUIVER_API_KEY not set — QuiverClient will return empty results. "
                "Get a key at https://www.quiverquant.com/"
            )

        # Rate limiting: daily counter with reset tracking
        self._request_count = 0
        self._rate_limit_reset: float = self._next_midnight()

        # Cache: {key: (data, timestamp)}
        self._cache: Dict[str, tuple] = {}

        # httpx async client (lazy init)
        self._client: Optional[httpx.AsyncClient] = None

        logger.info(
            f"QuiverClient initialized "
            f"api_key={'set' if self.api_key else 'MISSING'} "
            f"rate_limit={self.DAILY_RATE_LIMIT}/day"
        )

    @staticmethod
    def _next_midnight() -> float:
        """Return the Unix timestamp of the next midnight UTC."""
        now = datetime.utcnow()
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return tomorrow.timestamp()

    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure httpx client exists with timeout configuration."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("QuiverClient session closed")

    # ── Rate Limiting ──────────────────────────────────────────────

    def _check_rate_limit(self) -> None:
        """
        Check daily rate limit. Resets at midnight UTC.

        Raises:
            RateLimitError: If daily limit exceeded.
        """
        now = time.time()

        # Reset counter if we've passed midnight
        if now >= self._rate_limit_reset:
            self._request_count = 0
            self._rate_limit_reset = self._next_midnight()

        if self._request_count >= self.DAILY_RATE_LIMIT:
            seconds_until_reset = int(self._rate_limit_reset - now)
            raise RateLimitError(
                f"Quiver daily rate limit reached ({self.DAILY_RATE_LIMIT}/day). "
                f"Resets in {seconds_until_reset}s.",
                service="quiver",
                retry_after=seconds_until_reset,
            )

        self._request_count += 1

    # ── Caching ────────────────────────────────────────────────────

    def _cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generate a stable cache key from endpoint and params."""
        params_str = json.dumps(params, sort_keys=True)
        params_hash = hashlib.md5(
            params_str.encode(), usedforsecurity=False
        ).hexdigest()[:8]
        return f"quiver:{endpoint}:{params_hash}"

    def _get_cached(self, key: str) -> Optional[List[CongressTrade]]:
        """Return cached data if still valid, else None."""
        if key not in self._cache:
            return None

        data, cached_at = self._cache[key]
        if datetime.now() - cached_at < timedelta(seconds=self.CACHE_TTL_SECONDS):
            logger.debug(f"Cache hit for {key}")
            return data

        del self._cache[key]
        logger.debug(f"Cache expired for {key}")
        return None

    def _set_cached(self, key: str, data: List[CongressTrade]) -> None:
        """Store data in cache."""
        self._cache[key] = (data, datetime.now())

    # ── HTTP Request ───────────────────────────────────────────────

    async def _make_request(
        self, endpoint: str, params: Optional[Dict[str, str]] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Make authenticated GET request to Quiver API.

        Args:
            endpoint: API path (e.g., '/bulk/congresstrading')
            params: Optional query parameters

        Returns:
            Parsed JSON list or None on error.
        """
        if not self.api_key:
            return None

        self._check_rate_limit()

        url = f"{self.BASE_URL}{endpoint}"
        client = await self._ensure_client()

        try:
            response = await client.get(url, params=params or {})

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                logger.warning(f"Unexpected Quiver response format: {type(data)}")
                return None

            elif response.status_code == 429:
                logger.warning("Quiver 429 Too Many Requests")
                raise RateLimitError(
                    "Quiver API rate limit exceeded",
                    service="quiver",
                    retry_after=60,
                )

            elif response.status_code == 401:
                logger.error("Quiver API authentication failed — check QUIVER_API_KEY")
                return None

            elif response.status_code == 403:
                logger.error("Quiver API access forbidden — check plan permissions")
                return None

            else:
                logger.error(
                    f"Quiver HTTP {response.status_code}: {response.text[:200]}"
                )
                return None

        except httpx.HTTPError as e:
            logger.error(f"Quiver network error: {e}")
            return None
        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error calling Quiver API: {e}")
            return None

    # ── Data Normalization ─────────────────────────────────────────

    @staticmethod
    def _normalize_trade(raw: Dict[str, Any]) -> CongressTrade:
        """Convert raw Quiver JSON into a CongressTrade dataclass."""
        # Quiver uses varying field names; map the common ones
        return CongressTrade(
            politician=raw.get("Representative", raw.get("politician", "")),
            party=raw.get("Party", raw.get("party", "")),
            chamber=raw.get("Chamber", raw.get("chamber", "")),
            state=raw.get("State", raw.get("state", "")),
            ticker=raw.get("Ticker", raw.get("ticker", "")),
            company_name=raw.get("Company", raw.get("company_name", "")),
            transaction_type=raw.get(
                "Transaction", raw.get("transaction_type", "")
            ).lower(),
            transaction_date=raw.get(
                "TransactionDate", raw.get("transaction_date", "")
            ),
            disclosure_date=raw.get(
                "DisclosureDate", raw.get("disclosure_date", "")
            ),
            amount_min=raw.get("Range_Low", raw.get("amount_min")),
            amount_max=raw.get("Range_High", raw.get("amount_max")),
            asset_type=raw.get("AssetType", raw.get("asset_type", "Stock")),
        )

    # ── Public Methods ─────────────────────────────────────────────

    async def get_recent_congress_trades(
        self, limit: int = 50
    ) -> List[CongressTrade]:
        """
        Get the most recent congressional trades.

        Args:
            limit: Max number of trades to return (default 50).

        Returns:
            List of CongressTrade dataclasses, or empty list on error.
        """
        try:
            cache_key = self._cache_key("recent", {"limit": limit})
            cached = self._get_cached(cache_key)
            if cached is not None:
                return cached[:limit]

            data = await self._make_request("/bulk/congresstrading")
            if data is None:
                return []

            trades = [self._normalize_trade(item) for item in data[:limit]]
            self._set_cached(cache_key, trades)

            logger.info(f"Retrieved {len(trades)} recent congress trades from Quiver")
            return trades

        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"Error fetching recent congress trades: {e}")
            return []

    async def get_congress_trades_by_ticker(
        self, ticker: str
    ) -> List[CongressTrade]:
        """
        Get congressional trades for a specific ticker.

        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL').

        Returns:
            List of CongressTrade dataclasses, or empty list on error.
        """
        try:
            ticker = ticker.strip().upper()
            if not ticker:
                logger.error("Ticker must be a non-empty string")
                return []

            cache_key = self._cache_key("ticker", {"ticker": ticker})
            cached = self._get_cached(cache_key)
            if cached is not None:
                return cached

            data = await self._make_request(f"/historical/congresstrading/{ticker}")
            if data is None:
                return []

            trades = [self._normalize_trade(item) for item in data]
            self._set_cached(cache_key, trades)

            logger.info(
                f"Retrieved {len(trades)} congress trades for {ticker} from Quiver"
            )
            return trades

        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"Error fetching congress trades for {ticker}: {e}")
            return []

    async def get_congress_trades_by_politician(
        self, name: str
    ) -> List[CongressTrade]:
        """
        Get congressional trades for a specific politician.

        Fetches all recent trades and filters by politician name
        (case-insensitive substring match).

        Args:
            name: Politician name or partial name (e.g., 'Pelosi').

        Returns:
            List of CongressTrade dataclasses, or empty list on error.
        """
        try:
            name_lower = name.strip().lower()
            if not name_lower:
                logger.error("Politician name must be a non-empty string")
                return []

            cache_key = self._cache_key("politician", {"name": name_lower})
            cached = self._get_cached(cache_key)
            if cached is not None:
                return cached

            # Quiver doesn't have a per-politician endpoint on free tier,
            # so we fetch bulk and filter client-side.
            data = await self._make_request("/bulk/congresstrading")
            if data is None:
                return []

            trades = [
                self._normalize_trade(item)
                for item in data
                if name_lower
                in item.get("Representative", item.get("politician", "")).lower()
            ]
            self._set_cached(cache_key, trades)

            logger.info(
                f"Retrieved {len(trades)} congress trades for '{name}' from Quiver"
            )
            return trades

        except RateLimitError:
            raise
        except Exception as e:
            logger.error(
                f"Error fetching congress trades for politician '{name}': {e}"
            )
            return []

    # ── Utilities ──────────────────────────────────────────────────

    def clear_cache(self) -> None:
        """Clear all cached data."""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cleared QuiverClient cache ({count} entries)")

    def get_stats(self) -> Dict[str, Any]:
        """Return client statistics."""
        return {
            "api_key_set": bool(self.api_key),
            "daily_requests_used": self._request_count,
            "daily_rate_limit": self.DAILY_RATE_LIMIT,
            "cached_items": len(self._cache),
            "cache_ttl_hours": self.CACHE_TTL_SECONDS / 3600,
        }

    async def health_check(self) -> bool:
        """
        Check API connectivity and credentials.

        Returns:
            True if API is accessible and credentials are valid.
        """
        if not self.api_key:
            return False
        try:
            trades = await self.get_recent_congress_trades(limit=1)
            return isinstance(trades, list)
        except Exception as e:
            logger.error(f"Quiver health check failed: {e}")
            return False
