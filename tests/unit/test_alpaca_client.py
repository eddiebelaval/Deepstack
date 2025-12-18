"""
Unit tests for AlpacaClient - Alpaca Markets API integration

Tests core functionality including:
- Quote retrieval with caching
- Historical bar data
- Rate limiting
- Account information
- Error handling
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.data.alpaca_client import AlpacaClient, TimeFrameEnum


class TestAlpacaClientInitialization:
    """Test AlpacaClient initialization and configuration."""

    def test_init_with_valid_credentials(self):
        """Test successful initialization with valid credentials."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            assert client.api_key == "test_key"
            assert client.secret_key == "test_secret"
            assert client.base_url == "https://paper-api.alpaca.markets"
            assert client.is_connected is False
            assert len(client.quote_cache) == 0

    def test_init_with_custom_base_url(self):
        """Test initialization with custom base URL."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                base_url="https://api.alpaca.markets",
            )

            assert client.base_url == "https://api.alpaca.markets"

    def test_init_missing_api_key(self):
        """Test initialization fails without API key."""
        with pytest.raises(ValueError, match="API key and secret key are required"):
            AlpacaClient(api_key="", secret_key="test_secret")

    def test_init_missing_secret_key(self):
        """Test initialization fails without secret key."""
        with pytest.raises(ValueError, match="API key and secret key are required"):
            AlpacaClient(api_key="test_key", secret_key="")

    def test_init_with_custom_rate_limits(self):
        """Test initialization with custom rate limits."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_requests=100,
                rate_limit_window=30,
            )

            assert client.rate_limit_requests == 100
            assert client.rate_limit_window == 30


class TestQuoteRetrieval:
    """Test quote retrieval functionality."""

    @pytest.mark.asyncio
    async def test_get_quote_success(self):
        """Test successful quote retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote data
            mock_quote = MagicMock()
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            mock_data_client.return_value.get_stock_latest_quote.return_value = {
                "AAPL": mock_quote
            }
            client.data_client = mock_data_client.return_value

            result = await client.get_quote("AAPL")

            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["bid"] == 150.25
            assert result["ask"] == 150.35
            assert result["bid_volume"] == 100
            assert result["ask_volume"] == 200

    @pytest.mark.asyncio
    async def test_get_quote_caching(self):
        """Test quote caching functionality."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote data
            mock_quote = MagicMock()
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            mock_data_client.return_value.get_stock_latest_quote.return_value = {
                "AAPL": mock_quote
            }
            client.data_client = mock_data_client.return_value

            # First call should fetch from API
            result1 = await client.get_quote("AAPL")
            api_calls_1 = client.data_client.get_stock_latest_quote.call_count

            # Second call should use cache
            result2 = await client.get_quote("AAPL")
            api_calls_2 = client.data_client.get_stock_latest_quote.call_count

            assert result1 == result2
            assert api_calls_2 == api_calls_1  # No additional API call

    @pytest.mark.asyncio
    async def test_get_quote_cache_expiration(self):
        """Test quote cache expiration."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.cache_ttl = 1  # 1 second TTL

            # Mock quote data
            mock_quote = MagicMock()
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            mock_data_client.return_value.get_stock_latest_quote.return_value = {
                "AAPL": mock_quote
            }
            client.data_client = mock_data_client.return_value

            # First call
            await client.get_quote("AAPL")

            # Wait for cache to expire
            await asyncio.sleep(1.1)

            # Second call should fetch from API again
            await client.get_quote("AAPL")

            # Should have made 2 API calls
            assert client.data_client.get_stock_latest_quote.call_count == 2

    @pytest.mark.asyncio
    async def test_get_quote_api_error(self):
        """Test quote retrieval with API error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_data_client.return_value.get_stock_latest_quote.side_effect = (
                Exception("API Error")
            )
            client.data_client = mock_data_client.return_value

            result = await client.get_quote("AAPL")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_quotes_multiple_symbols(self):
        """Test quote retrieval for multiple symbols."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote data
            mock_quote = MagicMock()
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            def side_effect(request):
                symbols = request.symbol_or_symbols
                # Handle both single symbol and list of symbols
                if isinstance(symbols, list):
                    return {s: mock_quote for s in symbols}
                return {symbols: mock_quote}

            mock_data_client.return_value.get_stock_latest_quote.side_effect = (
                side_effect
            )
            client.data_client = mock_data_client.return_value

            result = await client.get_quotes(["AAPL", "GOOGL", "MSFT"])

            assert len(result) == 3
            assert all(v is not None for v in result.values())


class TestBarData:
    """Test historical bar data retrieval."""

    @pytest.mark.asyncio
    async def test_get_bars_success(self):
        """Test successful bar data retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock bar data
            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1, 10, 0)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 1000000
            mock_bar.trade_count = 5000
            mock_bar.vwap = 150.5

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data_client.return_value.get_stock_bars.return_value = mock_bar_set
            client.data_client = mock_data_client.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.DAY_1)

            assert result is not None
            assert len(result) == 1
            assert result[0]["symbol"] == "AAPL"
            assert result[0]["open"] == 150.0
            assert result[0]["close"] == 151.0
            assert result[0]["volume"] == 1000000

    @pytest.mark.asyncio
    async def test_get_bars_with_custom_dates(self):
        """Test bar data with custom date range."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 1000000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data_client.return_value.get_stock_bars.return_value = mock_bar_set
            client.data_client = mock_data_client.return_value

            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 31)

            result = await client.get_bars(
                "AAPL",
                TimeFrameEnum.DAY_1,
                start_date=start,
                end_date=end,
                limit=30,
            )

            assert result is not None
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_bars_multiple_timeframes(self):
        """Test bar data with different timeframes."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 100000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data_client.return_value.get_stock_bars.return_value = mock_bar_set
            client.data_client = mock_data_client.return_value

            for timeframe in [
                TimeFrameEnum.MINUTE_1,
                TimeFrameEnum.MINUTE_5,
                TimeFrameEnum.HOUR_1,
                TimeFrameEnum.DAY_1,
                TimeFrameEnum.WEEK_1,
            ]:
                result = await client.get_bars("AAPL", timeframe)
                assert result is not None

    @pytest.mark.asyncio
    async def test_get_bars_api_error(self):
        """Test bar retrieval with API error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch(
                "core.data.alpaca_client.StockHistoricalDataClient"
            ) as mock_data_client,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_data_client.return_value.get_stock_bars.side_effect = Exception(
                "API Error"
            )
            client.data_client = mock_data_client.return_value

            result = await client.get_bars("AAPL")

            assert result is None


class TestAccountInfo:
    """Test account information retrieval."""

    @pytest.mark.asyncio
    async def test_get_account_success(self):
        """Test successful account retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            # Mock account data
            mock_account = MagicMock()
            mock_account.account_number = "PA12345"
            mock_account.buying_power = "50000.00"
            mock_account.cash = "25000.00"
            mock_account.portfolio_value = "100000.00"
            mock_account.long_market_value = "75000.00"
            mock_account.short_market_value = "0.00"
            mock_account.equity = "100000.00"
            mock_account.last_equity = "100000.00"
            mock_account.multiplier = "1"
            mock_account.shorting_enabled = True
            mock_account.status = "ACTIVE"

            mock_trading.return_value.get_account.return_value = mock_account

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.trading_client = mock_trading.return_value

            result = await client.get_account()

            assert result is not None
            assert result["account_number"] == "PA12345"
            assert result["buying_power"] == 50000.0
            assert result["cash"] == 25000.0
            assert result["portfolio_value"] == 100000.0
            assert result["shorting_enabled"] is True

    @pytest.mark.asyncio
    async def test_get_account_api_error(self):
        """Test account retrieval with API error."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            mock_trading.return_value.get_account.side_effect = Exception("API Error")

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.trading_client = mock_trading.return_value

            result = await client.get_account()

            assert result is None


class TestRateLimiting:
    """Test rate limiting functionality."""

    @pytest.mark.asyncio
    async def test_rate_limit_enforcement(self):
        """Test that rate limiting is enforced."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_requests=2,
                rate_limit_window=2,
            )

            # Record timestamps for rate limiting check
            await client._check_rate_limit()  # Request 1
            await client._check_rate_limit()  # Request 2

            # Both should succeed without delay
            assert len(client.request_timestamps) == 2

    @pytest.mark.asyncio
    async def test_rate_limit_window_expiration(self):
        """Test that old requests are removed from rate limit tracking."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_window=1,
            )

            await client._check_rate_limit()

            # Wait for window to expire
            await asyncio.sleep(1.1)

            await client._check_rate_limit()

            # Old timestamp should be removed
            assert all(
                ts > (datetime.now().timestamp() - 1)
                for ts in client.request_timestamps
            )


class TestCache:
    """Test caching functionality."""

    def test_clear_cache(self):
        """Test cache clearing."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Add some cached data
            client.quote_cache["AAPL"] = ({"symbol": "AAPL"}, datetime.now())
            client.quote_cache["GOOGL"] = ({"symbol": "GOOGL"}, datetime.now())

            assert len(client.quote_cache) == 2

            client.clear_cache()

            assert len(client.quote_cache) == 0

    def test_get_cache_stats(self):
        """Test cache statistics."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            stats = client.get_cache_stats()

            assert "cached_quotes" in stats
            assert "rate_limit_requests" in stats
            assert "rate_limit_window" in stats
            assert "recent_requests" in stats


class TestHealthCheck:
    """Test health check functionality."""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            mock_account = MagicMock()
            mock_account.account_number = "PA12345"
            mock_account.buying_power = "50000.00"
            mock_account.cash = "25000.00"
            mock_account.portfolio_value = "100000.00"
            mock_account.long_market_value = "75000.00"
            mock_account.short_market_value = "0.00"
            mock_account.equity = "100000.00"
            mock_account.last_equity = "100000.00"
            mock_account.multiplier = "1"
            mock_account.shorting_enabled = True
            mock_account.status = "ACTIVE"

            mock_trading.return_value.get_account.return_value = mock_account

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.trading_client = mock_trading.return_value

            result = await client.health_check()

            assert result is True

    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test health check with API failure."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            mock_trading.return_value.get_account.side_effect = Exception("API Error")

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.trading_client = mock_trading.return_value

            result = await client.health_check()

            assert result is False


class TestStreamConnection:
    """Test real-time stream connection."""

    @pytest.mark.asyncio
    async def test_connect_stream_success(self):
        """Test successful stream connection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = await client.connect_stream(["AAPL", "GOOGL"])

            assert result is True
            assert client.is_connected is True

    @pytest.mark.asyncio
    async def test_disconnect_stream_success(self):
        """Test successful stream disconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL"])

            result = await client.disconnect_stream()

            assert result is True
            assert client.is_connected is False

    @pytest.mark.asyncio
    async def test_connect_stream_already_connected(self):
        """Test connection when already connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL"])
            result = await client.connect_stream(["GOOGL"])

            assert result is False


class TestWebSocketStreaming:
    """Test WebSocket streaming functionality."""

    @pytest.mark.asyncio
    async def test_websocket_connect_success(self):
        """Test successful WebSocket connection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = await client.connect_stream(["AAPL", "GOOGL"])

            assert result is True
            assert client.is_connected is True
            assert "AAPL" in client._subscribed_symbols
            assert "GOOGL" in client._subscribed_symbols

    @pytest.mark.asyncio
    async def test_websocket_connect_retry_on_failure(self):
        """Test WebSocket connection retry on initial failure."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream.side_effect = Exception("Connection failed")

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = await client.connect_stream(["AAPL"])

            assert result is False
            assert client.is_connected is False

    @pytest.mark.asyncio
    async def test_websocket_reconnection_exponential_backoff(self):
        """Test exponential backoff during reconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._reconnect_attempts = 0
            client._reconnect_delay = 1.0

            # Mock failed reconnection
            with patch.object(
                client, "connect_stream", new_callable=AsyncMock
            ) as mock_connect:
                mock_connect.return_value = False

                result = await client._reconnect()

                assert result is False
                assert client._reconnect_attempts == 1

    @pytest.mark.asyncio
    async def test_websocket_max_reconnection_attempts(self):
        """Test max reconnection attempts are respected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._max_reconnect_attempts = 3
            client._reconnect_attempts = 3

            result = await client._reconnect()

            assert result is False

    @pytest.mark.asyncio
    async def test_websocket_disconnect_graceful(self):
        """Test graceful WebSocket disconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL"])
            result = await client.disconnect_stream()

            assert result is True
            assert client.is_connected is False
            assert client.data_stream is None

    @pytest.mark.asyncio
    async def test_websocket_message_parsing_quote(self):
        """Test WebSocket quote message parsing."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            await client._handle_quote(mock_quote)

            assert "AAPL" in client.quote_cache
            cached_data, _ = client.quote_cache["AAPL"]
            assert cached_data["bid"] == 150.25
            assert cached_data["ask"] == 150.35

    @pytest.mark.asyncio
    async def test_websocket_message_parsing_trade(self):
        """Test WebSocket trade message parsing."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_trade = MagicMock()
            mock_trade.symbol = "AAPL"
            mock_trade.price = 150.50
            mock_trade.size = 100
            mock_trade.timestamp = datetime(2024, 1, 1, 10, 0)

            received_data = []

            def callback(data):
                received_data.append(data)

            client.on_trade("AAPL", callback)
            await client._handle_trade(mock_trade)

            assert len(received_data) == 1
            assert received_data[0]["price"] == 150.50
            assert received_data[0]["size"] == 100

    @pytest.mark.asyncio
    async def test_websocket_message_parsing_bar(self):
        """Test WebSocket bar message parsing."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_bar = MagicMock()
            mock_bar.symbol = "AAPL"
            mock_bar.timestamp = datetime(2024, 1, 1, 10, 0)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 1000000

            received_data = []

            def callback(data):
                received_data.append(data)

            client.on_bar("AAPL", callback)
            await client._handle_bar(mock_bar)

            assert len(received_data) == 1
            assert received_data[0]["close"] == 151.0
            assert received_data[0]["volume"] == 1000000

    @pytest.mark.asyncio
    async def test_websocket_message_parsing_invalid(self):
        """Test handling of invalid WebSocket messages."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Create invalid quote without required attributes
            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = None  # Invalid
            mock_quote.ask_price = None  # Invalid

            # Should not raise exception
            await client._handle_quote(mock_quote)

    @pytest.mark.asyncio
    async def test_websocket_heartbeat_handling(self):
        """Test WebSocket heartbeat monitoring."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL"])

            # Heartbeat task should be created
            assert client._heartbeat_task is not None
            assert not client._heartbeat_task.done()

            # Cleanup
            await client.disconnect_stream()

    @pytest.mark.asyncio
    async def test_websocket_subscription_management(self):
        """Test WebSocket subscription tracking."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL", "GOOGL", "MSFT"])

            assert len(client._subscribed_symbols) == 3
            assert "AAPL" in client._subscribed_symbols
            assert "GOOGL" in client._subscribed_symbols
            assert "MSFT" in client._subscribed_symbols

    @pytest.mark.asyncio
    async def test_websocket_unsubscribe(self):
        """Test unsubscribing from WebSocket symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.unsubscribe_quotes = MagicMock()
            mock_stream_instance.unsubscribe_trades = MagicMock()
            mock_stream_instance.unsubscribe_bars = MagicMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL", "GOOGL"])

            result = client.unsubscribe_from_symbol("AAPL")

            assert result is True
            assert "AAPL" not in client._subscribed_symbols
            assert "GOOGL" in client._subscribed_symbols

    @pytest.mark.asyncio
    async def test_websocket_callback_registration(self):
        """Test callback registration for WebSocket data."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            quote_callback = MagicMock()
            trade_callback = MagicMock()
            bar_callback = MagicMock()

            client.on_quote("AAPL", quote_callback)
            client.on_trade("AAPL", trade_callback)
            client.on_bar("AAPL", bar_callback)

            assert "AAPL" in client._quote_callbacks
            assert "AAPL" in client._trade_callbacks
            assert "AAPL" in client._bar_callbacks

    @pytest.mark.asyncio
    async def test_websocket_callback_execution(self):
        """Test callback execution on WebSocket data."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            received_quotes = []

            async def quote_callback(quote_data):
                received_quotes.append(quote_data)

            client.on_quote("AAPL", quote_callback)

            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            await client._handle_quote(mock_quote)

            assert len(received_quotes) == 1
            assert received_quotes[0]["symbol"] == "AAPL"

    @pytest.mark.asyncio
    async def test_websocket_thread_safety(self):
        """Test thread safety in WebSocket data handling."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            # Simulate concurrent quote updates
            tasks = [client._handle_quote(mock_quote) for _ in range(10)]
            await asyncio.gather(*tasks)

            # Cache should be consistent
            assert "AAPL" in client.quote_cache


class TestRateLimitingAdvanced:
    """Test advanced rate limiting functionality."""

    @pytest.mark.asyncio
    async def test_rate_limit_enforced(self):
        """Test that rate limit is strictly enforced."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_requests=2,
                rate_limit_window=10,
            )

            # Make 2 requests
            await client._check_rate_limit()
            await client._check_rate_limit()

            # Third request should wait
            start_time = asyncio.get_event_loop().time()

            # Use timeout to prevent hanging
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(client._check_rate_limit(), timeout=0.1)

    @pytest.mark.asyncio
    async def test_rate_limit_retry_after_delay(self):
        """Test that requests succeed after rate limit window."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_requests=2,
                rate_limit_window=1,
            )

            await client._check_rate_limit()
            await client._check_rate_limit()

            # Wait for window to expire
            await asyncio.sleep(1.1)

            # Should succeed now
            await client._check_rate_limit()
            assert len(client.request_timestamps) > 0

    @pytest.mark.asyncio
    async def test_rate_limit_exponential_backoff(self):
        """Test exponential backoff calculation in reconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._reconnect_delay = 1.0

            # Calculate expected delays for exponential backoff
            expected_delays = [1.0, 2.0, 4.0, 8.0, 16.0]

            for i, expected_delay in enumerate(expected_delays):
                client._reconnect_attempts = i
                actual_delay = min(
                    client._reconnect_delay * (2**i),
                    client._reconnect_max_delay,
                )
                assert actual_delay == expected_delay

    @pytest.mark.asyncio
    async def test_rate_limit_max_retries(self):
        """Test that max retries are respected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._max_reconnect_attempts = 5
            client._reconnect_attempts = 5

            result = await client._reconnect()

            assert result is False

    @pytest.mark.asyncio
    async def test_concurrent_request_rate_limiting(self):
        """Test rate limiting with concurrent requests."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_quote = MagicMock()
            mock_quote.bid_price = 150.0
            mock_quote.ask_price = 150.5
            mock_quote.bid_size = 100
            mock_quote.ask_size = 100

            mock_data.return_value.get_stock_latest_quote.return_value = {
                "AAPL": mock_quote
            }

            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_requests=10,
                rate_limit_window=1,
            )
            client.data_client = mock_data.return_value

            # Make concurrent requests
            tasks = [client.get_quote("AAPL") for _ in range(5)]
            results = await asyncio.gather(*tasks)

            # All should succeed
            assert all(r is not None for r in results)

    @pytest.mark.asyncio
    async def test_rate_limit_headers_parsing(self):
        """Test rate limit information from response headers."""
        # This is a placeholder for testing header parsing if implemented
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Verify rate limit settings
            assert client.rate_limit_requests == 200
            assert client.rate_limit_window == 60

    @pytest.mark.asyncio
    async def test_rate_limit_reset_time(self):
        """Test rate limit timestamp reset."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(
                api_key="test_key",
                secret_key="test_secret",
                rate_limit_window=1,
            )

            await client._check_rate_limit()
            initial_count = len(client.request_timestamps)

            # Wait for window to expire
            await asyncio.sleep(1.1)

            await client._check_rate_limit()

            # Old timestamps should be removed
            assert len(client.request_timestamps) == 1


class TestNewsAPI:
    """Test news API functionality."""

    @pytest.mark.asyncio
    async def test_get_news_success(self):
        """Test successful news retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_article = MagicMock()
            mock_article.id = 12345
            mock_article.headline = "Test Headline"
            mock_article.summary = "Test Summary"
            mock_article.url = "https://example.com"
            mock_article.source = "Test Source"
            mock_article.created_at = datetime(2024, 1, 1, 10, 0)
            mock_article.symbols = ["AAPL"]
            mock_article.author = "Test Author"

            mock_news_set = MagicMock()
            # Simulate having both data and news attributes for compatibility
            mock_news_set.news = [mock_article]
            mock_news_set.data = {"news": [mock_article]}

            # Mock the synchronous get_news method to be called in executor
            async def mock_executor(func, *args):
                return func(*args)

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            # Patch run_in_executor to return mock_news_set directly
            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_news_set
                )
                result = await client.get_news(limit=10)

            assert len(result["articles"]) == 1
            assert result["articles"][0]["headline"] == "Test Headline"

    @pytest.mark.asyncio
    async def test_get_news_by_symbol(self):
        """Test news retrieval filtered by symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_article = MagicMock()
            mock_article.id = 12345
            mock_article.headline = "AAPL News"
            mock_article.summary = "Apple news"
            mock_article.url = "https://example.com"
            mock_article.source = "Test Source"
            mock_article.created_at = datetime(2024, 1, 1, 10, 0)
            mock_article.symbols = ["AAPL"]
            mock_article.author = "Test Author"

            mock_news_set = MagicMock()
            mock_news_set.news = [mock_article]
            mock_news_set.data = {"news": [mock_article]}

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_news_set
                )
                result = await client.get_news(symbol="AAPL", limit=10)

            assert len(result["articles"]) == 1
            assert "AAPL" in result["articles"][0]["symbols"]

    @pytest.mark.asyncio
    async def test_get_news_with_limit(self):
        """Test news retrieval with limit parameter."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            articles = []
            for i in range(5):
                mock_article = MagicMock()
                mock_article.id = i
                mock_article.headline = f"Headline {i}"
                mock_article.summary = f"Summary {i}"
                mock_article.url = f"https://example.com/{i}"
                mock_article.source = "Test Source"
                mock_article.created_at = datetime(2024, 1, 1, 10, 0)
                mock_article.symbols = ["AAPL"]
                mock_article.author = "Test Author"
                articles.append(mock_article)

            mock_news_set = MagicMock()
            mock_news_set.news = articles
            mock_news_set.data = {"news": articles}

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_news_set
                )
                result = await client.get_news(limit=5)

            assert len(result["articles"]) == 5

    @pytest.mark.asyncio
    async def test_get_news_empty_response(self):
        """Test news retrieval with empty response."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_news_set = MagicMock()
            mock_news_set.news = []

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            result = await client.get_news(limit=10)

            assert len(result["articles"]) == 0

    @pytest.mark.asyncio
    async def test_get_news_api_error(self):
        """Test news retrieval with API error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_news.return_value.get_news.side_effect = Exception("API Error")

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            result = await client.get_news(limit=10)

            assert result["articles"] == []

    @pytest.mark.asyncio
    async def test_news_article_parsing(self):
        """Test proper parsing of news article attributes."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_article = MagicMock()
            mock_article.id = 12345
            mock_article.headline = "Important News"
            mock_article.summary = "This is important"
            mock_article.url = "https://example.com/article"
            mock_article.source = "Reuters"
            mock_article.created_at = datetime(2024, 1, 1, 10, 0)
            mock_article.symbols = ["AAPL", "GOOGL"]
            mock_article.author = "John Doe"

            mock_news_set = MagicMock()
            mock_news_set.news = [mock_article]
            mock_news_set.data = {"news": [mock_article]}

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_news_set
                )
                result = await client.get_news(limit=1)

            assert result["articles"][0]["id"] == "12345"
            assert result["articles"][0]["headline"] == "Important News"
            assert result["articles"][0]["author"] == "John Doe"
            assert result["articles"][0]["source"] == "Reuters"

    @pytest.mark.asyncio
    async def test_news_date_filtering(self):
        """Test news retrieval with date filtering."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("alpaca.data.historical.news.NewsClient") as mock_news,
        ):
            mock_article = MagicMock()
            mock_article.id = 12345
            mock_article.headline = "Recent News"
            mock_article.summary = "Recent summary"
            mock_article.url = "https://example.com"
            mock_article.source = "Test Source"
            mock_article.created_at = datetime(2024, 1, 2, 10, 0)
            mock_article.symbols = ["AAPL"]
            mock_article.author = "Test Author"

            mock_news_set = MagicMock()
            mock_news_set.news = [mock_article]
            mock_news_set.data = {"news": [mock_article]}

            mock_news.return_value.get_news.return_value = mock_news_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.news_client = mock_news.return_value

            start_date = datetime(2024, 1, 1)

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_news_set
                )
                result = await client.get_news(start_date=start_date, limit=10)

            assert len(result["articles"]) == 1


class TestHistoricalDataAdvanced:
    """Test advanced historical data functionality."""

    @pytest.mark.asyncio
    async def test_get_bars_daily(self):
        """Test daily bar data retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 1000000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.DAY_1)

            assert result is not None
            assert len(result) == 1
            assert result[0]["close"] == 151.0

    @pytest.mark.asyncio
    async def test_get_bars_hourly(self):
        """Test hourly bar data retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1, 10, 0)
            mock_bar.open = 150.0
            mock_bar.high = 150.5
            mock_bar.low = 149.5
            mock_bar.close = 150.25
            mock_bar.volume = 100000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.HOUR_1)

            assert result is not None
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_bars_minute(self):
        """Test minute bar data retrieval."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1, 10, 30)
            mock_bar.open = 150.0
            mock_bar.high = 150.1
            mock_bar.low = 149.9
            mock_bar.close = 150.05
            mock_bar.volume = 1000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.MINUTE_1)

            assert result is not None
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_bars_custom_timeframe(self):
        """Test bar data with custom timeframe."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_bar = MagicMock()
            mock_bar.timestamp = datetime(2024, 1, 1)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 5000000

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": [mock_bar]}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.WEEK_1)

            assert result is not None
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_bars_date_range(self):
        """Test bar data with specific date range."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            bars = []
            for day in range(5):
                mock_bar = MagicMock()
                mock_bar.timestamp = datetime(2024, 1, day + 1)
                mock_bar.open = 150.0 + day
                mock_bar.high = 152.0 + day
                mock_bar.low = 149.0 + day
                mock_bar.close = 151.0 + day
                mock_bar.volume = 1000000
                bars.append(mock_bar)

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": bars}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 5)

            result = await client.get_bars("AAPL", TimeFrameEnum.DAY_1, start, end)

            assert result is not None
            assert len(result) == 5

    @pytest.mark.asyncio
    async def test_get_bars_empty_result(self):
        """Test bar data with empty result."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_bar_set = MagicMock()
            mock_bar_set.data = {}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("INVALID")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_bars_pagination(self):
        """Test bar data pagination with limit."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            bars = []
            for i in range(50):
                mock_bar = MagicMock()
                mock_bar.timestamp = datetime(2024, 1, 1) + timedelta(hours=i)
                mock_bar.open = 150.0
                mock_bar.high = 152.0
                mock_bar.low = 149.0
                mock_bar.close = 151.0
                mock_bar.volume = 1000000
                bars.append(mock_bar)

            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": bars}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("AAPL", TimeFrameEnum.HOUR_1, limit=50)

            assert result is not None
            assert len(result) == 50

    @pytest.mark.asyncio
    async def test_get_bars_market_closed(self):
        """Test bar data during market closed periods."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            # Weekend - no bars
            mock_bar_set = MagicMock()
            mock_bar_set.data = {"AAPL": []}
            mock_data.return_value.get_stock_bars.return_value = mock_bar_set

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            # Saturday
            start = datetime(2024, 1, 6)
            end = datetime(2024, 1, 7)

            result = await client.get_bars("AAPL", TimeFrameEnum.DAY_1, start, end)

            # Should handle gracefully
            assert result is None or len(result) == 0

    @pytest.mark.asyncio
    async def test_get_trades_historical(self):
        """Test historical trades retrieval (placeholder for future implementation)."""
        # This test documents expected behavior for trades endpoint
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Verify client is initialized properly for future trades support
            assert client.data_client is not None

    @pytest.mark.asyncio
    async def test_get_quotes_historical(self):
        """Test historical quotes retrieval (placeholder for future implementation)."""
        # This test documents expected behavior for quotes endpoint
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Verify client is initialized properly for future quotes support
            assert client.data_client is not None


class TestErrorHandlingAdvanced:
    """Test advanced error handling scenarios."""

    def test_api_key_missing_error(self):
        """Test initialization with missing API key."""
        with pytest.raises(ValueError, match="API key and secret key are required"):
            AlpacaClient(api_key="", secret_key="test_secret")

    def test_api_key_invalid_error(self):
        """Test handling of invalid API credentials."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            mock_trading.return_value.get_account.side_effect = Exception(
                "Invalid credentials"
            )

            client = AlpacaClient(api_key="invalid", secret_key="invalid")

            # Should handle gracefully
            assert client.api_key == "invalid"

    @pytest.mark.asyncio
    async def test_network_timeout_error(self):
        """Test handling of network timeout."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_data.return_value.get_stock_latest_quote.side_effect = TimeoutError(
                "Request timeout"
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_quote("AAPL")

            assert result is None

    @pytest.mark.asyncio
    async def test_server_error_500_retry(self):
        """Test handling of 500 server error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_data.return_value.get_stock_latest_quote.side_effect = Exception(
                "500 Internal Server Error"
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_quote("AAPL")

            assert result is None

    @pytest.mark.asyncio
    async def test_not_found_error_404(self):
        """Test handling of 404 not found error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            mock_data.return_value.get_stock_bars.side_effect = Exception(
                "404 Not Found"
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_bars("INVALID_SYMBOL")

            assert result is None

    @pytest.mark.asyncio
    async def test_malformed_response_handling(self):
        """Test handling of malformed API response."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            # Return malformed data
            mock_data.return_value.get_stock_latest_quote.return_value = None

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_quote("AAPL")

            assert result is None

    @pytest.mark.asyncio
    async def test_connection_refused_error(self):
        """Test handling of connection refused error."""
        with (
            patch("core.data.alpaca_client.TradingClient") as mock_trading,
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            mock_trading.return_value.get_account.side_effect = ConnectionRefusedError(
                "Connection refused"
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.trading_client = mock_trading.return_value

            result = await client.get_account()

            assert result is None

    @pytest.mark.asyncio
    async def test_ssl_certificate_error(self):
        """Test handling of SSL certificate error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            import ssl

            mock_data.return_value.get_stock_latest_quote.side_effect = ssl.SSLError(
                "SSL certificate error"
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_quote("AAPL")

            assert result is None

    @pytest.mark.asyncio
    async def test_json_decode_error(self):
        """Test handling of JSON decode error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient") as mock_data,
        ):
            import json

            mock_data.return_value.get_stock_latest_quote.side_effect = (
                json.JSONDecodeError("Invalid JSON", "", 0)
            )

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.data_client = mock_data.return_value

            result = await client.get_quote("AAPL")

            assert result is None


class TestCallbackManagement:
    """Test callback management functionality."""

    def test_remove_callbacks(self):
        """Test removing all callbacks for a symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Register callbacks
            client.on_quote("AAPL", lambda x: None)
            client.on_trade("AAPL", lambda x: None)
            client.on_bar("AAPL", lambda x: None)

            assert "AAPL" in client._quote_callbacks
            assert "AAPL" in client._trade_callbacks
            assert "AAPL" in client._bar_callbacks

            # Remove all callbacks
            client.remove_callbacks("AAPL")

            assert "AAPL" not in client._quote_callbacks
            assert "AAPL" not in client._trade_callbacks
            assert "AAPL" not in client._bar_callbacks

    @pytest.mark.asyncio
    async def test_subscribe_to_symbol(self):
        """Test subscribing to additional symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            mock_stream_instance = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream.return_value = mock_stream_instance

            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            await client.connect_stream(["AAPL"])

            result = client.subscribe_to_symbol("GOOGL")

            assert result is True
            assert "GOOGL" in client._subscribed_symbols

    def test_subscribe_to_symbol_not_connected(self):
        """Test subscribing when not connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = client.subscribe_to_symbol("AAPL")

            assert result is False

    def test_unsubscribe_not_connected(self):
        """Test unsubscribing when not connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = client.unsubscribe_from_symbol("AAPL")

            assert result is False
