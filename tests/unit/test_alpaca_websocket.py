"""
Unit tests for AlpacaClient WebSocket functionality

Tests real-time streaming features including:
- Connection and disconnection
- Quote, trade, and bar handlers
- Callback registration and execution
- Reconnection logic with exponential backoff
- Symbol subscription/unsubscription
- Thread safety with concurrent updates
- Heartbeat monitoring
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.data.alpaca_client import AlpacaClient


class TestWebSocketConnection:
    """Test WebSocket connection and disconnection."""

    @pytest.mark.asyncio
    async def test_connect_stream_success(self):
        """Test successful WebSocket connection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream methods
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            result = await client.connect_stream(["AAPL", "GOOGL"])

            assert result is True
            assert client.is_connected is True
            assert "AAPL" in client._subscribed_symbols
            assert "GOOGL" in client._subscribed_symbols
            assert client._stream_task is not None
            assert client._heartbeat_task is not None

    @pytest.mark.asyncio
    async def test_connect_stream_already_connected(self):
        """Test connection attempt when already connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client.is_connected = True

            result = await client.connect_stream(["AAPL"])

            assert result is False

    @pytest.mark.asyncio
    async def test_connect_stream_error(self):
        """Test connection with error."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            mock_stream.side_effect = Exception("Connection error")

            result = await client.connect_stream(["AAPL"])

            assert result is False
            assert client.is_connected is False

    @pytest.mark.asyncio
    async def test_disconnect_stream_success(self):
        """Test successful disconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            # Connect first
            await client.connect_stream(["AAPL"])

            # Then disconnect
            result = await client.disconnect_stream()

            assert result is True
            assert client.is_connected is False
            assert client.data_stream is None
            assert client._stream_task is None
            assert client._heartbeat_task is None

    @pytest.mark.asyncio
    async def test_disconnect_stream_not_connected(self):
        """Test disconnection when not connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = await client.disconnect_stream()

            assert result is False


class TestDataHandlers:
    """Test quote, trade, and bar data handlers."""

    @pytest.mark.asyncio
    async def test_handle_quote(self):
        """Test quote handler updates cache and triggers callbacks."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote
            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            # Register callback
            callback_called = False
            received_data = None

            def callback(data):
                nonlocal callback_called, received_data
                callback_called = True
                received_data = data

            client.on_quote("AAPL", callback)

            # Handle quote
            await client._handle_quote(mock_quote)

            # Check cache updated
            assert "AAPL" in client.quote_cache
            cached_data, _ = client.quote_cache["AAPL"]
            assert cached_data["bid"] == 150.25
            assert cached_data["ask"] == 150.35

            # Check callback triggered
            assert callback_called is True
            assert received_data["symbol"] == "AAPL"
            assert received_data["bid"] == 150.25

    @pytest.mark.asyncio
    async def test_handle_trade(self):
        """Test trade handler triggers callbacks."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock trade
            mock_trade = MagicMock()
            mock_trade.symbol = "AAPL"
            mock_trade.price = 150.30
            mock_trade.size = 100
            mock_trade.timestamp = datetime(2024, 1, 1, 10, 0)

            # Register callback
            callback_called = False
            received_data = None

            def callback(data):
                nonlocal callback_called, received_data
                callback_called = True
                received_data = data

            client.on_trade("AAPL", callback)

            # Handle trade
            await client._handle_trade(mock_trade)

            # Check callback triggered
            assert callback_called is True
            assert received_data["symbol"] == "AAPL"
            assert received_data["price"] == 150.30
            assert received_data["size"] == 100

    @pytest.mark.asyncio
    async def test_handle_bar(self):
        """Test bar handler triggers callbacks."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock bar
            mock_bar = MagicMock()
            mock_bar.symbol = "AAPL"
            mock_bar.timestamp = datetime(2024, 1, 1, 10, 0)
            mock_bar.open = 150.0
            mock_bar.high = 152.0
            mock_bar.low = 149.0
            mock_bar.close = 151.0
            mock_bar.volume = 1000000

            # Register callback
            callback_called = False
            received_data = None

            def callback(data):
                nonlocal callback_called, received_data
                callback_called = True
                received_data = data

            client.on_bar("AAPL", callback)

            # Handle bar
            await client._handle_bar(mock_bar)

            # Check callback triggered
            assert callback_called is True
            assert received_data["symbol"] == "AAPL"
            assert received_data["open"] == 150.0
            assert received_data["close"] == 151.0
            assert received_data["volume"] == 1000000

    @pytest.mark.asyncio
    async def test_async_callback(self):
        """Test async callbacks are awaited properly."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote
            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            # Register async callback
            callback_called = False

            async def async_callback(data):
                nonlocal callback_called
                await asyncio.sleep(0.01)
                callback_called = True

            client.on_quote("AAPL", async_callback)

            # Handle quote
            await client._handle_quote(mock_quote)

            # Check async callback was awaited
            assert callback_called is True

    @pytest.mark.asyncio
    async def test_callback_error_handling(self):
        """Test that errors in callbacks don't crash the handler."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock quote
            mock_quote = MagicMock()
            mock_quote.symbol = "AAPL"
            mock_quote.bid_price = 150.25
            mock_quote.ask_price = 150.35
            mock_quote.bid_size = 100
            mock_quote.ask_size = 200

            # Register callbacks - one that errors, one that works
            error_callback_called = False
            working_callback_called = False

            def error_callback(data):
                nonlocal error_callback_called
                error_callback_called = True
                raise Exception("Callback error")

            def working_callback(data):
                nonlocal working_callback_called
                working_callback_called = True

            client.on_quote("AAPL", error_callback)
            client.on_quote("AAPL", working_callback)

            # Handle quote - should not crash
            await client._handle_quote(mock_quote)

            # Both callbacks should have been called
            assert error_callback_called is True
            assert working_callback_called is True


class TestCallbacks:
    """Test callback registration and management."""

    def test_register_quote_callback(self):
        """Test registering quote callback."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            def callback(data):
                pass

            client.on_quote("AAPL", callback)

            assert "AAPL" in client._quote_callbacks
            assert callback in client._quote_callbacks["AAPL"]

    def test_register_trade_callback(self):
        """Test registering trade callback."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            def callback(data):
                pass

            client.on_trade("AAPL", callback)

            assert "AAPL" in client._trade_callbacks
            assert callback in client._trade_callbacks["AAPL"]

    def test_register_bar_callback(self):
        """Test registering bar callback."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            def callback(data):
                pass

            client.on_bar("AAPL", callback)

            assert "AAPL" in client._bar_callbacks
            assert callback in client._bar_callbacks["AAPL"]

    def test_register_multiple_callbacks(self):
        """Test registering multiple callbacks for same symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            def callback1(data):
                pass

            def callback2(data):
                pass

            client.on_quote("AAPL", callback1)
            client.on_quote("AAPL", callback2)

            assert len(client._quote_callbacks["AAPL"]) == 2

    def test_remove_callbacks(self):
        """Test removing all callbacks for a symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            def callback(data):
                pass

            client.on_quote("AAPL", callback)
            client.on_trade("AAPL", callback)
            client.on_bar("AAPL", callback)

            client.remove_callbacks("AAPL")

            assert "AAPL" not in client._quote_callbacks
            assert "AAPL" not in client._trade_callbacks
            assert "AAPL" not in client._bar_callbacks


class TestSymbolSubscription:
    """Test symbol subscription and unsubscription."""

    def test_subscribe_to_symbol_success(self):
        """Test subscribing to additional symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock connected stream
            client.is_connected = True
            client.data_stream = MagicMock()
            client.data_stream.subscribe_quotes = MagicMock()
            client.data_stream.subscribe_trades = MagicMock()
            client.data_stream.subscribe_bars = MagicMock()

            result = client.subscribe_to_symbol("MSFT")

            assert result is True
            assert "MSFT" in client._subscribed_symbols
            client.data_stream.subscribe_quotes.assert_called_once()
            client.data_stream.subscribe_trades.assert_called_once()
            client.data_stream.subscribe_bars.assert_called_once()

    def test_subscribe_when_not_connected(self):
        """Test subscription fails when not connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = client.subscribe_to_symbol("MSFT")

            assert result is False

    def test_unsubscribe_from_symbol_success(self):
        """Test unsubscribing from symbol."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock connected stream
            client.is_connected = True
            client.data_stream = MagicMock()
            client.data_stream.unsubscribe_quotes = MagicMock()
            client.data_stream.unsubscribe_trades = MagicMock()
            client.data_stream.unsubscribe_bars = MagicMock()
            client._subscribed_symbols.add("AAPL")

            result = client.unsubscribe_from_symbol("AAPL")

            assert result is True
            assert "AAPL" not in client._subscribed_symbols
            client.data_stream.unsubscribe_quotes.assert_called_once()
            client.data_stream.unsubscribe_trades.assert_called_once()
            client.data_stream.unsubscribe_bars.assert_called_once()

    def test_unsubscribe_when_not_connected(self):
        """Test unsubscription fails when not connected."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            result = client.unsubscribe_from_symbol("AAPL")

            assert result is False


class TestReconnection:
    """Test reconnection logic and exponential backoff."""

    @pytest.mark.asyncio
    async def test_reconnect_success(self):
        """Test successful reconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            # Set up subscribed symbols
            client._subscribed_symbols.add("AAPL")
            client.data_stream = mock_stream_instance

            # Attempt reconnection
            result = await client._reconnect()

            assert result is True
            assert client._reconnect_attempts == 0

    @pytest.mark.asyncio
    async def test_reconnect_exponential_backoff(self):
        """Test exponential backoff in reconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
            patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._subscribed_symbols.add("AAPL")

            # First attempt
            await client._reconnect()
            # Should delay 1s (1.0 * 2^0)
            assert mock_sleep.call_args_list[0][0][0] == 1.0

            # Second attempt
            await client._reconnect()
            # Should delay 2s (1.0 * 2^1)
            assert mock_sleep.call_args_list[1][0][0] == 2.0

            # Third attempt
            await client._reconnect()
            # Should delay 4s (1.0 * 2^2)
            assert mock_sleep.call_args_list[2][0][0] == 4.0

    @pytest.mark.asyncio
    async def test_reconnect_max_attempts(self):
        """Test max reconnection attempts."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._max_reconnect_attempts = 3

            # Mock failed reconnections
            mock_stream.side_effect = Exception("Connection failed")

            # Attempt reconnections until max reached
            for _ in range(4):
                await client._reconnect()

            # Should stop after max attempts
            assert client._reconnect_attempts >= client._max_reconnect_attempts

            # Further attempts should return False immediately
            result = await client._reconnect()
            assert result is False

    @pytest.mark.asyncio
    async def test_reconnect_max_delay(self):
        """Test reconnection delay doesn't exceed maximum."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream"),
            patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")
            client._reconnect_max_delay = 10.0
            client._subscribed_symbols.add("AAPL")

            # Attempt many reconnections
            for _ in range(10):
                await client._reconnect()

            # Check that no delay exceeds max
            for call_args in mock_sleep.call_args_list:
                delay = call_args[0][0]
                assert delay <= client._reconnect_max_delay


class TestThreadSafety:
    """Test thread safety with concurrent operations."""

    @pytest.mark.asyncio
    async def test_concurrent_cache_updates(self):
        """Test concurrent quote cache updates are thread-safe."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Create multiple mock quotes
            async def handle_quote(symbol, price):
                mock_quote = MagicMock()
                mock_quote.symbol = symbol
                mock_quote.bid_price = price
                mock_quote.ask_price = price + 0.1
                mock_quote.bid_size = 100
                mock_quote.ask_size = 200
                await client._handle_quote(mock_quote)

            # Handle multiple quotes concurrently
            tasks = [
                handle_quote("AAPL", 150.0),
                handle_quote("GOOGL", 2800.0),
                handle_quote("MSFT", 380.0),
                handle_quote("AAPL", 151.0),
                handle_quote("GOOGL", 2801.0),
            ]

            await asyncio.gather(*tasks)

            # Cache should have all symbols
            assert "AAPL" in client.quote_cache
            assert "GOOGL" in client.quote_cache
            assert "MSFT" in client.quote_cache

    @pytest.mark.asyncio
    async def test_concurrent_connect_disconnect(self):
        """Test concurrent connect/disconnect operations."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            # Try concurrent connects
            results = await asyncio.gather(
                client.connect_stream(["AAPL"]),
                client.connect_stream(["GOOGL"]),
                return_exceptions=True,
            )

            # Only one should succeed
            assert sum(1 for r in results if r is True) == 1


class TestHeartbeat:
    """Test heartbeat monitoring."""

    @pytest.mark.asyncio
    async def test_heartbeat_monitor_starts(self):
        """Test heartbeat monitor starts with connection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            await client.connect_stream(["AAPL"])

            assert client._heartbeat_task is not None
            assert not client._heartbeat_task.done()

    @pytest.mark.asyncio
    async def test_heartbeat_monitor_stops(self):
        """Test heartbeat monitor stops on disconnection."""
        with (
            patch("core.data.alpaca_client.TradingClient"),
            patch("core.data.alpaca_client.StockHistoricalDataClient"),
            patch("core.data.alpaca_client.StockDataStream") as mock_stream,
        ):
            client = AlpacaClient(api_key="test_key", secret_key="test_secret")

            # Mock stream
            mock_stream_instance = MagicMock()
            mock_stream_instance.subscribe_quotes = MagicMock()
            mock_stream_instance.subscribe_trades = MagicMock()
            mock_stream_instance.subscribe_bars = MagicMock()
            mock_stream_instance.run = AsyncMock()
            mock_stream_instance.close = AsyncMock()
            mock_stream.return_value = mock_stream_instance

            await client.connect_stream(["AAPL"])
            await client.disconnect_stream()

            assert client._heartbeat_task is None
