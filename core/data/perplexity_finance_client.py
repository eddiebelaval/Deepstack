"""
Perplexity Finance API Integration

Provides AI-powered financial research capabilities:
- SEC Filing Search (10-K, 10-Q, 8-K, S-1)
- Earnings Transcript Analysis
- Natural Language Stock Screening
- Company Profile Building
- Deep Research Reports
- Market Summary Intelligence

Uses Perplexity's sonar models with finance-optimized prompts.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)


class PerplexityModel(Enum):
    """Available Perplexity models for different use cases."""

    SONAR = "sonar"  # Fast, general queries
    SONAR_PRO = "sonar-pro"  # More comprehensive
    SONAR_REASONING = "sonar-reasoning"  # DeepSeek R1 - complex analysis
    SONAR_REASONING_PRO = "sonar-reasoning-pro"  # Deep research


class SearchMode(Enum):
    """Perplexity Finance search modes."""

    SEC = "sec"  # SEC filings search
    EARNINGS = "earnings"  # Earnings transcripts
    NEWS = "news"  # Financial news


class PerplexityFinanceClient:
    """
    Perplexity Finance API client for DeepStack Trading System.

    Provides unified interface for:
    - SEC filing search and analysis
    - Earnings transcript retrieval
    - Natural language stock screening
    - Company profile building
    - Deep research report generation
    - Market summary intelligence

    Features:
    - Smart caching with configurable TTL
    - Rate limiting (respects API limits)
    - Async operations
    - Error handling with retry logic
    """

    BASE_URL = "https://api.perplexity.ai"

    def __init__(
        self,
        api_key: Optional[str] = None,
        rate_limit: int = 50,
        rate_limit_window: int = 60,
        max_retries: int = 3,
    ):
        """
        Initialize Perplexity Finance client.

        Args:
            api_key: Perplexity API key (defaults to PERPLEXITY_API_KEY env var)
            rate_limit: Max requests per window (default: 50)
            rate_limit_window: Time window in seconds (default: 60)
            max_retries: Maximum retry attempts (default: 3)
        """
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")

        if not self.api_key:
            logger.warning(
                "Perplexity API key not configured - using mock mode. "
                "Set PERPLEXITY_API_KEY for live data."
            )

        self.max_retries = max_retries

        # Cache TTL values
        self.cache_ttl = {
            "sec": 86400,  # 24 hours - SEC filings don't change often
            "earnings": 604800,  # 7 days - historical transcripts
            "market_summary": 900,  # 15 minutes - market updates
            "profile": 3600,  # 1 hour - company profiles
            "screener": 1800,  # 30 minutes - screening results
            "research": 3600,  # 1 hour - deep research
        }

        # Rate limiting
        self.rate_limit = rate_limit
        self.rate_limit_window = rate_limit_window
        self.request_timestamps: List[float] = []

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"PerplexityFinanceClient initialized "
            f"configured={bool(self.api_key)} "
            f"rate_limit={rate_limit}/{rate_limit_window}s"
        )

    def is_configured(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Ensure aiohttp session exists with timeout configuration."""
        if self.session is None or self.session.closed:
            # 60 second timeout for Perplexity (AI processing can take time)
            timeout = aiohttp.ClientTimeout(total=60, connect=10)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("Perplexity Finance session closed")

    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limits with exponential backoff."""
        current_time = time.time()

        # Remove old timestamps outside the window
        self.request_timestamps = [
            ts
            for ts in self.request_timestamps
            if current_time - ts < self.rate_limit_window
        ]

        # Check if we've exceeded the limit
        if len(self.request_timestamps) >= self.rate_limit:
            wait_time = (
                self.request_timestamps[0] + self.rate_limit_window - current_time
            )
            logger.warning(
                f"Rate limit reached: {len(self.request_timestamps)}/{self.rate_limit} "
                f"in last {self.rate_limit_window}s. Waiting {wait_time:.2f}s"
            )
            await asyncio.sleep(wait_time + 0.1)
            return await self._check_rate_limit()

        self.request_timestamps.append(current_time)

    def _get_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generate cache key from endpoint and parameters."""
        params_str = json.dumps(params, sort_keys=True)
        params_hash = hashlib.md5(
            params_str.encode(), usedforsecurity=False
        ).hexdigest()[:8]
        return f"perplexity:{endpoint}:{params_hash}"

    def _get_from_cache(self, cache_key: str, ttl_type: str) -> Optional[Dict]:
        """Get data from cache if not expired."""
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        ttl = self.cache_ttl.get(ttl_type, 3600)

        if datetime.now() - timestamp < timedelta(seconds=ttl):
            logger.debug(f"Cache hit for {cache_key}")
            return data

        logger.debug(f"Cache expired for {cache_key}")
        del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Dict) -> None:
        """Store data in cache."""
        self.cache[cache_key] = (data, datetime.now())

    async def _make_request(
        self,
        messages: List[Dict[str, str]],
        model: PerplexityModel = PerplexityModel.SONAR_PRO,
        search_mode: Optional[SearchMode] = None,
        retry_count: int = 0,
    ) -> Optional[Dict[str, Any]]:
        """
        Make request to Perplexity API.

        Args:
            messages: Chat messages for the request
            model: Perplexity model to use
            search_mode: Optional finance search mode (sec, earnings, news)
            retry_count: Current retry attempt

        Returns:
            Response data with content and citations
        """
        if not self.api_key:
            return None

        try:
            await self._check_rate_limit()

            session = await self._ensure_session()

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload: Dict[str, Any] = {
                "model": model.value,
                "messages": messages,
            }

            # Add search_mode for finance-specific searches
            if search_mode:
                payload["search_mode"] = search_mode.value

            url = f"{self.BASE_URL}/chat/completions"

            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()

                    # Extract content and citations
                    content = ""
                    citations = []

                    if "choices" in data and len(data["choices"]) > 0:
                        message = data["choices"][0].get("message", {})
                        content = message.get("content", "")

                    if "citations" in data:
                        citations = data["citations"]

                    return {
                        "content": content,
                        "citations": citations,
                        "model": model.value,
                        "mock": False,
                    }

                elif response.status == 429:
                    if retry_count < self.max_retries:
                        wait_time = min(60 * (2**retry_count), 300)
                        logger.warning(f"429 Rate Limited. Retrying in {wait_time}s")
                        await asyncio.sleep(wait_time)
                        return await self._make_request(
                            messages, model, search_mode, retry_count + 1
                        )
                    raise RateLimitError(
                        "Rate limit exceeded, max retries reached",
                        service="perplexity",
                        retry_after=60,
                    )

                elif response.status == 401:
                    logger.error("Perplexity API authentication failed")
                    return None

                else:
                    error_text = await response.text()
                    logger.error(f"HTTP error {response.status}: {error_text}")
                    return None

        except aiohttp.ClientError as e:
            logger.error(f"Network error: {e}")
            if retry_count < self.max_retries:
                wait_time = min(10 * (2**retry_count), 60)
                logger.info(f"Retrying in {wait_time}s")
                await asyncio.sleep(wait_time)
                return await self._make_request(
                    messages, model, search_mode, retry_count + 1
                )
            return None

        except RateLimitError:
            raise

        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return None

    # =========================================================================
    # Public API Methods
    # =========================================================================

    async def search_sec_filings(
        self,
        symbol: str,
        filing_type: str = "all",
        query: Optional[str] = None,
        date_after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search SEC filings for a company.

        Args:
            symbol: Stock ticker symbol (e.g., AAPL)
            filing_type: Filing type filter (10-K, 10-Q, 8-K, S-1, all)
            query: Specific query to search within filings
            date_after: Only return filings after this date (YYYY-MM-DD)

        Returns:
            Dict with content (analysis), citations, and mock flag
        """
        cache_params = {
            "symbol": symbol,
            "filing_type": filing_type,
            "query": query,
            "date_after": date_after,
        }
        cache_key = self._get_cache_key("sec", cache_params)

        cached = self._get_from_cache(cache_key, "sec")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_sec_filings(symbol, filing_type, query)

        # Build prompt for SEC filing search
        prompt_parts = [f"Search SEC filings for {symbol.upper()}"]

        if filing_type != "all":
            prompt_parts.append(f"Focus on {filing_type} filings")

        if query:
            prompt_parts.append(f"Specifically looking for information about: {query}")

        if date_after:
            prompt_parts.append(f"Only include filings after {date_after}")

        prompt_parts.append(
            "Provide key findings, risk factors, and notable disclosures. "
            "Include specific quotes and section references."
        )

        messages = [{"role": "user", "content": ". ".join(prompt_parts)}]

        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR_PRO,
            search_mode=SearchMode.SEC,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_sec_filings(symbol, filing_type, query)

    async def get_market_summary(
        self,
        topics: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get AI-synthesized market summary.

        Args:
            topics: Specific topics to focus on (e.g., ['tech', 'rates', 'earnings'])

        Returns:
            Dict with content (summary), citations, and mock flag
        """
        cache_params = {"topics": topics or []}
        cache_key = self._get_cache_key("market_summary", cache_params)

        cached = self._get_from_cache(cache_key, "market_summary")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_market_summary(topics)

        prompt_parts = ["Provide a comprehensive market summary for today"]

        if topics:
            prompt_parts.append(f"Focus on: {', '.join(topics)}")

        prompt_parts.append(
            "Include: major indices performance, sector highlights, "
            "key economic data, notable earnings, and market-moving news. "
            "Be specific with numbers and percentages."
        )

        messages = [{"role": "user", "content": ". ".join(prompt_parts)}]

        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR,
            search_mode=SearchMode.NEWS,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_market_summary(topics)

    async def search_earnings_transcripts(
        self,
        symbol: str,
        quarter: Optional[str] = None,
        query: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search earnings call transcripts.

        Args:
            symbol: Stock ticker symbol
            quarter: Specific quarter (e.g., 'Q3 2024')
            query: Specific query to search in transcript

        Returns:
            Dict with content (analysis), citations, and mock flag
        """
        cache_params = {"symbol": symbol, "quarter": quarter, "query": query}
        cache_key = self._get_cache_key("earnings", cache_params)

        cached = self._get_from_cache(cache_key, "earnings")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_earnings_transcript(symbol, quarter)

        prompt_parts = [f"Search earnings call transcripts for {symbol.upper()}"]

        if quarter:
            prompt_parts.append(f"Focus on {quarter}")

        if query:
            prompt_parts.append(f"Specifically looking for: {query}")

        prompt_parts.append(
            "Provide: key takeaways, guidance highlights, management tone, "
            "important Q&A moments, and any unexpected disclosures."
        )

        messages = [{"role": "user", "content": ". ".join(prompt_parts)}]

        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR_PRO,
            search_mode=SearchMode.EARNINGS,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_earnings_transcript(symbol, quarter)

    async def natural_language_screen(
        self,
        query: str,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Screen stocks using natural language.

        Args:
            query: Natural language query (e.g., 'tech stocks with PE under 20')
            limit: Maximum number of results

        Returns:
            Dict with content (results), citations, and mock flag
        """
        cache_params = {"query": query, "limit": limit}
        cache_key = self._get_cache_key("screener", cache_params)

        cached = self._get_from_cache(cache_key, "screener")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_screener(query, limit)

        prompt = (
            f"Find up to {limit} stocks matching this criteria: {query}\n\n"
            "For each stock, provide:\n"
            "- Symbol and company name\n"
            "- Current price and market cap\n"
            "- Key metrics relevant to the query\n"
            "- Brief explanation of why it matches\n"
            "Format as a structured list."
        )

        messages = [{"role": "user", "content": prompt}]

        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR_PRO,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_screener(query, limit)

    async def build_profile(
        self,
        entity: str,
        focus_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Build comprehensive company/entity profile.

        Args:
            entity: Company name or ticker symbol
            focus_areas: Specific areas to focus on

        Returns:
            Dict with content (profile), citations, and mock flag
        """
        cache_params = {"entity": entity, "focus_areas": focus_areas or []}
        cache_key = self._get_cache_key("profile", cache_params)

        cached = self._get_from_cache(cache_key, "profile")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_profile(entity, focus_areas)

        prompt_parts = [f"Build a comprehensive profile for {entity}"]

        if focus_areas:
            prompt_parts.append(f"Focus especially on: {', '.join(focus_areas)}")

        prompt_parts.append(
            "Include: company overview, business model, competitive position, "
            "key executives, recent developments, financial highlights, "
            "risk factors, and analyst sentiment."
        )

        messages = [{"role": "user", "content": ". ".join(prompt_parts)}]

        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR_PRO,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_profile(entity, focus_areas)

    async def deep_research(
        self,
        topic: str,
        focus_areas: Optional[List[str]] = None,
        symbols: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate comprehensive deep research report.

        Args:
            topic: Research topic
            focus_areas: Specific areas to investigate
            symbols: Related stock symbols

        Returns:
            Dict with content (report), citations, and mock flag
        """
        cache_params = {
            "topic": topic,
            "focus_areas": focus_areas or [],
            "symbols": symbols or [],
        }
        cache_key = self._get_cache_key("research", cache_params)

        cached = self._get_from_cache(cache_key, "research")
        if cached:
            return cached

        if not self.api_key:
            return self._mock_deep_research(topic, focus_areas, symbols)

        prompt_parts = [f"Conduct deep research on: {topic}"]

        if focus_areas:
            prompt_parts.append(f"Focus areas: {', '.join(focus_areas)}")

        if symbols:
            prompt_parts.append(f"Related securities to analyze: {', '.join(symbols)}")

        prompt_parts.append(
            "Provide comprehensive analysis including:\n"
            "- Executive summary\n"
            "- Market context and trends\n"
            "- Key findings and data\n"
            "- Risk assessment\n"
            "- Investment implications\n"
            "- Conclusions and recommendations"
        )

        messages = [{"role": "user", "content": ". ".join(prompt_parts)}]

        # Use reasoning model for deep research
        result = await self._make_request(
            messages,
            model=PerplexityModel.SONAR_REASONING_PRO,
        )

        if result:
            self._set_cache(cache_key, result)
            return result

        return self._mock_deep_research(topic, focus_areas, symbols)

    # =========================================================================
    # Mock Data Methods (when API not configured)
    # =========================================================================

    def _mock_sec_filings(
        self, symbol: str, filing_type: str, query: Optional[str]
    ) -> Dict[str, Any]:
        """Generate mock SEC filing response."""
        filing_display = filing_type.upper() if filing_type != "all" else "All Filings"
        query_line = f"Query: {query}\n" if query else ""
        return {
            "content": (
                f"SEC Filing Analysis for {symbol.upper()}\n\n"
                f"Filing Type: {filing_display}\n"
                f"{query_line}\n"
                "Note: Configure PERPLEXITY_API_KEY for live SEC filing search.\n\n"
                "Key sections typically found in SEC filings:\n"
                "- Business Description (Item 1)\n"
                "- Risk Factors (Item 1A)\n"
                "- MD&A - Management Discussion (Item 7)\n"
                "- Financial Statements (Item 8)"
            ),
            "citations": ["https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"],
            "mock": True,
        }

    def _mock_market_summary(self, topics: Optional[List[str]]) -> Dict[str, Any]:
        """Generate mock market summary response."""
        topic_str = f" focusing on {', '.join(topics)}" if topics else ""
        return {
            "content": (
                f"Market Summary{topic_str}\n\n"
                "Note: Configure PERPLEXITY_API_KEY for live intelligence.\n\n"
                "Typical market summary includes:\n"
                "- Major indices (S&P 500, NASDAQ, DOW)\n"
                "- Sector performance highlights\n"
                "- Economic data releases\n"
                "- Notable earnings reports\n"
                "- Market-moving news"
            ),
            "citations": [],
            "mock": True,
        }

    def _mock_earnings_transcript(
        self, symbol: str, quarter: Optional[str]
    ) -> Dict[str, Any]:
        """Generate mock earnings transcript response."""
        quarter_str = f"Quarter: {quarter}" if quarter else "Most Recent Quarter"
        return {
            "content": (
                f"Earnings Transcript Analysis for {symbol.upper()}\n"
                f"{quarter_str}\n\n"
                "Note: Configure PERPLEXITY_API_KEY for live transcripts.\n\n"
                "Typical earnings call sections:\n"
                "- Opening remarks from CEO\n"
                "- Financial overview from CFO\n"
                "- Forward guidance\n"
                "- Q&A session with analysts"
            ),
            "citations": [],
            "mock": True,
        }

    def _mock_screener(self, query: str, limit: int) -> Dict[str, Any]:
        """Generate mock screener response."""
        return {
            "content": (
                f"Stock Screener Results\n"
                f"Query: {query}\n"
                f"Limit: {limit}\n\n"
                "Note: Configure PERPLEXITY_API_KEY for AI screening.\n\n"
                "Example results would include:\n"
                "- Symbol, company name\n"
                "- Price, market cap\n"
                "- Relevant metrics\n"
                "- Match explanation"
            ),
            "citations": [],
            "mock": True,
        }

    def _mock_profile(
        self, entity: str, focus_areas: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Generate mock company profile response."""
        focus_str = f"Focus: {', '.join(focus_areas)}" if focus_areas else ""
        return {
            "content": (
                f"Company Profile: {entity}\n"
                f"{focus_str}\n\n"
                "Note: Configure PERPLEXITY_API_KEY for profiles.\n\n"
                "Profile sections:\n"
                "- Company overview\n"
                "- Business model\n"
                "- Competitive position\n"
                "- Key executives\n"
                "- Financial highlights\n"
                "- Risk factors"
            ),
            "citations": [],
            "mock": True,
        }

    def _mock_deep_research(
        self,
        topic: str,
        focus_areas: Optional[List[str]],
        symbols: Optional[List[str]],
    ) -> Dict[str, Any]:
        """Generate mock deep research response."""
        return {
            "content": (
                f"Deep Research Report: {topic}\n"
                f"{'Focus Areas: ' + ', '.join(focus_areas) if focus_areas else ''}\n"
                f"{'Related Securities: ' + ', '.join(symbols) if symbols else ''}\n\n"
                "Note: Mock data. Configure PERPLEXITY_API_KEY.\n\n"
                "Report sections:\n"
                "- Executive summary\n"
                "- Market context\n"
                "- Key findings\n"
                "- Risk assessment\n"
                "- Investment implications\n"
                "- Conclusions"
            ),
            "citations": [],
            "mock": True,
        }

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def clear_cache(self, cache_type: Optional[str] = None) -> None:
        """Clear cached data."""
        if cache_type:
            keys_to_delete = [k for k in self.cache.keys() if cache_type in k]
            for key in keys_to_delete:
                del self.cache[key]
            logger.info(f"Cleared {len(keys_to_delete)} {cache_type} cache entries")
        else:
            count = len(self.cache)
            self.cache.clear()
            logger.info(f"Cleared all Perplexity cache ({count} entries)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "total_cached_items": len(self.cache),
            "rate_limit": self.rate_limit,
            "rate_limit_window": self.rate_limit_window,
            "recent_requests": len(self.request_timestamps),
            "cache_ttl": self.cache_ttl,
            "configured": self.is_configured(),
        }

    async def health_check(self) -> bool:
        """Check API connectivity and credentials."""
        if not self.api_key:
            logger.warning("Perplexity API key not configured")
            return False

        try:
            result = await self.get_market_summary()
            return result is not None and not result.get("mock", True)
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


# Singleton instance
_client: Optional[PerplexityFinanceClient] = None


def get_perplexity_finance_client() -> PerplexityFinanceClient:
    """Get or create the Perplexity Finance client singleton."""
    global _client
    if _client is None:
        _client = PerplexityFinanceClient()
    return _client
