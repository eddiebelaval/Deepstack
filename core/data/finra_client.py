"""
FINRA Short Sale Volume Integration

Provides daily short sale volume data from FINRA as a dark pool proxy:
- Daily short volume for all CNMS-reported symbols
- Per-ticker short volume history
- Dark pool ratio calculation (short_volume / total_volume)
- Top dark pool activity rankings
- Permanent caching of historical daily files (immutable after publish)
"""

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional

import httpx

from core.exceptions import MarketDataError

logger = logging.getLogger(__name__)


@dataclass
class ShortVolumeRecord:
    """Single short sale volume record from FINRA RegSHO data."""

    date: date
    symbol: str
    short_volume: int
    short_exempt_volume: int
    total_volume: int
    market: str
    short_ratio: float = field(init=False)

    def __post_init__(self):
        self.short_ratio = (
            self.short_volume / self.total_volume if self.total_volume > 0 else 0.0
        )


class FINRAClient:
    """
    FINRA RegSHO short sale volume client for DeepStack Trading System.

    Fetches and parses daily short sale volume reports from FINRA's CDN.
    These pipe-delimited text files contain aggregated short volume data
    reported to FINRA for CNMS (Consolidated NMS) securities.

    Data source: https://cdn.finra.org/equity/regsho/daily/
    No authentication required. Files are immutable after publication.
    """

    BASE_URL = "https://cdn.finra.org/equity/regsho/daily"

    def __init__(self, max_retries: int = 3, timeout: float = 15.0):
        self.max_retries = max_retries
        self.timeout = timeout

        # Permanent cache: daily files don't change after publication
        # Key: date string "YYYYMMDD" -> List[ShortVolumeRecord]
        self._daily_cache: Dict[str, List[ShortVolumeRecord]] = {}

        self._client: Optional[httpx.AsyncClient] = None

        logger.info("FINRAClient initialized")

    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure httpx async client exists."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout, connect=5.0),
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("FINRA client session closed")

    def _build_url(self, target_date: date) -> str:
        """Build FINRA CDN URL for a given date."""
        date_str = target_date.strftime("%Y%m%d")
        return f"{self.BASE_URL}/CNMSshvol{date_str}.txt"

    def _parse_records(
        self, text: str, target_date: date
    ) -> List[ShortVolumeRecord]:
        """
        Parse pipe-delimited FINRA short volume text file.

        Format: Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market
        First line is a header row. Last line may be a total row.
        """
        records = []
        lines = text.strip().split("\n")

        for line in lines[1:]:  # skip header
            line = line.strip()
            if not line:
                continue

            parts = line.split("|")
            if len(parts) < 6:
                continue

            symbol = parts[1].strip()

            # Skip total/summary rows
            if symbol.upper() in ("TOTAL", ""):
                continue

            try:
                records.append(
                    ShortVolumeRecord(
                        date=target_date,
                        symbol=symbol,
                        short_volume=int(parts[2]),
                        short_exempt_volume=int(parts[3]),
                        total_volume=int(parts[4]),
                        market=parts[5].strip(),
                    )
                )
            except (ValueError, IndexError) as e:
                logger.debug(f"Skipping malformed FINRA line: {line} ({e})")

        return records

    async def _fetch_daily_file(self, target_date: date) -> Optional[str]:
        """
        Fetch a single daily file from FINRA CDN.

        Returns raw text content or None if not found.
        """
        url = self._build_url(target_date)
        client = await self._ensure_client()

        for attempt in range(self.max_retries):
            try:
                response = await client.get(url)

                if response.status_code == 200:
                    return response.text
                elif response.status_code == 404:
                    # File doesn't exist (weekend/holiday)
                    return None
                elif response.status_code == 403:
                    logger.warning(f"FINRA CDN access forbidden for {target_date}")
                    return None
                else:
                    logger.warning(
                        f"FINRA HTTP {response.status_code} for {target_date} "
                        f"(attempt {attempt + 1}/{self.max_retries})"
                    )

            except httpx.TimeoutException:
                logger.warning(
                    f"FINRA request timeout for {target_date} "
                    f"(attempt {attempt + 1}/{self.max_retries})"
                )
            except httpx.HTTPError as e:
                logger.error(f"FINRA network error for {target_date}: {e}")
                if attempt == self.max_retries - 1:
                    return None

        return None

    async def _get_trading_day_data(
        self, target_date: Optional[date] = None, max_lookback: int = 5
    ) -> List[ShortVolumeRecord]:
        """
        Get data for a trading day, walking back through weekends/holidays.

        Args:
            target_date: Date to fetch (defaults to most recent weekday)
            max_lookback: Max days to walk back looking for data

        Returns:
            List of ShortVolumeRecord for the found trading day
        """
        if target_date is None:
            target_date = date.today()

        # Start from target_date and walk backwards
        for offset in range(max_lookback):
            check_date = target_date - timedelta(days=offset)
            date_key = check_date.strftime("%Y%m%d")

            # Check permanent cache first
            if date_key in self._daily_cache:
                logger.debug(f"Cache hit for FINRA {date_key}")
                return self._daily_cache[date_key]

            # Skip obvious weekends before making network call
            if check_date.weekday() >= 5 and offset > 0:
                continue

            text = await self._fetch_daily_file(check_date)
            if text:
                records = self._parse_records(text, check_date)
                if records:
                    self._daily_cache[date_key] = records
                    logger.info(
                        f"Fetched {len(records)} FINRA records for {check_date}"
                    )
                    return records

        logger.warning(
            f"No FINRA data found within {max_lookback} days of {target_date}"
        )
        return []

    async def get_daily_short_volume(
        self, target_date: Optional[date] = None
    ) -> List[ShortVolumeRecord]:
        """
        Get all short volume records for a trading day.

        Args:
            target_date: Date to fetch (defaults to most recent trading day).
                         Walks back through weekends/holidays automatically.

        Returns:
            List of ShortVolumeRecord for all symbols reported that day.

        Raises:
            MarketDataError: On unrecoverable fetch errors.
        """
        try:
            return await self._get_trading_day_data(target_date)
        except Exception as e:
            logger.error(f"Failed to get daily short volume: {e}")
            raise MarketDataError(
                f"Failed to fetch FINRA short volume data: {e}",
                data_type="short_volume",
            )

    async def get_ticker_short_volume(
        self, ticker: str, days: int = 30
    ) -> List[ShortVolumeRecord]:
        """
        Get short volume history for a specific ticker over N trading days.

        Fetches multiple daily files and filters for the given symbol.
        Cached files are reused; only missing dates hit the network.

        Args:
            ticker: Stock symbol (e.g., 'AAPL')
            days: Number of calendar days to look back (default 30)

        Returns:
            List of ShortVolumeRecord for the ticker, sorted by date descending.
        """
        ticker = ticker.strip().upper()
        if not ticker:
            raise ValueError("Ticker must be a non-empty string")

        results: List[ShortVolumeRecord] = []
        end_date = date.today()
        current = end_date

        # Walk backwards through calendar days
        while (end_date - current).days < days:
            # Skip weekends
            if current.weekday() < 5:
                date_key = current.strftime("%Y%m%d")

                # Try cache first
                if date_key in self._daily_cache:
                    day_records = self._daily_cache[date_key]
                else:
                    text = await self._fetch_daily_file(current)
                    if text:
                        day_records = self._parse_records(text, current)
                        if day_records:
                            self._daily_cache[date_key] = day_records
                    else:
                        day_records = []

                # Filter for our ticker
                for rec in day_records:
                    if rec.symbol == ticker:
                        results.append(rec)

            current -= timedelta(days=1)

        # Sort by date descending (most recent first)
        results.sort(key=lambda r: r.date, reverse=True)

        logger.info(
            f"Retrieved {len(results)} short volume records for {ticker} "
            f"over {days} days"
        )
        return results

    async def get_dark_pool_ratio(self, ticker: str) -> float:
        """
        Get the most recent dark pool ratio for a ticker.

        The dark pool ratio is short_volume / total_volume for the
        most recent available trading day. Values above 0.45 are
        generally considered elevated dark pool activity.

        Args:
            ticker: Stock symbol (e.g., 'AAPL')

        Returns:
            Short ratio as float (0.0 - 1.0), or 0.0 if no data found.
        """
        ticker = ticker.strip().upper()
        records = await self._get_trading_day_data()

        for rec in records:
            if rec.symbol == ticker:
                return rec.short_ratio

        logger.warning(f"No dark pool data found for {ticker}")
        return 0.0

    async def get_top_dark_pool_activity(
        self, limit: int = 20
    ) -> List[ShortVolumeRecord]:
        """
        Get tickers with the highest dark pool ratios for the most recent
        trading day.

        Filters out low-volume noise (< 100k total volume) and sorts
        by short_ratio descending.

        Args:
            limit: Number of top results to return (default 20)

        Returns:
            List of ShortVolumeRecord sorted by short_ratio descending.
        """
        records = await self._get_trading_day_data()

        if not records:
            return []

        # Filter out low-volume noise and sort by short ratio
        significant = [r for r in records if r.total_volume >= 100_000]
        significant.sort(key=lambda r: r.short_ratio, reverse=True)

        return significant[:limit]

    def clear_cache(self) -> None:
        """Clear all cached daily files."""
        count = len(self._daily_cache)
        self._daily_cache.clear()
        logger.info(f"Cleared {count} cached FINRA daily files")

    def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        return {
            "cached_days": len(self._daily_cache),
            "cached_dates": sorted(self._daily_cache.keys()),
            "total_cached_records": sum(
                len(v) for v in self._daily_cache.values()
            ),
        }
