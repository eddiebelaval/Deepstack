"""
Alpaca Options API Integration

Provides options chain data, quotes, Greeks, and IV from Alpaca Markets with:
- Options chain fetching with caching
- Real-time options quotes
- Greeks and IV from Alpaca (or calculated fallback)
- Rate limiting and error handling
"""

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)


class OptionType(str, Enum):
    """Option type enumeration."""

    CALL = "call"
    PUT = "put"


class Moneyness(str, Enum):
    """Option moneyness classification."""

    ITM = "itm"
    ATM = "atm"
    OTM = "otm"


@dataclass
class OptionContract:
    """
    Single option contract with market data and Greeks.

    Represents a tradeable option with all relevant data for screening
    and strategy building.
    """

    # Contract identifiers
    symbol: str  # OCC symbol e.g., "AAPL240119C00150000"
    underlying_symbol: str  # e.g., "AAPL"
    option_type: OptionType
    strike_price: float
    expiration_date: date

    # Market data
    bid: Optional[float] = None
    ask: Optional[float] = None
    last_price: Optional[float] = None
    volume: Optional[int] = None
    open_interest: Optional[int] = None

    # Greeks (from Alpaca or calculated)
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    implied_volatility: Optional[float] = None

    # Derived fields (set after initialization)
    days_to_expiration: int = 0
    bid_ask_spread: Optional[float] = None
    bid_ask_spread_pct: Optional[float] = None
    moneyness: Optional[Moneyness] = None
    underlying_price: Optional[float] = None

    def __post_init__(self):
        """Calculate derived fields."""
        # Calculate DTE
        if isinstance(self.expiration_date, date):
            self.days_to_expiration = max(0, (self.expiration_date - date.today()).days)

        # Calculate bid-ask spread
        if self.bid is not None and self.ask is not None:
            self.bid_ask_spread = self.ask - self.bid
            mid = (self.bid + self.ask) / 2
            if mid > 0:
                self.bid_ask_spread_pct = self.bid_ask_spread / mid

    def calculate_moneyness(self, underlying_price: float) -> Moneyness:
        """
        Calculate moneyness based on underlying price.

        Args:
            underlying_price: Current price of underlying

        Returns:
            Moneyness classification (ITM, ATM, OTM)
        """
        self.underlying_price = underlying_price
        atm_threshold = 0.02  # 2% of underlying price

        if self.option_type == OptionType.CALL:
            if self.strike_price < underlying_price * (1 - atm_threshold):
                self.moneyness = Moneyness.ITM
            elif self.strike_price > underlying_price * (1 + atm_threshold):
                self.moneyness = Moneyness.OTM
            else:
                self.moneyness = Moneyness.ATM
        else:  # PUT
            if self.strike_price > underlying_price * (1 + atm_threshold):
                self.moneyness = Moneyness.ITM
            elif self.strike_price < underlying_price * (1 - atm_threshold):
                self.moneyness = Moneyness.OTM
            else:
                self.moneyness = Moneyness.ATM

        return self.moneyness

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "symbol": self.symbol,
            "underlying_symbol": self.underlying_symbol,
            "option_type": self.option_type.value,
            "strike_price": self.strike_price,
            "expiration_date": self.expiration_date.isoformat(),
            "days_to_expiration": self.days_to_expiration,
            "bid": self.bid,
            "ask": self.ask,
            "last_price": self.last_price,
            "volume": self.volume,
            "open_interest": self.open_interest,
            "delta": self.delta,
            "gamma": self.gamma,
            "theta": self.theta,
            "vega": self.vega,
            "implied_volatility": self.implied_volatility,
            "bid_ask_spread": self.bid_ask_spread,
            "bid_ask_spread_pct": self.bid_ask_spread_pct,
            "moneyness": self.moneyness.value if self.moneyness else None,
            "underlying_price": self.underlying_price,
        }


@dataclass
class OptionChain:
    """
    Complete options chain for an underlying symbol.
    """

    underlying_symbol: str
    underlying_price: float
    contracts: List[OptionContract] = field(default_factory=list)
    expirations: List[date] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)

    def filter_by_expiration(self, expiration: date) -> List[OptionContract]:
        """Filter contracts by expiration date."""
        return [c for c in self.contracts if c.expiration_date == expiration]

    def filter_by_type(self, option_type: OptionType) -> List[OptionContract]:
        """Filter contracts by option type (call/put)."""
        return [c for c in self.contracts if c.option_type == option_type]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "underlying_symbol": self.underlying_symbol,
            "underlying_price": self.underlying_price,
            "contracts": [c.to_dict() for c in self.contracts],
            "expirations": [e.isoformat() for e in self.expirations],
            "timestamp": self.timestamp.isoformat(),
        }


class AlpacaOptionsClient:
    """
    Alpaca Options API client for DeepStack Trading System.

    Provides:
    - Options chain data with Greeks and IV
    - Real-time options quotes
    - Expiration date listings
    - Caching with configurable TTLs
    - Rate limiting
    """

    # Alpaca API base URLs
    TRADING_BASE_URL = "https://paper-api.alpaca.markets"
    DATA_BASE_URL = "https://data.alpaca.markets"

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://paper-api.alpaca.markets",
        feed: str = "indicative",
        rate_limit_requests: int = 200,
        rate_limit_window: int = 60,
    ):
        """
        Initialize Alpaca Options client.

        Args:
            api_key: Alpaca API key
            secret_key: Alpaca secret key
            base_url: Alpaca API base URL
            feed: Options data feed ('indicative' for free, 'opra' for paid)
            rate_limit_requests: Max requests per window
            rate_limit_window: Time window in seconds
        """
        if not api_key or not secret_key:
            raise ValueError("API key and secret key are required")

        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url
        self.feed = feed

        # HTTP client
        self.headers = {
            "APCA-API-KEY-ID": api_key,
            "APCA-API-SECRET-KEY": secret_key,
        }

        # Rate limiting
        self.rate_limit_requests = rate_limit_requests
        self.rate_limit_window = rate_limit_window
        self.request_timestamps: List[float] = []

        # Cache settings with TTLs
        self._chain_cache: Dict[str, Tuple[OptionChain, datetime]] = {}
        self._expiration_cache: Dict[str, Tuple[List[date], datetime]] = {}
        self._quote_cache: Dict[str, Tuple[OptionContract, datetime]] = {}

        self.chain_cache_ttl = 300  # 5 minutes for chains
        self.expiration_cache_ttl = 3600  # 1 hour for expirations
        self.quote_cache_ttl = 5  # 5 seconds for quotes

        # Thread safety
        self._cache_lock = asyncio.Lock()

        logger.info(
            f"AlpacaOptionsClient initialized with feed={feed}, base_url={base_url}"
        )

    @staticmethod
    def parse_occ_symbol(occ_symbol: str) -> Optional[Dict[str, Any]]:
        """
        Parse OCC option symbol format.

        Format: AAPL240119C00150000
        - AAPL: Underlying symbol (1-6 chars)
        - 240119: Expiration date YYMMDD
        - C: Call (C) or Put (P)
        - 00150000: Strike price * 1000 (8 digits)

        Args:
            occ_symbol: OCC format option symbol

        Returns:
            Dictionary with parsed components or None if invalid
        """
        # OCC format regex
        pattern = r"^([A-Z]{1,6})(\d{6})([CP])(\d{8})$"
        match = re.match(pattern, occ_symbol)

        if not match:
            return None

        underlying = match.group(1)
        date_str = match.group(2)
        option_type = "call" if match.group(3) == "C" else "put"
        strike_int = int(match.group(4))

        # Parse date (YYMMDD)
        try:
            year = 2000 + int(date_str[:2])
            month = int(date_str[2:4])
            day = int(date_str[4:6])
            expiration = date(year, month, day)
        except ValueError:
            return None

        # Strike is in thousandths (e.g., 00150000 = $150.00)
        strike = strike_int / 1000

        return {
            "underlying": underlying,
            "expiration": expiration,
            "option_type": option_type,
            "strike": strike,
        }

    @staticmethod
    def build_occ_symbol(
        underlying: str,
        expiration: date,
        option_type: str,
        strike: float,
    ) -> str:
        """
        Build OCC option symbol from components.

        Args:
            underlying: Underlying symbol
            expiration: Expiration date
            option_type: 'call' or 'put'
            strike: Strike price

        Returns:
            OCC format symbol string
        """
        date_str = expiration.strftime("%y%m%d")
        type_char = "C" if option_type.lower() == "call" else "P"
        strike_int = int(strike * 1000)
        strike_str = f"{strike_int:08d}"

        return f"{underlying.upper()}{date_str}{type_char}{strike_str}"

    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limits."""
        current_time = time.time()

        # Remove old timestamps
        self.request_timestamps = [
            ts
            for ts in self.request_timestamps
            if current_time - ts < self.rate_limit_window
        ]

        # Wait if needed
        if len(self.request_timestamps) >= self.rate_limit_requests:
            wait_time = (
                self.request_timestamps[0] + self.rate_limit_window - current_time
            )
            logger.warning(f"Rate limit approaching, waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time + 0.1)
            return await self._check_rate_limit()

        self.request_timestamps.append(current_time)

    async def _request(
        self,
        method: str,
        url: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Make HTTP request to Alpaca API.

        Args:
            method: HTTP method
            url: Full URL
            params: Query parameters
            json_data: JSON body

        Returns:
            Response JSON or None on error
        """
        await self._check_rate_limit()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params,
                    json=json_data,
                )

                if response.status_code == 429:
                    # Rate limited - extract retry-after if available
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited, waiting {retry_after}s")
                    await asyncio.sleep(retry_after)
                    return await self._request(method, url, params, json_data)

                response.raise_for_status()
                return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None

    async def get_expirations(self, symbol: str) -> List[date]:
        """
        Get available expiration dates for a symbol.

        Args:
            symbol: Underlying symbol (e.g., 'AAPL')

        Returns:
            List of expiration dates sorted ascending
        """
        symbol = symbol.upper()

        # Check cache
        async with self._cache_lock:
            if symbol in self._expiration_cache:
                data, timestamp = self._expiration_cache[symbol]
                if datetime.now() - timestamp < timedelta(
                    seconds=self.expiration_cache_ttl
                ):
                    logger.debug(f"Using cached expirations for {symbol}")
                    return data

        # Fetch from API
        url = f"{self.TRADING_BASE_URL}/v2/options/contracts"
        params = {
            "underlying_symbols": symbol,
            "status": "active",
            "limit": 1000,
        }

        response = await self._request("GET", url, params=params)

        if not response or "option_contracts" not in response:
            logger.warning(f"No contracts found for {symbol}")
            return []

        # Extract unique expirations
        expirations = set()
        for contract in response["option_contracts"]:
            exp_str = contract.get("expiration_date")
            if exp_str:
                try:
                    exp_date = date.fromisoformat(exp_str)
                    expirations.add(exp_date)
                except ValueError:
                    continue

        result = sorted(expirations)

        # Cache result
        async with self._cache_lock:
            self._expiration_cache[symbol] = (result, datetime.now())

        logger.info(f"Found {len(result)} expirations for {symbol}")
        return result

    async def get_option_chain(
        self,
        symbol: str,
        expiration: Optional[date] = None,
        option_type: Optional[OptionType] = None,
        strike_min: Optional[float] = None,
        strike_max: Optional[float] = None,
        limit: int = 100,
    ) -> Optional[OptionChain]:
        """
        Get options chain for a symbol with quotes and Greeks.

        Args:
            symbol: Underlying symbol
            expiration: Filter by expiration date
            option_type: Filter by call/put
            strike_min: Minimum strike price
            strike_max: Maximum strike price
            limit: Maximum contracts to return

        Returns:
            OptionChain with contracts, or None on error
        """
        symbol = symbol.upper()
        cache_key = f"{symbol}:{expiration}:{option_type}:{strike_min}:{strike_max}"

        # Check cache
        async with self._cache_lock:
            if cache_key in self._chain_cache:
                chain, timestamp = self._chain_cache[cache_key]
                if datetime.now() - timestamp < timedelta(seconds=self.chain_cache_ttl):
                    logger.debug(f"Using cached chain for {cache_key}")
                    return chain

        # Get underlying price first
        underlying_price = await self._get_underlying_price(symbol)
        if underlying_price is None:
            logger.warning(f"Could not get underlying price for {symbol}")
            underlying_price = 0.0

        # Fetch snapshots from options data API (includes Greeks and IV)
        url = f"{self.DATA_BASE_URL}/v1beta1/options/snapshots/{symbol}"
        params = {
            "feed": self.feed,
            "limit": limit,
        }

        if expiration:
            params["expiration_date"] = expiration.isoformat()
        if option_type:
            params["type"] = option_type.value
        if strike_min:
            params["strike_price_gte"] = str(strike_min)
        if strike_max:
            params["strike_price_lte"] = str(strike_max)

        response = await self._request("GET", url, params=params)

        if not response or "snapshots" not in response:
            logger.warning(f"No snapshots found for {symbol}")
            return None

        # Parse contracts
        contracts = []
        expirations = set()

        for occ_symbol, snapshot in response["snapshots"].items():
            parsed = self.parse_occ_symbol(occ_symbol)
            if not parsed:
                continue

            expirations.add(parsed["expiration"])

            # Extract quote data
            quote = snapshot.get("latestQuote", {})
            trade = snapshot.get("latestTrade", {})
            greeks = snapshot.get("greeks", {})

            contract = OptionContract(
                symbol=occ_symbol,
                underlying_symbol=symbol,
                option_type=OptionType(parsed["option_type"]),
                strike_price=parsed["strike"],
                expiration_date=parsed["expiration"],
                bid=quote.get("bp"),
                ask=quote.get("ap"),
                last_price=trade.get("p"),
                volume=snapshot.get("dailyBar", {}).get("v"),
                open_interest=snapshot.get("openInterest"),
                delta=greeks.get("delta"),
                gamma=greeks.get("gamma"),
                theta=greeks.get("theta"),
                vega=greeks.get("vega"),
                implied_volatility=snapshot.get("impliedVolatility"),
            )

            # Calculate moneyness
            if underlying_price > 0:
                contract.calculate_moneyness(underlying_price)

            contracts.append(contract)

        chain = OptionChain(
            underlying_symbol=symbol,
            underlying_price=underlying_price,
            contracts=contracts,
            expirations=sorted(expirations),
            timestamp=datetime.now(),
        )

        # Cache result
        async with self._cache_lock:
            self._chain_cache[cache_key] = (chain, datetime.now())

        logger.info(
            f"Retrieved {len(contracts)} contracts for {symbol}, "
            f"underlying=${underlying_price:.2f}"
        )
        return chain

    async def get_option_quote(
        self,
        contract_symbol: str,
    ) -> Optional[OptionContract]:
        """
        Get real-time quote for a specific option contract.

        Args:
            contract_symbol: OCC format option symbol

        Returns:
            OptionContract with latest quote, or None on error
        """
        # Check cache
        async with self._cache_lock:
            if contract_symbol in self._quote_cache:
                contract, timestamp = self._quote_cache[contract_symbol]
                if datetime.now() - timestamp < timedelta(seconds=self.quote_cache_ttl):
                    return contract

        # Parse symbol
        parsed = self.parse_occ_symbol(contract_symbol)
        if not parsed:
            logger.error(f"Invalid OCC symbol: {contract_symbol}")
            return None

        # Fetch quote
        url = f"{self.DATA_BASE_URL}/v1beta1/options/quotes/latest"
        params = {
            "symbols": contract_symbol,
            "feed": self.feed,
        }

        response = await self._request("GET", url, params=params)

        if not response or "quotes" not in response:
            return None

        quote_data = response["quotes"].get(contract_symbol)
        if not quote_data:
            return None

        contract = OptionContract(
            symbol=contract_symbol,
            underlying_symbol=parsed["underlying"],
            option_type=OptionType(parsed["option_type"]),
            strike_price=parsed["strike"],
            expiration_date=parsed["expiration"],
            bid=quote_data.get("bp"),
            ask=quote_data.get("ap"),
        )

        # Cache result
        async with self._cache_lock:
            self._quote_cache[contract_symbol] = (contract, datetime.now())

        return contract

    async def get_option_quotes(
        self,
        contract_symbols: List[str],
    ) -> Dict[str, Optional[OptionContract]]:
        """
        Get real-time quotes for multiple option contracts.

        Args:
            contract_symbols: List of OCC format symbols (max 100)

        Returns:
            Dictionary mapping symbol to OptionContract
        """
        if not contract_symbols:
            return {}

        # Alpaca limits to 100 symbols per request
        if len(contract_symbols) > 100:
            contract_symbols = contract_symbols[:100]
            logger.warning("Truncated to 100 symbols for batch quote request")

        url = f"{self.DATA_BASE_URL}/v1beta1/options/quotes/latest"
        params = {
            "symbols": ",".join(contract_symbols),
            "feed": self.feed,
        }

        response = await self._request("GET", url, params=params)

        if not response or "quotes" not in response:
            return {}

        results = {}
        for occ_symbol in contract_symbols:
            quote_data = response["quotes"].get(occ_symbol)
            if not quote_data:
                results[occ_symbol] = None
                continue

            parsed = self.parse_occ_symbol(occ_symbol)
            if not parsed:
                results[occ_symbol] = None
                continue

            results[occ_symbol] = OptionContract(
                symbol=occ_symbol,
                underlying_symbol=parsed["underlying"],
                option_type=OptionType(parsed["option_type"]),
                strike_price=parsed["strike"],
                expiration_date=parsed["expiration"],
                bid=quote_data.get("bp"),
                ask=quote_data.get("ap"),
            )

        return results

    async def _get_underlying_price(self, symbol: str) -> Optional[float]:
        """
        Get current price of underlying stock.

        Args:
            symbol: Stock symbol

        Returns:
            Current price or None
        """
        url = f"{self.DATA_BASE_URL}/v2/stocks/{symbol}/quotes/latest"

        response = await self._request("GET", url)

        if not response or "quote" not in response:
            return None

        quote = response["quote"]
        # Use mid of bid/ask or last trade
        bid = quote.get("bp", 0)
        ask = quote.get("ap", 0)

        if bid and ask:
            return (bid + ask) / 2

        return quote.get("ap") or quote.get("bp")

    def clear_cache(self) -> None:
        """Clear all caches."""
        self._chain_cache.clear()
        self._expiration_cache.clear()
        self._quote_cache.clear()
        logger.info("Options cache cleared")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "chain_cache_size": len(self._chain_cache),
            "expiration_cache_size": len(self._expiration_cache),
            "quote_cache_size": len(self._quote_cache),
            "rate_limit_requests": self.rate_limit_requests,
            "recent_requests": len(self.request_timestamps),
        }

    async def health_check(self) -> bool:
        """
        Check API connectivity.

        Returns:
            True if API is accessible
        """
        try:
            # Try to get expirations for a common symbol
            expirations = await self.get_expirations("SPY")
            return len(expirations) > 0
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
