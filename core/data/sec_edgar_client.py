"""
SEC EDGAR API Integration

Provides insider trading data from SEC Form 4 filings with:
- Recent insider trade aggregation
- Company-specific insider activity lookup
- Rate limiting (10 req/sec per SEC fair access policy)
- Async operations with caching
"""

import asyncio
import hashlib
import json
import logging
import time
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiohttp

from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)


@dataclass
class InsiderTrade:
    """A single SEC Form 4 insider trade filing."""

    filer_name: str
    filer_cik: str
    company: str
    ticker: str
    filing_date: str
    transaction_type: str  # buy, sell, gift
    shares: float
    price_per_share: Optional[float]
    total_value: Optional[float]
    ownership_type: str  # direct, indirect
    source_url: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# SEC Form 4 transaction codes → human-readable types
TRANSACTION_CODE_MAP = {
    "P": "buy",       # Open market or private purchase
    "S": "sell",      # Open market or private sale
    "G": "gift",      # Gift
    "A": "award",     # Grant or award
    "M": "exercise",  # Exercise or conversion of derivative
    "C": "exercise",  # Conversion of derivative
    "F": "sell",      # Payment of exercise price (tax withholding)
    "J": "other",     # Other acquisition or disposition
    "K": "other",     # Equity swap or similar
    "D": "sell",      # Disposition to the issuer
    "I": "other",     # Discretionary transaction
    "U": "other",     # Tender of shares in change of control
    "W": "other",     # Acquisition or disposition by will/laws of descent
}


class SECEdgarClient:
    """
    SEC EDGAR client for DeepStack Trading System.

    Provides unified interface for:
    - Recent insider trading filings (Form 4)
    - Company-specific insider trade lookups
    - Rate limiting to respect SEC fair access policy (10 req/sec)
    - Error handling with retry logic
    - Smart caching with 30-minute TTL
    """

    SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
    SUBMISSIONS_URL = "https://data.sec.gov/submissions"
    FILINGS_URL = "https://www.sec.gov/cgi-bin/browse-edgar"
    FULL_TEXT_URL = "https://efts.sec.gov/LATEST/search-index"

    USER_AGENT = "DeepStack/1.0 (contact@id8labs.tech)"

    def __init__(
        self,
        rate_limit: int = 10,
        max_retries: int = 3,
        cache_ttl: int = 1800,
    ):
        """
        Initialize SEC EDGAR client.

        Args:
            rate_limit: Max requests per second (default: 10 per SEC policy)
            max_retries: Maximum number of retry attempts (default: 3)
            cache_ttl: Cache time-to-live in seconds (default: 1800 = 30 min)
        """
        self.max_retries = max_retries
        self.cache_ttl = cache_ttl

        # Rate limiting via semaphore (10 req/sec)
        self._semaphore = asyncio.Semaphore(rate_limit)
        self.rate_limit = rate_limit
        self.request_timestamps: List[float] = []

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"SECEdgarClient initialized "
            f"rate_limit={rate_limit}/s"
        )

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Ensure aiohttp session exists with timeout and User-Agent."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=15, connect=5)
            headers = {"User-Agent": self.USER_AGENT, "Accept": "application/json"}
            self.session = aiohttp.ClientSession(timeout=timeout, headers=headers)
        return self.session

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("SEC EDGAR session closed")

    async def _check_rate_limit(self) -> None:
        """
        Enforce SEC fair access rate limit (10 req/sec).

        Uses a sliding window of timestamps to ensure compliance.
        """
        current_time = time.time()

        # Remove timestamps older than 1 second
        self.request_timestamps = [
            ts for ts in self.request_timestamps if current_time - ts < 1.0
        ]

        if len(self.request_timestamps) >= self.rate_limit:
            wait_time = self.request_timestamps[0] + 1.0 - current_time
            if wait_time > 0:
                logger.debug(f"Rate limit: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time + 0.05)
                return await self._check_rate_limit()

        self.request_timestamps.append(current_time)

    def _get_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generate cache key from endpoint and parameters."""
        params_str = json.dumps(params, sort_keys=True)
        params_hash = hashlib.md5(
            params_str.encode(), usedforsecurity=False
        ).hexdigest()[:8]
        return f"{endpoint}:{params_hash}"

    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if not expired."""
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
            logger.debug(f"Cache hit for {cache_key}")
            return data

        logger.debug(f"Cache expired for {cache_key}")
        del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Any) -> None:
        """Store data in cache."""
        self.cache[cache_key] = (data, datetime.now())

    async def _make_request(
        self, url: str, params: Optional[Dict[str, str]] = None, retry_count: int = 0
    ) -> Optional[Any]:
        """
        Make HTTP request to SEC EDGAR with retry logic.

        Args:
            url: Full URL to request
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            Response data or None on error
        """
        try:
            async with self._semaphore:
                await self._check_rate_limit()

                session = await self._ensure_session()
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        content_type = response.headers.get("Content-Type", "")
                        if "json" in content_type:
                            return await response.json()
                        return await response.text()

                    elif response.status == 429:
                        if retry_count < self.max_retries:
                            wait_time = min(2 * (2**retry_count), 30)
                            logger.warning(
                                f"429 Too Many Requests from SEC. "
                                f"Retrying in {wait_time}s"
                            )
                            await asyncio.sleep(wait_time)
                            return await self._make_request(
                                url, params, retry_count + 1
                            )
                        raise RateLimitError(
                            "SEC EDGAR rate limit exceeded, max retries reached",
                            service="sec_edgar",
                            retry_after=10,
                        )

                    else:
                        logger.error(
                            f"SEC EDGAR HTTP {response.status}: "
                            f"{await response.text()}"
                        )
                        return None

        except aiohttp.ClientError as e:
            logger.error(f"Network error reaching SEC EDGAR: {e}")
            if retry_count < self.max_retries:
                wait_time = min(2 * (2**retry_count), 30)
                logger.info(f"Retrying in {wait_time}s (attempt {retry_count + 1})")
                await asyncio.sleep(wait_time)
                return await self._make_request(url, params, retry_count + 1)
            return None

        except RateLimitError:
            raise

        except Exception as e:
            logger.error(f"Unexpected error in SEC EDGAR request: {e}")
            return None

    async def _fetch_and_parse_form4_xml(
        self, xml_url: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch a Form 4 XML filing and extract transaction details.

        SEC Form 4 XML structure:
          <ownershipDocument>
            <reportingOwner>
              <reportingOwnerId>
                <rptOwnerCik>...</rptOwnerCik>
                <rptOwnerName>...</rptOwnerName>
              </reportingOwnerId>
              <reportingOwnerRelationship>...</reportingOwnerRelationship>
            </reportingOwner>
            <nonDerivativeTable>
              <nonDerivativeTransaction>
                <transactionCoding>
                  <transactionCode>P</transactionCode>
                </transactionCoding>
                <transactionAmounts>
                  <transactionShares><value>1000</value></transactionShares>
                  <transactionPricePerShare><value>150.00</value></transactionPricePerShare>
                </transactionAmounts>
                <ownershipNature>
                  <directOrIndirectOwnership><value>D</value></directOrIndirectOwnership>
                </ownershipNature>
              </nonDerivativeTransaction>
            </nonDerivativeTable>
          </ownershipDocument>

        Args:
            xml_url: URL to the Form 4 XML filing

        Returns:
            List of transaction dicts with keys:
              filer_name, filer_cik, transaction_type, shares,
              price_per_share, total_value, ownership_type
        """
        try:
            data = await self._make_request(xml_url)
            if not data or not isinstance(data, str):
                return []

            root = ET.fromstring(data)
        except ET.ParseError as e:
            logger.debug(f"XML parse error for {xml_url}: {e}")
            return []
        except Exception as e:
            logger.debug(f"Failed to fetch Form 4 XML from {xml_url}: {e}")
            return []

        # Extract filer info from <reportingOwner>
        filer_name = ""
        filer_cik = ""
        owner_el = root.find(".//reportingOwner/reportingOwnerId")
        if owner_el is not None:
            name_el = owner_el.find("rptOwnerName")
            cik_el = owner_el.find("rptOwnerCik")
            filer_name = name_el.text.strip() if name_el is not None and name_el.text else ""
            filer_cik = cik_el.text.strip() if cik_el is not None and cik_el.text else ""

        transactions: List[Dict[str, Any]] = []

        # Parse non-derivative transactions (direct stock buys/sells)
        for txn in root.findall(".//nonDerivativeTable/nonDerivativeTransaction"):
            parsed = self._parse_xml_transaction(txn, filer_name, filer_cik)
            if parsed:
                transactions.append(parsed)

        # Parse derivative transactions (options exercises, etc.)
        for txn in root.findall(".//derivativeTable/derivativeTransaction"):
            parsed = self._parse_xml_transaction(txn, filer_name, filer_cik)
            if parsed:
                transactions.append(parsed)

        return transactions

    def _parse_xml_transaction(
        self, txn_el: ET.Element, filer_name: str, filer_cik: str
    ) -> Optional[Dict[str, Any]]:
        """
        Parse a single <nonDerivativeTransaction> or <derivativeTransaction> element.

        Returns:
            Dict with transaction details, or None if the element can't be parsed.
        """
        try:
            # Transaction code
            code_el = txn_el.find(".//transactionCoding/transactionCode")
            code = code_el.text.strip() if code_el is not None and code_el.text else ""
            transaction_type = TRANSACTION_CODE_MAP.get(code, "other")

            # Shares
            shares = 0.0
            shares_el = txn_el.find(".//transactionAmounts/transactionShares/value")
            if shares_el is not None and shares_el.text:
                try:
                    shares = float(shares_el.text.strip())
                except ValueError:
                    pass

            # Price per share (may be absent for gifts, awards, etc.)
            price_per_share: Optional[float] = None
            price_el = txn_el.find(".//transactionAmounts/transactionPricePerShare/value")
            if price_el is not None and price_el.text:
                try:
                    price_per_share = float(price_el.text.strip())
                except ValueError:
                    pass

            # Ownership type: D=direct, I=indirect
            ownership_type = "direct"
            ownership_el = txn_el.find(
                ".//ownershipNature/directOrIndirectOwnership/value"
            )
            if ownership_el is not None and ownership_el.text:
                ownership_type = (
                    "indirect" if ownership_el.text.strip().upper() == "I" else "direct"
                )

            # Compute total value
            total_value: Optional[float] = None
            if price_per_share is not None and shares > 0:
                total_value = round(shares * price_per_share, 2)

            return {
                "filer_name": filer_name,
                "filer_cik": filer_cik,
                "transaction_type": transaction_type,
                "shares": shares,
                "price_per_share": price_per_share,
                "total_value": total_value,
                "ownership_type": ownership_type,
            }
        except Exception as e:
            logger.debug(f"Error parsing XML transaction element: {e}")
            return None

    async def _lookup_cik(self, ticker: str) -> Optional[str]:
        """
        Look up SEC CIK number for a ticker symbol.

        Uses the SEC company tickers JSON endpoint.

        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL')

        Returns:
            CIK number as zero-padded string, or None
        """
        cache_key = self._get_cache_key("CIK_LOOKUP", {"ticker": ticker})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        url = "https://www.sec.gov/files/company_tickers.json"
        data = await self._make_request(url)

        if not data or not isinstance(data, dict):
            return None

        ticker_upper = ticker.upper()
        for entry in data.values():
            if entry.get("ticker", "").upper() == ticker_upper:
                cik = str(entry.get("cik_str", "")).zfill(10)
                self._set_cache(cache_key, cik)
                return cik

        logger.warning(f"CIK not found for ticker: {ticker}")
        return None

    def _parse_form4_filing(self, filing: Dict[str, Any]) -> Optional[InsiderTrade]:
        """
        Parse a Form 4 filing entry into an InsiderTrade (metadata only).

        This handles the EDGAR full-text search result format. The search API
        returns metadata but not full XML, so we extract what's available.
        For full transaction details, use _enrich_trade_from_xml().

        Args:
            filing: Raw filing dict from EDGAR search

        Returns:
            InsiderTrade or None if parsing fails
        """
        try:
            # Extract file number and build source URL
            file_num = filing.get("file_num", "")
            accession = filing.get("file_num", filing.get("id", ""))

            # Determine source URL
            source_url = filing.get("file_url", "")
            if not source_url and accession:
                source_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum={file_num}&type=4&dateb=&owner=include&count=10"

            # Parse display names - search results include these fields
            filer_name = filing.get("display_names", ["Unknown"])[0] if filing.get("display_names") else filing.get("entity_name", "Unknown")
            company = filing.get("entity_name", "Unknown")
            ticker_list = filing.get("tickers", [])
            ticker = ticker_list[0] if ticker_list else ""

            filing_date = filing.get("file_date", filing.get("period_of_report", ""))
            filer_cik = str(filing.get("entity_id", ""))

            return InsiderTrade(
                filer_name=filer_name,
                filer_cik=filer_cik,
                company=company,
                ticker=ticker,
                filing_date=filing_date,
                transaction_type="buy",  # Default; enriched later via XML
                shares=0.0,
                price_per_share=None,
                total_value=None,
                ownership_type="direct",
                source_url=source_url,
            )
        except Exception as e:
            logger.warning(f"Failed to parse Form 4 filing: {e}")
            return None

    async def get_recent_insider_trades(
        self, limit: int = 50
    ) -> List[InsiderTrade]:
        """
        Get recent Form 4 insider trading filings.

        Fetches the latest insider trades across all companies using
        the EDGAR full-text search API filtered to Form 4 filings.

        Args:
            limit: Max number of trades to return (default 50)

        Returns:
            List of InsiderTrade dataclass instances
        """
        try:
            cache_key = self._get_cache_key("RECENT_INSIDER", {"limit": limit})
            cached = self._get_from_cache(cache_key)
            if cached:
                return cached

            # Search for recent Form 4 filings
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

            params = {
                "q": '"4"',
                "dateRange": "custom",
                "startdt": start_date,
                "enddt": end_date,
                "forms": "4",
            }

            data = await self._make_request(self.SEARCH_URL, params)

            if not data:
                logger.warning("No Form 4 data from EDGAR search")
                return []

            # Handle both dict (JSON) and string responses
            hits = []
            if isinstance(data, dict):
                hits = data.get("hits", {}).get("hits", [])
            elif isinstance(data, str):
                try:
                    parsed = json.loads(data)
                    hits = parsed.get("hits", {}).get("hits", [])
                except json.JSONDecodeError:
                    logger.warning("Could not parse EDGAR search response")
                    return []

            trades = []
            for hit in hits[:limit]:
                source = hit.get("_source", hit)
                trade = self._parse_form4_filing(source)
                if trade:
                    trades.append(trade)

            self._set_cache(cache_key, trades)
            logger.info(f"Retrieved {len(trades)} recent insider trades from EDGAR")
            return trades

        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"Error getting recent insider trades: {e}")
            return []

    async def get_insider_trades_by_ticker(
        self, ticker: str, days: int = 30
    ) -> List[InsiderTrade]:
        """
        Get insider trades for a specific company by ticker symbol.

        Looks up the company CIK, then fetches their recent Form 4
        filings from the EDGAR submissions API.

        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL')
            days: Number of days to look back (default 30)

        Returns:
            List of InsiderTrade dataclass instances for that company
        """
        try:
            ticker = ticker.strip().upper()
            if not ticker:
                raise ValueError("Ticker must be a non-empty string")

            cache_key = self._get_cache_key(
                "INSIDER_BY_TICKER", {"ticker": ticker, "days": days}
            )
            cached = self._get_from_cache(cache_key)
            if cached:
                return cached

            # Look up CIK for the ticker
            cik = await self._lookup_cik(ticker)
            if not cik:
                logger.warning(f"Could not find CIK for {ticker}")
                return []

            # Fetch company submissions
            url = f"{self.SUBMISSIONS_URL}/CIK{cik}.json"
            data = await self._make_request(url)

            if not data or not isinstance(data, dict):
                logger.warning(f"No submissions data for {ticker} (CIK {cik})")
                return []

            company_name = data.get("name", ticker)
            recent = data.get("filings", {}).get("recent", {})

            if not recent:
                return []

            forms = recent.get("form", [])
            dates = recent.get("filingDate", [])
            accessions = recent.get("accessionNumber", [])
            primary_docs = recent.get("primaryDocument", [])

            cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

            # Collect XML URLs for Form 4 filings within the date range
            filing_entries = []
            for i, form in enumerate(forms):
                if form != "4":
                    continue

                filing_date = dates[i] if i < len(dates) else ""
                if filing_date < cutoff_date:
                    continue

                accession = accessions[i] if i < len(accessions) else ""
                primary_doc = primary_docs[i] if i < len(primary_docs) else ""
                accession_clean = accession.replace("-", "")

                xml_url = (
                    f"https://www.sec.gov/Archives/edgar/data/"
                    f"{cik.lstrip('0')}/{accession_clean}/{primary_doc}"
                )

                filing_entries.append({
                    "filing_date": filing_date,
                    "xml_url": xml_url,
                })

            # Fetch and parse XML for each filing (with concurrency)
            trades = []
            for entry in filing_entries:
                xml_url = entry["xml_url"]
                filing_date = entry["filing_date"]

                txns = await self._fetch_and_parse_form4_xml(xml_url)

                if txns:
                    for txn in txns:
                        trade = InsiderTrade(
                            filer_name=txn["filer_name"],
                            filer_cik=txn["filer_cik"] or cik,
                            company=company_name,
                            ticker=ticker,
                            filing_date=filing_date,
                            transaction_type=txn["transaction_type"],
                            shares=txn["shares"],
                            price_per_share=txn["price_per_share"],
                            total_value=txn["total_value"],
                            ownership_type=txn["ownership_type"],
                            source_url=xml_url,
                        )
                        trades.append(trade)
                else:
                    # Fallback: filing metadata without XML transaction details
                    trades.append(InsiderTrade(
                        filer_name="",
                        filer_cik=cik,
                        company=company_name,
                        ticker=ticker,
                        filing_date=filing_date,
                        transaction_type="other",
                        shares=0.0,
                        price_per_share=None,
                        total_value=None,
                        ownership_type="direct",
                        source_url=xml_url,
                    ))

            self._set_cache(cache_key, trades)
            logger.info(
                f"Retrieved {len(trades)} insider trades for {ticker} "
                f"(last {days} days)"
            )
            return trades

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return []
        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"Error getting insider trades for {ticker}: {e}")
            return []

    def clear_cache(self, cache_type: Optional[str] = None) -> None:
        """
        Clear cached data.

        Args:
            cache_type: Specific cache prefix to clear.
                        If None, clears all cache.
        """
        if cache_type:
            keys_to_delete = [
                k for k in self.cache.keys() if k.startswith(cache_type.upper())
            ]
            for key in keys_to_delete:
                del self.cache[key]
            logger.info(f"Cleared {len(keys_to_delete)} {cache_type} cache entries")
        else:
            count = len(self.cache)
            self.cache.clear()
            logger.info(f"Cleared all SEC EDGAR cache ({count} entries)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "total_cached_items": len(self.cache),
            "rate_limit": f"{self.rate_limit}/sec",
            "recent_requests": len(self.request_timestamps),
            "cache_ttl_seconds": self.cache_ttl,
        }

    async def health_check(self) -> bool:
        """
        Check SEC EDGAR API connectivity.

        Returns:
            True if EDGAR is accessible
        """
        try:
            url = "https://www.sec.gov/files/company_tickers.json"
            result = await self._make_request(url)
            return result is not None
        except Exception as e:
            logger.error(f"SEC EDGAR health check failed: {e}")
            return False
