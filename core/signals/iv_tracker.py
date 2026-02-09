"""
Implied Volatility Tracker

Tracks implied volatility over time, persists to Supabase, and
calculates IV percentile and IV rank for options analysis.

Table: deepsignals_historical_iv
  - symbol text NOT NULL
  - date date NOT NULL
  - implied_volatility double precision NOT NULL
  - iv_percentile double precision
  - UNIQUE (symbol, date)
"""

import logging
import os
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

TABLE = "deepsignals_historical_iv"


@dataclass
class IVRecord:
    """A single day's implied volatility reading."""

    symbol: str
    date: str  # ISO date string (YYYY-MM-DD)
    implied_volatility: float
    iv_percentile: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class IVMetrics:
    """Aggregated implied volatility statistics for a symbol."""

    symbol: str
    current_iv: float
    iv_percentile: float  # 0-100: pct of days where IV was lower
    iv_rank: float  # 0-100: (current - low) / (high - low)
    iv_high_252: float  # 252-day high IV
    iv_low_252: float  # 252-day low IV
    mean_iv: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class IVTracker:
    """
    Tracks implied volatility over time and calculates percentiles.

    Uses Supabase REST API directly via httpx for persistence.
    Requires service_role key for write access (RLS policy).
    """

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
    ):
        """
        Initialize IV Tracker.

        Args:
            supabase_url: Supabase project URL. Falls back to SUPABASE_URL env var.
            supabase_key: Supabase service role key. Falls back to
                          SUPABASE_SERVICE_ROLE_KEY env var.
        """
        self.supabase_url = (
            supabase_url or os.environ.get("SUPABASE_URL", "")
        ).rstrip("/")
        self.supabase_key = supabase_key or os.environ.get(
            "SUPABASE_SERVICE_ROLE_KEY", ""
        )

        if not self.supabase_url or not self.supabase_key:
            logger.warning(
                "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — "
                "IVTracker will not be able to persist data"
            )

        self._client: Optional[httpx.AsyncClient] = None

        logger.info(
            f"IVTracker initialized "
            f"supabase={'configured' if self.supabase_url else 'MISSING'}"
        )

    # ── HTTP Client ────────────────────────────────────────────────

    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure httpx client exists with Supabase auth headers."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                headers={
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("IVTracker session closed")

    @property
    def _rest_url(self) -> str:
        """Base REST URL for the historical IV table."""
        return f"{self.supabase_url}/rest/v1/{TABLE}"

    # ── Write ──────────────────────────────────────────────────────

    async def record_daily_iv(
        self, symbol: str, iv: float, record_date: date
    ) -> None:
        """
        Upsert a daily IV reading to Supabase.

        Uses ON CONFLICT (symbol, date) to update if the row already exists.

        Args:
            symbol: Ticker symbol (e.g., 'AAPL').
            iv: Implied volatility as a decimal (e.g., 0.32 for 32%).
            record_date: The date of this IV reading.
        """
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase not configured — skipping IV record")
            return

        client = await self._ensure_client()

        payload = {
            "symbol": symbol.upper().strip(),
            "date": record_date.isoformat(),
            "implied_volatility": iv,
        }

        try:
            # Supabase upsert: POST with Prefer: resolution=merge-duplicates
            response = await client.post(
                self._rest_url,
                json=payload,
                headers={
                    "Prefer": "resolution=merge-duplicates,return=representation",
                },
            )

            if response.status_code in (200, 201):
                logger.debug(
                    f"Recorded IV for {symbol} on {record_date}: {iv:.4f}"
                )
            else:
                logger.error(
                    f"Failed to upsert IV record: "
                    f"HTTP {response.status_code} — {response.text[:200]}"
                )

        except httpx.HTTPError as e:
            logger.error(f"Network error recording IV for {symbol}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error recording IV for {symbol}: {e}")

    # ── Read ───────────────────────────────────────────────────────

    async def _fetch_iv_history_raw(
        self, symbol: str, lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Fetch raw IV history rows from Supabase.

        Args:
            symbol: Ticker symbol.
            lookback_days: Number of calendar days to look back.

        Returns:
            List of row dicts, ordered by date ascending.
        """
        if not self.supabase_url or not self.supabase_key:
            return []

        client = await self._ensure_client()
        cutoff = (date.today() - timedelta(days=lookback_days)).isoformat()

        try:
            response = await client.get(
                self._rest_url,
                params={
                    "select": "symbol,date,implied_volatility,iv_percentile",
                    "symbol": f"eq.{symbol.upper().strip()}",
                    "date": f"gte.{cutoff}",
                    "order": "date.asc",
                },
            )

            if response.status_code == 200:
                return response.json()

            logger.error(
                f"Failed to fetch IV history: "
                f"HTTP {response.status_code} — {response.text[:200]}"
            )
            return []

        except httpx.HTTPError as e:
            logger.error(f"Network error fetching IV history for {symbol}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching IV history for {symbol}: {e}")
            return []

    async def get_iv_history(
        self, symbol: str, days: int = 30
    ) -> List[IVRecord]:
        """
        Get IV history for a symbol over the last N days.

        Args:
            symbol: Ticker symbol (e.g., 'AAPL').
            days: Number of calendar days of history (default 30).

        Returns:
            List of IVRecord ordered by date ascending.
        """
        rows = await self._fetch_iv_history_raw(symbol, lookback_days=days)
        return [
            IVRecord(
                symbol=row["symbol"],
                date=row["date"],
                implied_volatility=row["implied_volatility"],
                iv_percentile=row.get("iv_percentile"),
            )
            for row in rows
        ]

    async def get_iv_percentile(
        self, symbol: str, lookback_days: int = 252
    ) -> Optional[IVMetrics]:
        """
        Calculate IV percentile and rank from historical data.

        IV Percentile = (# days where IV < current) / total_days * 100
        IV Rank = (current - low) / (high - low) * 100

        Returns None if fewer than 30 days of data (cold start guard).

        Args:
            symbol: Ticker symbol (e.g., 'AAPL').
            lookback_days: Lookback window in calendar days (default 252).

        Returns:
            IVMetrics with percentile, rank, high, low, mean — or None.
        """
        rows = await self._fetch_iv_history_raw(symbol, lookback_days=lookback_days)

        if len(rows) < 30:
            logger.info(
                f"Not enough IV history for {symbol}: "
                f"{len(rows)} days (need >= 30)"
            )
            return None

        ivs = [r["implied_volatility"] for r in rows]
        current_iv = ivs[-1]

        iv_high = max(ivs)
        iv_low = min(ivs)
        iv_mean = sum(ivs) / len(ivs)

        # Percentile: fraction of days where IV was strictly lower
        days_below = sum(1 for v in ivs if v < current_iv)
        percentile = (days_below / len(ivs)) * 100.0

        # Rank: position within the range
        iv_range = iv_high - iv_low
        rank = ((current_iv - iv_low) / iv_range * 100.0) if iv_range > 0 else 50.0

        return IVMetrics(
            symbol=symbol.upper().strip(),
            current_iv=current_iv,
            iv_percentile=round(percentile, 2),
            iv_rank=round(rank, 2),
            iv_high_252=iv_high,
            iv_low_252=iv_low,
            mean_iv=round(iv_mean, 6),
        )

    async def get_iv_rank(
        self, symbol: str, lookback_days: int = 252
    ) -> Optional[float]:
        """
        Get just the IV rank for a symbol.

        Convenience wrapper around get_iv_percentile.

        Args:
            symbol: Ticker symbol.
            lookback_days: Lookback window in calendar days (default 252).

        Returns:
            IV rank (0-100) or None if insufficient history.
        """
        metrics = await self.get_iv_percentile(symbol, lookback_days=lookback_days)
        if metrics is None:
            return None
        return metrics.iv_rank
