"""
Alpaca Markets API Integration

Provides real-time and historical market data from Alpaca Markets with:
- Real-time quote streaming
- Historical bar data
- Rate limiting and error handling
- Async operations
"""

import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.live import StockDataStream
from alpaca.data.models import Bar, Quote, Trade
from alpaca.data.requests import StockBarsRequest, StockLatestQuoteRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.trading.client import TradingClient

logger = logging.getLogger(__name__)


class TimeFrameEnum(str, Enum):
    """TimeFrame enumeration for bar data."""

    MINUTE_1 = "1min"
    MINUTE_5 = "5min"
    MINUTE_15 = "15min"
    MINUTE_30 = "30min"
    HOUR_1 = "1h"
    DAY_1 = "1d"
    WEEK_1 = "1w"
    MONTH_1 = "1mo"


class AlpacaClient:
    """
    Alpaca Markets API client for DeepStack Trading System.

    Provides unified interface for:
    - Real-time quotes and bars
    - Historical data with caching
    - Rate limiting to respect API limits
    - Error handling and retry logic
    """

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://paper-api.alpaca.markets",
        rate_limit_requests: int = 200,
        rate_limit_window: int = 60,
    ):
        """
        Initialize Alpaca client.

        Args:
            api_key: Alpaca API key
            secret_key: Alpaca secret key
            base_url: Alpaca API base URL (default: paper trading)
            rate_limit_requests: Max requests per window
            rate_limit_window: Time window in seconds
        """
        if not api_key or not secret_key:
            raise ValueError("API key and secret key are required")

        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url

        # Initialize clients
        # Determine if paper trading based on URL
        is_paper = "paper" in base_url.lower()
        self.trading_client = TradingClient(
            api_key=api_key,
            secret_key=secret_key,
            paper=is_paper,
            url_override=base_url,
        )
        self.data_client = StockHistoricalDataClient(
            api_key=api_key, secret_key=secret_key
        )

        # Rate limiting
        self.rate_limit_requests = rate_limit_requests
        self.rate_limit_window = rate_limit_window
        self.request_timestamps: List[float] = []

        # Cache settings
        self.quote_cache: Dict[str, tuple] = {}  # (data, timestamp)
        self.cache_ttl = 60  # 1 minute for quotes

        # WebSocket streaming
        self.is_connected = False
        self.data_stream: Optional[StockDataStream] = None
        self._stream_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._subscribed_symbols: set = set()

        # Callbacks for real-time data
        self._quote_callbacks: Dict[str, List[Callable]] = {}
        self._trade_callbacks: Dict[str, List[Callable]] = {}
        self._bar_callbacks: Dict[str, List[Callable]] = {}

        # Reconnection settings
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 5
        self._reconnect_delay = 1.0
        self._reconnect_max_delay = 60.0

        # Thread safety
        self._cache_lock = asyncio.Lock()
        self._connection_lock = asyncio.Lock()

        # Initialize News Client
        from alpaca.data.historical.news import NewsClient

        self.news_client = NewsClient(
            api_key=api_key,
            secret_key=secret_key,
            url_override=(
                base_url if "paper" not in base_url.lower() else None
            ),  # News API doesn't use paper URL
        )

        logger.info(f"AlpacaClient initialized with base_url: {base_url}")

    async def get_news(
        self,
        symbol: Optional[str] = None,
        limit: int = 10,
        start_date: Optional[datetime] = None,
        include_content: bool = False,
        page_token: Optional[str] = None,
    ) -> Dict:
        """
        Get market news with pagination support.

        Args:
            symbol: Optional symbol to filter by
            limit: Max number of articles (default 10)
            start_date: Optional start date filter
            include_content: Whether to include full article content
            page_token: Optional pagination token for loading more articles

        Returns:
            Dict with 'articles' list and optional 'next_page_token'
        """
        try:
            from alpaca.data.requests import NewsRequest

            params = NewsRequest(limit=limit, include_content=include_content)

            if symbol:
                params.symbols = symbol

            if start_date:
                params.start = start_date

            if page_token:
                params.page_token = page_token

            # Run in executor since NewsClient is synchronous
            news_set = await asyncio.get_event_loop().run_in_executor(
                None, self.news_client.get_news, params
            )

            results = []
            # NewsSet stores articles in data["news"] as News objects
            news_list = []
            if hasattr(news_set, "data") and isinstance(news_set.data, dict):
                news_list = news_set.data.get("news", [])

            logger.info(f"Alpaca News API returned {len(news_list)} articles")

            for article in news_list:
                # Articles are News objects - use attribute access, not dict
                created_at = getattr(article, "created_at", None)
                published_at = (
                    created_at.isoformat()
                    if hasattr(created_at, "isoformat")
                    else str(created_at) if created_at else ""
                )

                results.append(
                    {
                        "id": str(getattr(article, "id", "")),
                        "headline": getattr(article, "headline", "") or "",
                        "summary": getattr(article, "summary", "") or "",
                        "url": getattr(article, "url", "") or "",
                        "source": getattr(article, "source", "") or "",
                        "publishedAt": published_at,
                        "symbols": list(getattr(article, "symbols", []) or []),
                        "author": getattr(article, "author", "") or "",
                        "sentiment": "neutral",  # Alpaca: no sentiment
                    }
                )

            # Extract next_page_token for pagination
            next_token = getattr(news_set, "next_page_token", None)

            return {
                "articles": results,
                "next_page_token": next_token,
            }

        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return {"articles": [], "next_page_token": None}

    async def _check_rate_limit(self) -> None:
        """
        Check and enforce rate limits.

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        import time

        current_time = time.time()

        # Remove old timestamps outside the window
        self.request_timestamps = [
            ts
            for ts in self.request_timestamps
            if current_time - ts < self.rate_limit_window
        ]

        # Check if we've exceeded the limit
        if len(self.request_timestamps) >= self.rate_limit_requests:
            wait_time = (
                self.request_timestamps[0] + self.rate_limit_window - current_time
            )
            count = len(self.request_timestamps)
            logger.warning(
                f"Rate limit approaching: {count}/{self.rate_limit_requests} "
                f"in last {self.rate_limit_window}s. Waiting {wait_time:.2f}s"
            )
            await asyncio.sleep(wait_time + 0.1)
            return await self._check_rate_limit()

        # Record this request
        self.request_timestamps.append(current_time)

    async def get_quote(self, symbol: str) -> Optional[Dict]:
        """
        Get latest quote for a symbol.

        Args:
            symbol: Stock symbol (e.g., 'AAPL')

        Returns:
            Quote data with bid, ask, last price, volume; None if error
        """
        try:
            await self._check_rate_limit()

            # Check cache first
            if symbol in self.quote_cache:
                data, timestamp = self.quote_cache[symbol]
                if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
                    logger.debug(f"Using cached quote for {symbol}")
                    return data

            # Fetch from API
            request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quote = self.data_client.get_stock_latest_quote(request)

            if not quote or symbol not in quote:
                logger.warning(f"No quote data received for {symbol}")
                return None

            quote_data = quote[symbol]

            result = {
                "symbol": symbol,
                "bid": quote_data.bid_price,
                "ask": quote_data.ask_price,
                "last": quote_data.ask_price,  # Use ask as last price
                "bid_volume": quote_data.bid_size,
                "ask_volume": quote_data.ask_size,
                "timestamp": datetime.now().isoformat(),
            }

            # Cache the result
            self.quote_cache[symbol] = (result, datetime.now())

            bid, ask = result["bid"], result["ask"]
            logger.debug(f"Retrieved quote for {symbol}: bid={bid}, ask={ask}")
            return result

        except Exception as e:
            logger.error(f"Error getting quote for {symbol}: {e}")
            return None

    async def get_quotes(self, symbols: List[str]) -> Dict[str, Optional[Dict]]:
        """
        Get latest quotes for multiple symbols.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to quote data
        """
        quotes = {}
        for symbol in symbols:
            quotes[symbol] = await self.get_quote(symbol)
            await asyncio.sleep(0.01)  # Small delay between requests
        return quotes

    async def get_bars(
        self,
        symbol: str,
        timeframe: TimeFrameEnum = TimeFrameEnum.DAY_1,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> Optional[List[Dict]]:
        """
        Get historical bar data for a symbol.

        Args:
            symbol: Stock symbol
            timeframe: TimeFrame enum value (default: 1 day)
            start_date: Start date (default: 30 days ago)
            end_date: End date (default: today)
            limit: Maximum number of bars to return

        Returns:
            List of bar data dicts with OHLCV; None if error
        """
        try:
            await self._check_rate_limit()

            # Set default dates
            if end_date is None:
                end_date = datetime.now()
            if start_date is None:
                start_date = end_date - timedelta(days=30)

            # Map timeframe string to TimeFrame object
            timeframe_map = {
                TimeFrameEnum.MINUTE_1: TimeFrame.Minute,
                TimeFrameEnum.MINUTE_5: TimeFrame.Minute,  # Will use multiplier
                TimeFrameEnum.MINUTE_15: TimeFrame.Minute,
                TimeFrameEnum.MINUTE_30: TimeFrame.Minute,
                TimeFrameEnum.HOUR_1: TimeFrame.Hour,
                TimeFrameEnum.DAY_1: TimeFrame.Day,
                TimeFrameEnum.WEEK_1: TimeFrame.Week,
                TimeFrameEnum.MONTH_1: TimeFrame.Month,
            }

            tf = timeframe_map.get(timeframe, TimeFrame.Day)

            # Create request
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf,
                start=start_date,
                end=end_date,
                limit=limit,
            )

            bars = self.data_client.get_stock_bars(request)

            # BarSet object uses .data dict for symbol lookup
            if not bars or not bars.data or symbol not in bars.data:
                logger.warning(f"No bar data received for {symbol}")
                return None

            result = []
            for bar in bars.data[symbol]:
                result.append(
                    {
                        "symbol": symbol,
                        "timestamp": bar.timestamp.isoformat(),
                        "open": bar.open,
                        "high": bar.high,
                        "low": bar.low,
                        "close": bar.close,
                        "volume": bar.volume,
                        "trade_count": (
                            bar.trade_count if hasattr(bar, "trade_count") else None
                        ),
                        "vwap": bar.vwap if hasattr(bar, "vwap") else None,
                    }
                )

            logger.debug(
                f"Retrieved {len(result)} bars for {symbol} with timeframe {timeframe}"
            )
            return result

        except Exception as e:
            logger.error(f"Error getting bars for {symbol}: {e}")
            return None

    async def get_account(self) -> Optional[Dict]:
        """
        Get account information.

        Returns:
            Account data including buying power, equity, etc; None if error
        """
        try:
            await self._check_rate_limit()

            account = self.trading_client.get_account()

            if not account:
                logger.warning("No account data received")
                return None

            result = {
                "account_number": account.account_number,
                "buying_power": float(account.buying_power),
                "cash": float(account.cash),
                "portfolio_value": float(account.portfolio_value),
                "long_market_value": float(account.long_market_value),
                "short_market_value": float(account.short_market_value),
                "equity": float(account.equity),
                "last_equity": float(account.last_equity),
                "multiplier": account.multiplier,
                "shorting_enabled": account.shorting_enabled,
                "status": account.status,
            }

            logger.debug(
                f"Retrieved account: portfolio_value=${result['portfolio_value']:.2f}"
            )
            return result

        except Exception as e:
            logger.error(f"Error getting account: {e}")
            return None

    async def _handle_quote(self, quote: Quote) -> None:
        """
        Handle incoming quote data from WebSocket.

        Args:
            quote: Quote object from Alpaca
        """
        try:
            symbol = quote.symbol

            # Update cache with thread safety
            async with self._cache_lock:
                quote_data = {
                    "symbol": symbol,
                    "bid": quote.bid_price,
                    "ask": quote.ask_price,
                    "last": quote.ask_price,
                    "bid_volume": quote.bid_size,
                    "ask_volume": quote.ask_size,
                    "timestamp": datetime.now().isoformat(),
                }
                self.quote_cache[symbol] = (quote_data, datetime.now())

            # Trigger callbacks
            if symbol in self._quote_callbacks:
                for callback in self._quote_callbacks[symbol]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(quote_data)
                        else:
                            callback(quote_data)
                    except Exception as e:
                        logger.error(f"Error in quote callback for {symbol}: {e}")

            logger.debug(
                f"Quote update: {symbol} bid={quote.bid_price} ask={quote.ask_price}"
            )

        except Exception as e:
            logger.error(f"Error handling quote: {e}")

    async def _handle_trade(self, trade: Trade) -> None:
        """
        Handle incoming trade data from WebSocket.

        Args:
            trade: Trade object from Alpaca
        """
        try:
            symbol = trade.symbol

            trade_data = {
                "symbol": symbol,
                "price": trade.price,
                "size": trade.size,
                "timestamp": trade.timestamp.isoformat() if trade.timestamp else None,
                "conditions": (
                    trade.conditions if hasattr(trade, "conditions") else None
                ),
            }

            # Trigger callbacks
            if symbol in self._trade_callbacks:
                for callback in self._trade_callbacks[symbol]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(trade_data)
                        else:
                            callback(trade_data)
                    except Exception as e:
                        logger.error(f"Error in trade callback for {symbol}: {e}")

            logger.debug(
                f"Trade update: {symbol} price={trade.price} size={trade.size}"
            )

        except Exception as e:
            logger.error(f"Error handling trade: {e}")

    async def _handle_bar(self, bar: Bar) -> None:
        """
        Handle incoming bar data from WebSocket.

        Args:
            bar: Bar object from Alpaca
        """
        try:
            symbol = bar.symbol

            bar_data = {
                "symbol": symbol,
                "timestamp": bar.timestamp.isoformat() if bar.timestamp else None,
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume,
                "trade_count": bar.trade_count if hasattr(bar, "trade_count") else None,
                "vwap": bar.vwap if hasattr(bar, "vwap") else None,
            }

            # Trigger callbacks
            if symbol in self._bar_callbacks:
                for callback in self._bar_callbacks[symbol]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(bar_data)
                        else:
                            callback(bar_data)
                    except Exception as e:
                        logger.error(f"Error in bar callback for {symbol}: {e}")

            logger.debug(f"Bar update: {symbol} close={bar.close} volume={bar.volume}")

        except Exception as e:
            logger.error(f"Error handling bar: {e}")

    async def _heartbeat_monitor(self) -> None:
        """
        Monitor connection health and handle reconnections.
        """
        while self.is_connected:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds

                # Check if stream is still alive
                if self.data_stream and not self.is_connected:
                    logger.warning("Connection lost, attempting reconnect...")
                    await self._reconnect()

            except asyncio.CancelledError:
                logger.info("Heartbeat monitor cancelled")
                break
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {e}")
                await asyncio.sleep(5)

    async def _reconnect(self) -> bool:
        """
        Attempt to reconnect with exponential backoff.

        Returns:
            True if reconnection successful
        """
        async with self._connection_lock:
            if self._reconnect_attempts >= self._max_reconnect_attempts:
                max_attempts = self._max_reconnect_attempts
                logger.error(f"Max reconnection attempts ({max_attempts}) reached")
                return False

            self._reconnect_attempts += 1
            delay = min(
                self._reconnect_delay * (2 ** (self._reconnect_attempts - 1)),
                self._reconnect_max_delay,
            )

            attempts = self._reconnect_attempts
            max_attempts = self._max_reconnect_attempts
            logger.info(
                f"Reconnection attempt {attempts}/{max_attempts} "
                f"after {delay:.1f}s delay"
            )

            await asyncio.sleep(delay)

            try:
                # Store symbols to resubscribe
                symbols_to_resubscribe = list(self._subscribed_symbols)

                # Disconnect cleanly
                if self.data_stream:
                    try:
                        await self.data_stream.close()
                    except Exception:  # nosec B110 - intentional ignore on cleanup
                        pass  # Ignore close errors during reconnection

                # Reconnect
                success = await self.connect_stream(symbols_to_resubscribe)

                if success:
                    logger.info("Reconnection successful")
                    self._reconnect_attempts = 0
                    return True
                else:
                    logger.warning("Reconnection failed")
                    return False

            except Exception as e:
                logger.error(f"Error during reconnection: {e}")
                return False

    async def connect_stream(self, symbols: List[str]) -> bool:
        """
        Connect to real-time quote stream and subscribe to symbols.

        Args:
            symbols: List of symbols to stream

        Returns:
            True if connection successful
        """
        try:
            async with self._connection_lock:
                if self.is_connected:
                    logger.warning("Already connected to stream")
                    return False

                # Initialize data stream
                self.data_stream = StockDataStream(
                    api_key=self.api_key, secret_key=self.secret_key
                )

                # Subscribe to quotes for all symbols
                self.data_stream.subscribe_quotes(self._handle_quote, *symbols)

                # Subscribe to trades for all symbols
                self.data_stream.subscribe_trades(self._handle_trade, *symbols)

                # Subscribe to bars (minute bars) for all symbols
                self.data_stream.subscribe_bars(self._handle_bar, *symbols)

                # Store subscribed symbols
                self._subscribed_symbols.update(symbols)

                # Start the stream in a background task
                self._stream_task = asyncio.create_task(self.data_stream.run())

                # Start heartbeat monitor
                self._heartbeat_task = asyncio.create_task(self._heartbeat_monitor())

                self.is_connected = True
                logger.info(
                    f"Connected to Alpaca stream and subscribed to "
                    f"{len(symbols)} symbols: {symbols}"
                )
                return True

        except Exception as e:
            logger.error(f"Error connecting to stream: {e}")
            self.is_connected = False
            return False

    async def disconnect_stream(self) -> bool:
        """
        Disconnect from real-time stream.

        Returns:
            True if disconnection successful
        """
        try:
            async with self._connection_lock:
                if not self.is_connected:
                    logger.warning("Stream not connected")
                    return False

                # Cancel heartbeat monitor
                if self._heartbeat_task and not self._heartbeat_task.done():
                    self._heartbeat_task.cancel()
                    try:
                        await self._heartbeat_task
                    except asyncio.CancelledError:
                        pass

                # Close stream
                if self.data_stream:
                    try:
                        await self.data_stream.close()
                    except Exception as e:
                        logger.warning(f"Error closing stream: {e}")

                # Cancel stream task
                if self._stream_task and not self._stream_task.done():
                    self._stream_task.cancel()
                    try:
                        await self._stream_task
                    except asyncio.CancelledError:
                        pass

                # Reset state
                self.is_connected = False
                self.data_stream = None
                self._stream_task = None
                self._heartbeat_task = None
                self._reconnect_attempts = 0

                logger.info("Disconnected from Alpaca stream")
                return True

        except Exception as e:
            logger.error(f"Error disconnecting stream: {e}")
            return False

    def subscribe_to_symbol(self, symbol: str) -> bool:
        """
        Subscribe to additional symbol on existing stream.

        Args:
            symbol: Symbol to subscribe to

        Returns:
            True if subscription successful
        """
        try:
            if not self.is_connected or not self.data_stream:
                logger.warning("Stream not connected, cannot subscribe")
                return False

            self.data_stream.subscribe_quotes(self._handle_quote, symbol)
            self.data_stream.subscribe_trades(self._handle_trade, symbol)
            self.data_stream.subscribe_bars(self._handle_bar, symbol)

            self._subscribed_symbols.add(symbol)
            logger.info(f"Subscribed to {symbol}")
            return True

        except Exception as e:
            logger.error(f"Error subscribing to {symbol}: {e}")
            return False

    def unsubscribe_from_symbol(self, symbol: str) -> bool:
        """
        Unsubscribe from symbol on existing stream.

        Args:
            symbol: Symbol to unsubscribe from

        Returns:
            True if unsubscription successful
        """
        try:
            if not self.is_connected or not self.data_stream:
                logger.warning("Stream not connected, cannot unsubscribe")
                return False

            self.data_stream.unsubscribe_quotes(symbol)
            self.data_stream.unsubscribe_trades(symbol)
            self.data_stream.unsubscribe_bars(symbol)

            self._subscribed_symbols.discard(symbol)
            logger.info(f"Unsubscribed from {symbol}")
            return True

        except Exception as e:
            logger.error(f"Error unsubscribing from {symbol}: {e}")
            return False

    def on_quote(self, symbol: str, callback: Callable[[Dict], Any]) -> None:
        """
        Register callback for quote updates.

        Args:
            symbol: Symbol to watch
            callback: Function to call with quote data
        """
        if symbol not in self._quote_callbacks:
            self._quote_callbacks[symbol] = []
        self._quote_callbacks[symbol].append(callback)
        logger.info(f"Registered quote callback for {symbol}")

    def on_trade(self, symbol: str, callback: Callable[[Dict], Any]) -> None:
        """
        Register callback for trade updates.

        Args:
            symbol: Symbol to watch
            callback: Function to call with trade data
        """
        if symbol not in self._trade_callbacks:
            self._trade_callbacks[symbol] = []
        self._trade_callbacks[symbol].append(callback)
        logger.info(f"Registered trade callback for {symbol}")

    def on_bar(self, symbol: str, callback: Callable[[Dict], Any]) -> None:
        """
        Register callback for bar updates.

        Args:
            symbol: Symbol to watch
            callback: Function to call with bar data
        """
        if symbol not in self._bar_callbacks:
            self._bar_callbacks[symbol] = []
        self._bar_callbacks[symbol].append(callback)
        logger.info(f"Registered bar callback for {symbol}")

    def remove_callbacks(self, symbol: str) -> None:
        """
        Remove all callbacks for a symbol.

        Args:
            symbol: Symbol to remove callbacks for
        """
        self._quote_callbacks.pop(symbol, None)
        self._trade_callbacks.pop(symbol, None)
        self._bar_callbacks.pop(symbol, None)
        logger.info(f"Removed all callbacks for {symbol}")

    def clear_cache(self) -> None:
        """Clear quote cache."""
        self.quote_cache.clear()
        logger.info("Quote cache cleared")

    def get_cache_stats(self) -> Dict:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache info
        """
        return {
            "cached_quotes": len(self.quote_cache),
            "rate_limit_requests": self.rate_limit_requests,
            "rate_limit_window": self.rate_limit_window,
            "recent_requests": len(self.request_timestamps),
        }

    async def health_check(self) -> bool:
        """
        Check API connectivity and credentials.

        Returns:
            True if API is accessible and credentials are valid
        """
        try:
            await self._check_rate_limit()
            account = await self.get_account()
            return account is not None
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
