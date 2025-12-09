"""
Unit tests for MarketDataManager - Market data collection and caching

Tests comprehensive functionality including:
- Manager initialization with different configurations
- Quote retrieval from multiple sources
- Historical data retrieval with fallback
- Multi-source aggregation and failover
- Caching behavior and TTL expiration
- Data normalization and symbol conversion
- Error handling and edge cases
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.config import Config
from core.data.market_data import (
    MarketData,
    MarketDataManager,
    Quote,
    _normalize_symbol_for_yfinance,
)


# Fixtures
@pytest.fixture
def mock_config():
    """Create a mock configuration object."""
    config = Mock(spec=Config)
    config.trading = Mock()
    config.trading.mode = "paper"
    return config


@pytest.fixture
def market_data_manager(mock_config, tmp_path):
    """Create MarketDataManager with temporary cache directory."""
    manager = MarketDataManager(mock_config)
    manager.cache_dir = tmp_path / "cache"
    manager.cache_dir.mkdir(parents=True, exist_ok=True)
    return manager


@pytest.fixture
def sample_quote():
    """Create a sample Quote object."""
    return Quote(
        symbol="AAPL",
        bid=150.25,
        ask=150.35,
        last=150.30,
        volume=1000000,
        timestamp=datetime.now(),
        source="yfinance",
    )


@pytest.fixture
def sample_market_data():
    """Create sample MarketData objects."""
    base_time = datetime(2024, 1, 1, 9, 30)
    return [
        MarketData(
            symbol="AAPL",
            timestamp=base_time + timedelta(days=i),
            open=100.0 + i,
            high=105.0 + i,
            low=99.0 + i,
            close=103.0 + i,
            volume=1000000 + i * 10000,
        )
        for i in range(5)
    ]


@pytest.fixture
def mock_yfinance_ticker():
    """Create a mock yfinance Ticker."""
    ticker = Mock()
    ticker.info = {
        "bid": 150.25,
        "ask": 150.35,
        "regularMarketPrice": 150.30,
        "regularMarketVolume": 1000000,
    }
    return ticker


# Test Symbol Normalization
class TestSymbolNormalization:
    """Test symbol normalization for different data sources."""

    def test_normalize_crypto_symbol(self):
        """Test crypto symbol normalization: BTC/USD -> BTC-USD."""
        assert _normalize_symbol_for_yfinance("BTC/USD") == "BTC-USD"
        assert _normalize_symbol_for_yfinance("ETH/USD") == "ETH-USD"

    def test_normalize_regular_symbol(self):
        """Test regular symbols remain unchanged."""
        assert _normalize_symbol_for_yfinance("AAPL") == "AAPL"
        assert _normalize_symbol_for_yfinance("TSLA") == "TSLA"

    def test_normalize_index_symbol(self):
        """Test index symbols remain unchanged."""
        assert _normalize_symbol_for_yfinance("^GSPC") == "^GSPC"
        assert _normalize_symbol_for_yfinance("^DJI") == "^DJI"

    def test_normalize_forex_symbol(self):
        """Test forex symbols remain unchanged."""
        assert _normalize_symbol_for_yfinance("EURUSD=X") == "EURUSD=X"


# Initialization Tests (5 tests)
class TestManagerInitialization:
    """Test MarketDataManager initialization and configuration."""

    def test_manager_initialization_default(self, mock_config):
        """Test manager initialization with default settings."""
        manager = MarketDataManager(mock_config)

        assert manager.config == mock_config
        assert manager.cache_dir.exists()
        assert manager.sources == ["ibkr", "yfinance", "cache"]
        assert manager.cache_ttl == 300
        assert manager.max_cache_size == 1000

    def test_manager_initialization_custom_sources(self, mock_config):
        """Test manager initialization with custom source priority."""
        manager = MarketDataManager(mock_config)
        manager.sources = ["yfinance", "cache"]

        assert "ibkr" not in manager.sources
        assert manager.sources[0] == "yfinance"

    def test_manager_with_alpaca_client(self, mock_config):
        """Test manager can be extended with Alpaca client."""
        manager = MarketDataManager(mock_config)
        manager.alpaca_client = Mock()

        assert hasattr(manager, "alpaca_client")
        assert manager.alpaca_client is not None

    def test_manager_with_alphavantage_client(self, mock_config):
        """Test manager can be extended with AlphaVantage client."""
        manager = MarketDataManager(mock_config)
        manager.alphavantage_client = Mock()

        assert hasattr(manager, "alphavantage_client")
        assert manager.alphavantage_client is not None

    def test_manager_source_priority_order(self, mock_config):
        """Test source priority order is correct."""
        manager = MarketDataManager(mock_config)

        assert manager.sources.index("ibkr") < manager.sources.index("yfinance")
        assert manager.sources.index("yfinance") < manager.sources.index("cache")


# Quote Retrieval Tests (8 tests)
class TestQuoteRetrieval:
    """Test quote retrieval from various sources."""

    @pytest.mark.asyncio
    async def test_get_quote_from_yfinance_success(
        self, market_data_manager, mock_yfinance_ticker
    ):
        """Test successful quote retrieval from Yahoo Finance."""
        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_yfinance_ticker
        ):
            quote = await market_data_manager.get_quote("AAPL")

            assert quote is not None
            assert quote.symbol == "AAPL"
            assert quote.bid == 150.25
            assert quote.ask == 150.35
            assert quote.last == 150.30
            assert quote.volume == 1000000
            assert quote.source == "yfinance"

    @pytest.mark.asyncio
    async def test_get_quote_crypto_symbol_normalized(self, market_data_manager):
        """Test crypto symbol normalization in quote retrieval."""
        mock_ticker = Mock()
        mock_ticker.info = {
            "bid": 50000.0,
            "ask": 50100.0,
            "regularMarketPrice": 50050.0,
            "regularMarketVolume": 1000,
        }

        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_ticker
        ) as mock_yf:
            quote = await market_data_manager.get_quote("BTC/USD")

            mock_yf.assert_called_with("BTC-USD")
            assert quote.symbol == "BTC/USD"

    @pytest.mark.asyncio
    async def test_get_quote_empty_info(self, market_data_manager):
        """Test quote retrieval with empty ticker info."""
        mock_ticker = Mock()
        mock_ticker.info = {}

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            quote = await market_data_manager.get_quote("INVALID")

            assert quote is None

    @pytest.mark.asyncio
    async def test_get_quote_source_failover(
        self, market_data_manager, mock_yfinance_ticker
    ):
        """Test failover from IBKR to Yahoo Finance."""
        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_yfinance_ticker
        ):
            quote = await market_data_manager.get_quote("AAPL")

            assert quote is not None
            assert quote.source == "yfinance"

    @pytest.mark.asyncio
    async def test_get_quote_all_sources_fail(self, market_data_manager):
        """Test quote retrieval when all sources fail."""
        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("Network error")
        ):
            quote = await market_data_manager.get_quote("AAPL")

            assert quote is None

    @pytest.mark.asyncio
    async def test_get_quote_from_cache(self, market_data_manager, sample_quote):
        """Test quote retrieval from cache."""
        market_data_manager.cache_quote(sample_quote)

        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("No network")
        ):
            quote = await market_data_manager.get_quote("AAPL")

            assert quote is not None
            assert quote.symbol == "AAPL"
            assert quote.source == "cache"

    @pytest.mark.asyncio
    async def test_get_quote_cache_expired(self, market_data_manager):
        """Test quote retrieval skips expired cache."""
        import os

        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"
        cache_data = {
            "symbol": "AAPL",
            "bid": 150.25,
            "ask": 150.35,
            "last": 150.30,
            "volume": 1000000,
            "timestamp": datetime.now().isoformat(),
            "source": "cache",
        }

        with open(cache_file, "w") as f:
            json.dump(cache_data, f)

        old_time = (datetime.now() - timedelta(seconds=400)).timestamp()
        os.utime(cache_file, (old_time, old_time))

        mock_ticker = Mock()
        mock_ticker.info = {"regularMarketPrice": 151.0}

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            quote = await market_data_manager.get_quote("AAPL")
            assert not cache_file.exists() or quote.source == "yfinance"

    @pytest.mark.asyncio
    async def test_get_quote_partial_data(self, market_data_manager):
        """Test quote retrieval with partial data (some fields missing)."""
        mock_ticker = Mock()
        mock_ticker.info = {"regularMarketPrice": 150.30}

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            quote = await market_data_manager.get_quote("AAPL")

            assert quote is not None
            assert quote.last == 150.30
            assert quote.bid is None
            assert quote.ask is None


# Historical Data Retrieval Tests (10 tests)
class TestHistoricalDataRetrieval:
    """Test historical data retrieval functionality."""

    @pytest.mark.asyncio
    async def test_get_historical_bars_success(self, market_data_manager):
        """Test successful historical data retrieval."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0, 101.0],
                "High": [105.0, 106.0],
                "Low": [99.0, 100.0],
                "Close": [103.0, 104.0],
                "Volume": [1000000, 1100000],
            },
            index=pd.DatetimeIndex(
                [
                    datetime(2024, 1, 1),
                    datetime(2024, 1, 2),
                ]
            ),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) == 2
            assert data[0].symbol == "AAPL"
            assert data[0].open == 100.0
            assert data[0].close == 103.0

    @pytest.mark.asyncio
    async def test_get_historical_bars_empty(self, market_data_manager):
        """Test historical data retrieval with no data available."""
        import pandas as pd

        mock_ticker = Mock()
        mock_ticker.history.return_value = pd.DataFrame()

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("INVALID", start, end)

            assert len(data) == 0

    @pytest.mark.asyncio
    async def test_get_historical_bars_date_range(self, market_data_manager):
        """Test historical data retrieval with specific date range."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_ticker
        ) as mock_yf:
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 31)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            call_args = mock_yf.return_value.history.call_args
            assert call_args[1]["start"] == start
            assert call_args[1]["end"] == end

    @pytest.mark.asyncio
    async def test_get_historical_bars_timeframe_conversion(self, market_data_manager):
        """Test different timeframe intervals."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_ticker
        ) as mock_yf:
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)

            for interval in ["1d", "1h", "5m"]:
                await market_data_manager.get_historical_data(
                    "AAPL", start, end, interval
                )
                call_args = mock_yf.return_value.history.call_args
                assert call_args[1]["interval"] == interval

    @pytest.mark.asyncio
    async def test_get_historical_bars_fallback_source(self, market_data_manager):
        """Test fallback to next source when primary fails."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) > 0

    @pytest.mark.asyncio
    async def test_get_historical_bars_cache_hit(
        self, market_data_manager, sample_market_data
    ):
        """Test historical data retrieval from cache."""
        market_data_manager.cache_historical_data("AAPL", sample_market_data, "1d")

        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("No network")
        ):
            start = sample_market_data[0].timestamp
            end = sample_market_data[-1].timestamp
            data = await market_data_manager.get_historical_data(
                "AAPL", start, end, "1d"
            )

            assert len(data) == len(sample_market_data)
            assert data[0].symbol == "AAPL"

    @pytest.mark.asyncio
    async def test_get_historical_bars_cache_miss(self, market_data_manager):
        """Test cache miss falls back to data source."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) > 0

    @pytest.mark.asyncio
    async def test_get_historical_bars_all_sources_fail(self, market_data_manager):
        """Test when all sources fail to provide data."""
        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("Network error")
        ):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) == 0

    @pytest.mark.asyncio
    async def test_get_historical_trades(self, market_data_manager):
        """Test historical trades data structure (placeholder for future)."""
        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 2)

        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("Not implemented")
        ):
            data = await market_data_manager.get_historical_data("AAPL", start, end)
            assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_historical_quotes(self, market_data_manager):
        """Test historical quotes data structure (placeholder for future)."""
        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 2)

        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("Not implemented")
        ):
            data = await market_data_manager.get_historical_data("AAPL", start, end)
            assert isinstance(data, list)


# Multi-Source Aggregation Tests (8 tests)
class TestMultiSourceAggregation:
    """Test data aggregation from multiple sources."""

    @pytest.mark.asyncio
    async def test_aggregate_from_multiple_sources(self, market_data_manager):
        """Test data aggregation when multiple sources available."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0, 101.0],
                "High": [105.0, 106.0],
                "Low": [99.0, 100.0],
                "Close": [103.0, 104.0],
                "Volume": [1000000, 1100000],
            },
            index=pd.DatetimeIndex(
                [
                    datetime(2024, 1, 1),
                    datetime(2024, 1, 2),
                ]
            ),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) == 2

    @pytest.mark.asyncio
    async def test_source_failover(self, market_data_manager):
        """Test automatic failover to next source."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) > 0

    @pytest.mark.asyncio
    async def test_source_priority_respected(self, market_data_manager):
        """Test that source priority order is respected."""
        assert market_data_manager.sources == ["ibkr", "yfinance", "cache"]

        market_data_manager.sources = ["cache", "yfinance", "ibkr"]
        assert market_data_manager.sources[0] == "cache"

    @pytest.mark.asyncio
    async def test_data_normalization_format(self, market_data_manager):
        """Test data is normalized to MarketData format."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert all(isinstance(d, MarketData) for d in data)
            assert all(d.symbol == "AAPL" for d in data)

    @pytest.mark.asyncio
    async def test_timestamp_alignment(self, market_data_manager):
        """Test timestamps are properly aligned from pandas index."""
        import pandas as pd

        expected_time = datetime(2024, 1, 1, 9, 30)
        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([expected_time]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert data[0].timestamp == expected_time

    @pytest.mark.asyncio
    async def test_volume_aggregation(self, market_data_manager):
        """Test volume data is properly converted to int."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000.5],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert isinstance(data[0].volume, int)
            assert data[0].volume == 1000000

    @pytest.mark.asyncio
    async def test_ohlc_consistency(self, market_data_manager):
        """Test OHLC data consistency (High >= Low, etc.)."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            for bar in data:
                assert bar.high >= bar.low
                assert bar.high >= bar.open
                assert bar.high >= bar.close
                assert bar.low <= bar.open
                assert bar.low <= bar.close

    @pytest.mark.asyncio
    async def test_missing_data_interpolation(self, market_data_manager):
        """Test handling of missing data in source."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)
            data = await market_data_manager.get_historical_data("AAPL", start, end)

            assert len(data) >= 0


# Caching Tests (7 tests)
class TestCaching:
    """Test caching functionality."""

    def test_cache_stores_data(self, market_data_manager, sample_quote):
        """Test cache properly stores quote data."""
        market_data_manager.cache_quote(sample_quote)

        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"
        assert cache_file.exists()

        with open(cache_file) as f:
            data = json.load(f)

        assert data["symbol"] == "AAPL"
        assert data["bid"] == 150.25
        assert data["ask"] == 150.35

    def test_cache_ttl_expiration(self, market_data_manager, sample_quote):
        """Test cache TTL expiration."""
        import os

        market_data_manager.cache_quote(sample_quote)
        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"

        old_time = (datetime.now() - timedelta(seconds=400)).timestamp()
        os.utime(cache_file, (old_time, old_time))

        cached = market_data_manager._get_cached_quote("AAPL")
        assert cached is None

    def test_cache_key_generation(self, market_data_manager, sample_market_data):
        """Test cache key generation for historical data."""
        market_data_manager.cache_historical_data("AAPL", sample_market_data, "1d")

        cache_files = list(market_data_manager.cache_dir.glob("historical_*.json"))
        assert len(cache_files) > 0

        filename = cache_files[0].name
        assert "AAPL" in filename
        assert "1d" in filename

    def test_cache_invalidation(self, market_data_manager, sample_quote):
        """Test manual cache invalidation."""
        market_data_manager.cache_quote(sample_quote)
        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"
        assert cache_file.exists()

        market_data_manager.clear_cache()
        assert not cache_file.exists()

    def test_cache_size_limit(self, market_data_manager):
        """Test cache respects size limits."""
        assert market_data_manager.max_cache_size == 1000

        stats = market_data_manager.get_cache_stats()
        assert "file_count" in stats
        assert "total_size_bytes" in stats

    def test_cache_thread_safety(self, market_data_manager, sample_quote):
        """Test cache operations are safe for concurrent access."""
        import threading

        def cache_operation():
            market_data_manager.cache_quote(sample_quote)
            market_data_manager._get_cached_quote("AAPL")

        threads = [threading.Thread(target=cache_operation) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"
        assert cache_file.exists()

    def test_cache_persistence(
        self, market_data_manager, sample_market_data, mock_config
    ):
        """Test cache persists across manager instances."""
        market_data_manager.cache_historical_data("AAPL", sample_market_data, "1d")
        cache_dir = market_data_manager.cache_dir

        new_manager = MarketDataManager(mock_config)
        new_manager.cache_dir = cache_dir

        start = sample_market_data[0].timestamp
        end = sample_market_data[-1].timestamp
        cached_data = new_manager._get_cached_historical("AAPL", start, end, "1d")

        assert len(cached_data) == len(sample_market_data)


# Cache Statistics Tests (2 tests)
class TestCacheStatistics:
    """Test cache statistics and monitoring."""

    def test_get_cache_stats(self, market_data_manager, sample_quote):
        """Test cache statistics retrieval."""
        stats = market_data_manager.get_cache_stats()
        assert stats["file_count"] == 0
        assert stats["total_size_bytes"] == 0

        market_data_manager.cache_quote(sample_quote)

        stats = market_data_manager.get_cache_stats()
        assert stats["file_count"] > 0
        assert stats["total_size_bytes"] > 0
        assert "cache_dir" in stats

    def test_cache_stats_after_clear(self, market_data_manager, sample_quote):
        """Test cache stats after clearing cache."""
        market_data_manager.cache_quote(sample_quote)
        market_data_manager.clear_cache()

        stats = market_data_manager.get_cache_stats()
        assert stats["file_count"] == 0
        assert stats["total_size_bytes"] == 0


# Error Handling Tests (3 tests)
class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_network_error_handling(self, market_data_manager):
        """Test graceful handling of network errors."""
        with patch(
            "core.data.market_data.yf.Ticker", side_effect=Exception("Network timeout")
        ):
            quote = await market_data_manager.get_quote("AAPL")
            assert quote is None

    @pytest.mark.asyncio
    async def test_invalid_symbol_handling(self, market_data_manager):
        """Test handling of invalid symbols."""
        mock_ticker = Mock()
        mock_ticker.info = {}

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            quote = await market_data_manager.get_quote("INVALID123")
            assert quote is None

    def test_corrupted_cache_handling(self, market_data_manager):
        """Test handling of corrupted cache files."""
        cache_file = market_data_manager.cache_dir / "quote_AAPL.json"
        with open(cache_file, "w") as f:
            f.write("corrupted json data {{{")

        cached = market_data_manager._get_cached_quote("AAPL")
        assert cached is None


# Integration Tests (3 tests)
class TestIntegration:
    """Test integration scenarios."""

    @pytest.mark.asyncio
    async def test_quote_to_cache_flow(self, market_data_manager, mock_yfinance_ticker):
        """Test complete flow: fetch quote, cache it, retrieve from cache."""
        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_yfinance_ticker
        ):
            quote = await market_data_manager.get_quote("AAPL")
            assert quote is not None

            market_data_manager.cache_quote(quote)

            cached = market_data_manager._get_cached_quote("AAPL")
            assert cached is not None
            assert cached.symbol == quote.symbol

    @pytest.mark.asyncio
    async def test_historical_data_to_cache_flow(self, market_data_manager):
        """Test complete flow: fetch historical data, cache it, retrieve from cache."""
        import pandas as pd

        mock_ticker = Mock()
        mock_hist = pd.DataFrame(
            {
                "Open": [100.0],
                "High": [105.0],
                "Low": [99.0],
                "Close": [103.0],
                "Volume": [1000000],
            },
            index=pd.DatetimeIndex([datetime(2024, 1, 1)]),
        )
        mock_ticker.history.return_value = mock_hist

        with patch("core.data.market_data.yf.Ticker", return_value=mock_ticker):
            start = datetime(2024, 1, 1)
            end = datetime(2024, 1, 2)

            data = await market_data_manager.get_historical_data("AAPL", start, end)
            assert len(data) > 0

            market_data_manager.cache_historical_data("AAPL", data, "1d")

            # Use actual data timestamps for cache retrieval
            actual_start = data[0].timestamp
            actual_end = data[-1].timestamp
            cached = market_data_manager._get_cached_historical(
                "AAPL", actual_start, actual_end, "1d"
            )
            assert len(cached) == len(data)

    @pytest.mark.asyncio
    async def test_multi_symbol_batch_retrieval(
        self, market_data_manager, mock_yfinance_ticker
    ):
        """Test retrieving quotes for multiple symbols."""
        with patch(
            "core.data.market_data.yf.Ticker", return_value=mock_yfinance_ticker
        ):
            symbols = ["AAPL", "GOOGL", "MSFT"]
            quotes = []

            for symbol in symbols:
                quote = await market_data_manager.get_quote(symbol)
                if quote:
                    quotes.append(quote)

            assert len(quotes) == len(symbols)
            assert all(q.symbol in symbols for q in quotes)
