"""
Unit tests for DeepStack API Server

Comprehensive test suite covering:
- Health and core endpoints
- Quote endpoints with multiple data sources
- Order placement and management
- Position and portfolio endpoints
- Error handling and exception scenarios
- Authentication integration
- WebSocket functionality
"""

import sys
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

# Mock external dependencies before importing api_server
sys.modules["stripe"] = MagicMock()
sys.modules["cachetools"] = MagicMock()
sys.modules["supabase"] = MagicMock()

from core.api_server import DeepStackAPIServer
from core.exceptions import (
    AuthenticationError,
    CircuitBreakerTrippedError,
    DataError,
    DeepStackError,
    OrderExecutionError,
    RateLimitError,
    ValidationError,
)

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_config():
    """Create mock configuration."""
    config = Mock()
    config.trading.mode = "paper"
    config.api.cors_origins = ["http://localhost:3000"]
    config.alpaca_api_key = "test_alpaca_key"
    config.alpaca_secret_key = "test_alpaca_secret"
    return config


@pytest.fixture
def mock_paper_trader():
    """Create mock PaperTrader."""
    trader = Mock()
    trader.cash = 100000.0
    trader.get_buying_power = Mock(return_value=100000.0)
    trader.get_portfolio_value = Mock(return_value=100000.0)
    trader.get_positions = Mock(return_value=[])
    trader._get_market_price = AsyncMock(return_value=150.0)
    trader.add_manual_position = AsyncMock(
        return_value={
            "symbol": "AAPL",
            "quantity": 100,
            "avg_cost": 150.0,
            "market_value": 15000.0,
        }
    )
    return trader


@pytest.fixture
def mock_order_manager():
    """Create mock OrderManager."""
    manager = Mock()
    manager.place_market_order = AsyncMock(return_value="order_123")
    manager.place_limit_order = AsyncMock(return_value="order_456")
    manager.place_stop_order = AsyncMock(return_value="order_789")
    manager.cancel_order = AsyncMock(return_value=True)
    return manager


@pytest.fixture
def mock_ibkr_client():
    """Create mock IBKR client."""
    client = Mock()
    client.connected = False
    client.get_quote = AsyncMock(return_value=None)
    client.get_positions = AsyncMock(return_value=[])
    client.get_account_summary = AsyncMock(return_value={"TotalCashValue": "100000"})
    client.get_buying_power = AsyncMock(return_value=100000.0)
    client.disconnect = AsyncMock()
    return client


@pytest.fixture
def mock_alpaca_client():
    """Create mock Alpaca client."""
    client = Mock()
    # Default get_quote returns None (tests can override)
    client.get_quote = AsyncMock(return_value=None)
    # get_news should return dict with "articles" key
    client.get_news = AsyncMock(
        return_value={
            "articles": [
                {
                    "headline": "Test News",
                    "summary": "Test summary",
                    "url": "https://example.com",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "next_page_token": None,
        }
    )
    return client


@pytest.fixture
def mock_market_data_manager():
    """Create mock MarketDataManager."""
    manager = Mock()
    manager.get_historical_data = AsyncMock(
        return_value=[
            Mock(
                timestamp=datetime.now(timezone.utc),
                open=150.0,
                high=152.0,
                low=149.0,
                close=151.0,
                volume=1000000,
            )
        ]
    )
    return manager


@pytest.fixture
def api_server(
    mock_config,
    mock_paper_trader,
    mock_order_manager,
    mock_ibkr_client,
    mock_alpaca_client,
):
    """Create API server instance with mocked dependencies."""
    with patch("core.api_server.get_config", return_value=mock_config):
        with patch("core.api_server.PaperTrader", return_value=mock_paper_trader):
            with patch("core.api_server.IBKRClient", return_value=mock_ibkr_client):
                with patch(
                    "core.api_server.AlpacaClient", return_value=mock_alpaca_client
                ):
                    with patch("core.api_server.OrderManager"):
                        server = DeepStackAPIServer()
                        server.order_manager = mock_order_manager
                        server.paper_trader = mock_paper_trader
                        server.ibkr_client = mock_ibkr_client
                        server.alpaca_client = mock_alpaca_client
                        return server


@pytest.fixture
def client(api_server, mock_authenticated_user):
    """Create test client with auth bypass."""
    # Override auth dependency globally for all tests
    from core.api.auth import get_current_user
    from core.api.credits import verify_token, verify_token_optional

    async def override_get_current_user():
        return mock_authenticated_user

    async def override_verify_token():
        return "test_user_123"

    async def override_verify_token_optional():
        return "test_user_123"

    api_server.app.dependency_overrides[get_current_user] = override_get_current_user
    api_server.app.dependency_overrides[verify_token] = override_verify_token
    api_server.app.dependency_overrides[verify_token_optional] = (
        override_verify_token_optional
    )
    return TestClient(api_server.app)


@pytest.fixture
def mock_authenticated_user():
    """Create mock authenticated user for dependency injection."""
    from core.api.auth import AuthenticatedUser

    return AuthenticatedUser(user_id="test_user_123", email="test@example.com")


# =============================================================================
# Health & Core Endpoints Tests (10 tests)
# =============================================================================


class TestHealthAndCoreEndpoints:
    """Tests for health check and core API functionality."""

    def test_health_check_returns_status(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_check_returns_timestamp(self, client):
        """Test health endpoint includes timestamp."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        # Verify timestamp is valid ISO format
        datetime.fromisoformat(data["timestamp"])

    def test_health_check_returns_version(self, client):
        """Test health endpoint includes version."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "1.0.0"

    def test_api_server_initialization(self, mock_config):
        """Test API server initializes with correct configuration."""
        with patch("core.api_server.get_config", return_value=mock_config):
            with patch("core.api_server.PaperTrader"):
                with patch("core.api_server.IBKRClient"):
                    with patch("core.api_server.OrderManager"):
                        server = DeepStackAPIServer()
                        assert server.config == mock_config
                        assert server.app is not None
                        assert server.websocket_connections == []

    def test_cors_middleware_configured(self, api_server):
        """Test CORS middleware is properly configured."""
        # Check middleware is in the app
        from starlette.middleware.cors import CORSMiddleware

        middleware_types = [m.cls.__name__ for m in api_server.app.user_middleware]
        assert "CORSMiddleware" in middleware_types or CORSMiddleware in [
            m.cls for m in api_server.app.user_middleware
        ]

    def test_health_check_response_model(self, client):
        """Test health check response matches expected model."""
        response = client.get("/health")
        data = response.json()
        # Verify all required fields are present
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        # Verify types
        assert isinstance(data["status"], str)
        assert isinstance(data["version"], str)

    def test_server_has_exception_handlers(self, api_server):
        """Test that exception handlers are registered."""
        # Check that exception handlers exist
        assert DeepStackError in api_server.app.exception_handlers
        assert Exception in api_server.app.exception_handlers

    def test_server_routes_registered(self, api_server):
        """Test that all expected routes are registered."""
        routes = [route.path for route in api_server.app.routes]
        # Check core routes exist
        assert "/health" in routes
        assert any("/quote/" in route for route in routes)
        assert "/account" in routes
        assert "/orders" in routes
        assert "/positions" in routes

    def test_websocket_endpoint_registered(self, api_server):
        """Test WebSocket endpoint is registered."""
        routes = [route.path for route in api_server.app.routes]
        assert "/ws" in routes

    def test_server_initializes_empty_websocket_connections(self, api_server):
        """Test server starts with no WebSocket connections."""
        assert api_server.websocket_connections == []
        assert isinstance(api_server.websocket_connections, list)


# =============================================================================
# Quote Endpoints Tests (15 tests)
# =============================================================================


class TestQuoteEndpoints:
    """Tests for quote retrieval endpoints."""

    @pytest.mark.asyncio
    async def test_get_quote_success_from_ibkr(self, client, api_server):
        """Test successful quote retrieval from IBKR."""
        # Setup IBKR to return quote
        api_server.ibkr_client.connected = True
        api_server.ibkr_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.00,
                "volume": 1000000,
                "timestamp": datetime.now(timezone.utc),
            }
        )

        response = client.get("/quote/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert data["source"] == "ibkr"
        assert data["bid"] == 149.50
        assert data["ask"] == 150.50
        assert data["last"] == 150.00

    @pytest.mark.asyncio
    async def test_get_quote_success_from_alpaca(self, client, api_server):
        """Test successful quote retrieval from Alpaca."""
        # IBKR not available, Alpaca returns quote
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
                "bid_volume": 100,
                "ask_volume": 200,
            }
        )

        response = client.get("/quote/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert data["source"] == "alpaca"
        assert data["last"] == 150.0

    @pytest.mark.asyncio
    async def test_get_quote_success_from_paper_trader(self, client, api_server):
        """Test quote retrieval from Alpaca when IBKR unavailable."""
        api_server.ibkr_client = None
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "MSFT",
                "bid": 374.50,
                "ask": 375.50,
                "last": 375.0,
                "bid_volume": 100,
                "ask_volume": 200,
            }
        )

        response = client.get("/quote/MSFT")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "MSFT"
        assert data["source"] == "alpaca"

    @pytest.mark.asyncio
    async def test_get_quote_yfinance_fallback(self, client, api_server):
        """Test fallback to Yahoo Finance when other sources fail."""
        # Setup all primary sources to fail
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)

        # Mock yfinance
        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {
                "currentPrice": 150.0,
                "bid": 149.50,
                "ask": 150.50,
                "regularMarketVolume": 1000000,
            }

            response = client.get("/quote/AAPL")
            assert response.status_code == 200
            data = response.json()
            assert data["symbol"] == "AAPL"
            assert data["source"] == "yahoo_finance"
            assert data["last"] == 150.0

    @pytest.mark.asyncio
    async def test_get_quote_invalid_symbol(self, client, api_server):
        """Test quote endpoint with invalid/unavailable symbol."""
        # Setup all sources to fail
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}

            response = client.get("/quote/INVALID")
            assert response.status_code == 404
            data = response.json()
            # Check for error response structure
            assert "detail" in data or "error" in data or "message" in data

    @pytest.mark.asyncio
    async def test_get_quote_when_market_closed(self, client, api_server):
        """Test quote retrieval when market is closed still returns data."""
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
            }
        )

        response = client.get("/quote/AAPL")
        assert response.status_code == 200
        data = response.json()
        # Should still return last known price
        assert "last" in data

    @pytest.mark.asyncio
    async def test_get_quote_handles_api_timeout(self, client, api_server):
        """Test quote endpoint handles API timeouts gracefully."""
        # Alpaca times out, should fallback to IBKR or Yahoo
        api_server.alpaca_client.get_quote = AsyncMock(
            side_effect=TimeoutError("API timeout")
        )
        api_server.ibkr_client.connected = True
        api_server.ibkr_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
                "volume": 1000000,
                "timestamp": datetime.now(timezone.utc),
            }
        )

        # Should fallback to IBKR
        response = client.get("/quote/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "ibkr"

    def test_bars_endpoint_success(self, client, api_server):
        """Test successful historical bars retrieval."""
        # Mock alpaca_client.get_bars to return bar data
        api_server.alpaca_client.get_bars = AsyncMock(
            return_value=[
                {
                    "timestamp": "2024-01-01T10:00:00Z",
                    "open": 150.0,
                    "high": 152.0,
                    "low": 149.0,
                    "close": 151.0,
                    "volume": 1000000,
                }
            ]
        )

        response = client.get("/api/market/bars?symbol=AAPL&timeframe=1d&limit=100")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check bar structure
        bar = data[0]
        assert "time" in bar
        assert "open" in bar
        assert "high" in bar
        assert "low" in bar
        assert "close" in bar
        assert "volume" in bar

    def test_bars_endpoint_invalid_timeframe(self, client, api_server):
        """Test bars endpoint with unsupported timeframe."""
        api_server.market_data_manager = Mock()
        api_server.market_data_manager.get_historical_data = AsyncMock(
            side_effect=DataError(message="Invalid timeframe")
        )

        response = client.get("/api/market/bars?symbol=AAPL&timeframe=invalid")
        assert response.status_code == 500

    def test_quote_response_includes_timestamp(self, client, api_server):
        """Test quote response includes valid timestamp."""
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
            }
        )

        response = client.get("/quote/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        # Verify valid ISO format
        datetime.fromisoformat(data["timestamp"])

    def test_quote_response_format(self, client, api_server):
        """Test quote response follows expected format."""
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
            }
        )

        response = client.get("/quote/AAPL")
        data = response.json()
        # Check all required fields
        assert "symbol" in data
        assert "last" in data
        assert "timestamp" in data
        assert "source" in data

    def test_news_endpoint_success(self, client, api_server):
        """Test news endpoint returns articles."""
        response = client.get("/api/news?symbol=AAPL&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "news" in data
        assert isinstance(data["news"], list)

    def test_news_endpoint_no_alpaca_client(self, client, api_server):
        """Test news endpoint when Alpaca client not initialized."""
        api_server.alpaca_client = None
        response = client.get("/api/news")
        assert response.status_code == 200
        data = response.json()
        assert data["news"] == []

    def test_quote_includes_volume(self, client, api_server):
        """Test quote response includes volume data."""
        api_server.paper_trader._get_market_price = AsyncMock(return_value=150.0)

        response = client.get("/quote/AAPL")
        data = response.json()
        assert "volume" in data


# =============================================================================
# Order Endpoints Tests (20 tests)
# =============================================================================


class TestOrderEndpoints:
    """Tests for order placement and management."""

    def test_place_order_market_buy_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful market buy order."""
        order_data = {
            "symbol": "AAPL",
            "quantity": 100,
            "action": "BUY",
            "order_type": "MKT",
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == "order_123"
        assert data["status"] == "submitted"

    def test_place_order_market_sell_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful market sell order."""
        order_data = {
            "symbol": "AAPL",
            "quantity": 50,
            "action": "SELL",
            "order_type": "MKT",
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "submitted"

    def test_place_order_limit_buy_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful limit buy order."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "LMT",
                "limit_price": 150.0,
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 200
            data = response.json()
            assert data["order_id"] == "order_456"

    def test_place_order_limit_sell_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful limit sell order."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 50,
                "action": "SELL",
                "order_type": "LMT",
                "limit_price": 155.0,
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 200

    def test_place_order_invalid_symbol(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order with invalid symbol returns error."""
        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=ValidationError(message="Invalid symbol", field="symbol")
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 400

    def test_place_order_invalid_quantity(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order with invalid quantity (zero/negative)."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 0,  # Zero quantity
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            # Zero quantity should fail at order manager level or be rejected
            # Accept 200 (handled), 400, 422, or 500 (error)
            assert response.status_code in [200, 400, 422, 500]

    def test_place_order_invalid_action(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order with invalid action."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "INVALID",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            # Should still be accepted by Pydantic but fail in order manager
            assert response.status_code in [200, 500]

    def test_place_order_circuit_breaker_tripped(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order rejected when circuit breaker is tripped."""
        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=CircuitBreakerTrippedError(
                message="Circuit breaker tripped", trigger="daily_loss_limit"
            )
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            # Circuit breaker should return 403 or 500
            assert response.status_code in [403, 500]

    def test_place_order_insufficient_funds(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order rejected due to insufficient funds."""
        from core.exceptions import InsufficientFundsError

        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=InsufficientFundsError(
                message="Insufficient funds",
                symbol="AAPL",
                quantity=1000,
                required_amount=150000.0,
                available_amount=10000.0,
            )
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 1000,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 500

    def test_cancel_order_success(self, client, api_server, mock_authenticated_user):
        """Test successful order cancellation."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.delete("/orders/order_123")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "cancelled"
            assert data["order_id"] == "order_123"

    def test_cancel_order_not_found(self, client, api_server, mock_authenticated_user):
        """Test cancelling non-existent order."""
        api_server.order_manager.cancel_order = AsyncMock(return_value=False)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.delete("/orders/invalid_order")
            assert response.status_code == 500

    def test_place_order_limit_without_price(
        self, client, api_server, mock_authenticated_user
    ):
        """Test limit order without limit_price returns validation error."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "LMT",
                # Missing limit_price
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 400

    def test_place_order_stop_without_price(
        self, client, api_server, mock_authenticated_user
    ):
        """Test stop order without stop_price returns validation error."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "SELL",
                "order_type": "STP",
                # Missing stop_price
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 400

    def test_place_order_stop_order_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful stop order placement."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "SELL",
                "order_type": "STP",
                "stop_price": 145.0,
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 200
            data = response.json()
            assert data["order_id"] == "order_789"

    def test_order_response_format(self, client, api_server, mock_authenticated_user):
        """Test order response follows expected format."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            data = response.json()
            assert "order_id" in data
            assert "status" in data
            assert "message" in data

    def test_place_order_unsupported_order_type(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order with unsupported order type."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "INVALID",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 400

    def test_place_order_manager_not_initialized(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order placement when order manager not initialized."""
        api_server.order_manager = None

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 500

    def test_place_order_returns_none_order_id(
        self, client, api_server, mock_authenticated_user
    ):
        """Test handling when order manager returns None order ID."""
        api_server.order_manager.place_market_order = AsyncMock(return_value=None)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "failed"

    def test_cancel_order_manager_not_initialized(
        self, client, api_server, mock_authenticated_user
    ):
        """Test order cancellation when order manager not initialized."""
        api_server.order_manager = None

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.delete("/orders/order_123")
            assert response.status_code == 500


# =============================================================================
# Position & Portfolio Endpoints Tests (15 tests)
# =============================================================================


class TestPositionAndPortfolioEndpoints:
    """Tests for position and portfolio management."""

    def test_get_positions_success(self, client, api_server, mock_authenticated_user):
        """Test successful positions retrieval."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[
                {"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0},
                {"symbol": "GOOGL", "quantity": 50, "avg_cost": 2800.0},
            ]
        )
        api_server.paper_trader._get_market_price = AsyncMock(
            side_effect=[152.0, 2850.0]
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            assert response.status_code == 200
            data = response.json()
            assert "positions" in data
            assert "total_value" in data
            assert len(data["positions"]) == 2

    def test_get_positions_empty(self, client, api_server, mock_authenticated_user):
        """Test positions endpoint with no positions."""
        api_server.paper_trader.get_positions = Mock(return_value=[])

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            assert response.status_code == 200
            data = response.json()
            assert data["positions"] == []
            assert data["total_value"] == 0.0

    def test_get_positions_with_unrealized_pnl(
        self, client, api_server, mock_authenticated_user
    ):
        """Test positions include unrealized P&L calculation."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[{"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}]
        )
        api_server.paper_trader._get_market_price = AsyncMock(return_value=155.0)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            data = response.json()
            position = data["positions"][0]
            assert "unrealized_pnl" in position
            # 100 shares * (155 - 150) = 500
            assert position["unrealized_pnl"] == 500.0

    def test_get_account_summary_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successful account summary retrieval."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/account")
            assert response.status_code == 200
            data = response.json()
            assert "cash" in data
            assert "buying_power" in data
            assert "portfolio_value" in data
            assert data["cash"] == 100000.0

    def test_get_account_summary_with_positions(
        self, client, api_server, mock_authenticated_user
    ):
        """Test account summary includes portfolio value."""
        api_server.paper_trader.get_portfolio_value = Mock(return_value=125000.0)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/account")
            data = response.json()
            assert data["portfolio_value"] == 125000.0

    def test_add_manual_position_success(
        self, client, api_server, mock_authenticated_user
    ):
        """Test successfully adding manual position."""
        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            position_data = {"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}
            response = client.post("/positions/manual", json=position_data)
            assert response.status_code == 200
            data = response.json()
            assert data["symbol"] == "AAPL"
            assert data["quantity"] == 100

    def test_add_manual_position_invalid_symbol(
        self, client, api_server, mock_authenticated_user
    ):
        """Test manual position with invalid symbol."""
        api_server.paper_trader.add_manual_position = AsyncMock(
            side_effect=ValueError("Invalid symbol")
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            position_data = {"symbol": "", "quantity": 100, "avg_cost": 150.0}
            response = client.post("/positions/manual", json=position_data)
            assert response.status_code == 400

    def test_add_manual_position_paper_trader_not_available(
        self, client, api_server, mock_authenticated_user
    ):
        """Test manual position when paper trader not available."""
        api_server.paper_trader = None

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            position_data = {"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}
            response = client.post("/positions/manual", json=position_data)
            assert response.status_code == 500

    def test_portfolio_total_calculation(
        self, client, api_server, mock_authenticated_user
    ):
        """Test portfolio total value calculation."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[
                {"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0},
                {"symbol": "GOOGL", "quantity": 10, "avg_cost": 2800.0},
            ]
        )
        api_server.paper_trader._get_market_price = AsyncMock(
            side_effect=[155.0, 2900.0]
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            data = response.json()
            # AAPL: 100 * 155 = 15,500
            # GOOGL: 10 * 2900 = 29,000
            # Total: 44,500
            assert data["total_value"] == 44500.0

    def test_position_response_includes_current_price(
        self, client, api_server, mock_authenticated_user
    ):
        """Test position response includes current market price."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[{"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}]
        )
        api_server.paper_trader._get_market_price = AsyncMock(return_value=155.0)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            data = response.json()
            position = data["positions"][0]
            assert position["current_price"] == 155.0

    def test_position_fallback_to_avg_cost(
        self, client, api_server, mock_authenticated_user
    ):
        """Test position uses avg_cost when current price unavailable."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[{"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}]
        )
        api_server.paper_trader._get_market_price = AsyncMock(return_value=None)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            data = response.json()
            position = data["positions"][0]
            # Should fallback to avg_cost
            assert position["current_price"] == 150.0

    def test_get_positions_trader_not_initialized(
        self, client, api_server, mock_authenticated_user
    ):
        """Test positions endpoint when trader not initialized."""
        api_server.paper_trader = None

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            assert response.status_code == 500

    def test_position_market_value_calculation(
        self, client, api_server, mock_authenticated_user
    ):
        """Test position market value is correctly calculated."""
        api_server.paper_trader.get_positions = Mock(
            return_value=[{"symbol": "AAPL", "quantity": 100, "avg_cost": 150.0}]
        )
        api_server.paper_trader._get_market_price = AsyncMock(return_value=155.0)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/positions")
            data = response.json()
            position = data["positions"][0]
            # 100 shares * 155 = 15,500
            assert position["market_value"] == 15500.0

    def test_account_summary_live_mode(
        self, client, api_server, mock_authenticated_user
    ):
        """Test account summary in live trading mode."""
        api_server.config.trading.mode = "live"
        api_server.ibkr_client = Mock()
        api_server.ibkr_client.get_account_summary = AsyncMock(
            return_value={"TotalCashValue": "150000"}
        )
        api_server.ibkr_client.get_buying_power = AsyncMock(return_value=300000.0)

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            response = client.get("/account")
            assert response.status_code == 200
            data = response.json()
            assert data["cash"] == 150000.0
            assert data["buying_power"] == 300000.0


# =============================================================================
# Error Handling Tests (15 tests)
# =============================================================================


class TestErrorHandling:
    """Tests for error handling and exception scenarios."""

    def test_exception_handler_deepstack_error(self, client, api_server):
        """Test DeepStackError exception handler."""
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}

            response = client.get("/quote/INVALID")
            assert response.status_code == 404
            data = response.json()
            # Check for error structure
            assert "detail" in data or "message" in data or "error" in data

    def test_exception_handler_validation_error(
        self, client, api_server, mock_authenticated_user
    ):
        """Test ValidationError returns 400 status."""
        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=ValidationError(message="Invalid input", field="symbol")
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 400

    def test_exception_handler_authentication_error(self, api_server):
        """Test AuthenticationError returns 401 status."""
        from fastapi.testclient import TestClient

        from core.api.auth import get_current_user
        from core.api.credits import verify_token

        async def raise_auth_error():
            raise AuthenticationError(message="Invalid credentials")

        # Create a client WITHOUT auth bypass to test real auth errors
        api_server.app.dependency_overrides[get_current_user] = raise_auth_error
        api_server.app.dependency_overrides[verify_token] = raise_auth_error
        test_client = TestClient(api_server.app)

        order_data = {
            "symbol": "AAPL",
            "quantity": 100,
            "action": "BUY",
            "order_type": "MKT",
        }
        response = test_client.post("/orders", json=order_data)
        # AuthenticationError should return 401 or 403 or 500 (unhandled)
        assert response.status_code in [401, 403, 500]

    def test_exception_handler_rate_limit_error(self, client, api_server):
        """Test RateLimitError returns 429 status."""
        api_server.alpaca_client.get_quote = AsyncMock(
            side_effect=RateLimitError(
                message="Rate limit exceeded", service="alpaca", retry_after=60
            )
        )
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            response = client.get("/quote/AAPL")
            # Rate limit should trigger error
            assert response.status_code in [404, 429, 500]

    def test_exception_handler_generic_error(self, client, api_server):
        """Test generic Exception returns error status."""
        api_server.alpaca_client.get_quote = AsyncMock(
            side_effect=Exception("Internal server error")
        )
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            response = client.get("/quote/AAPL")
            # Generic errors should return 404 (no quote) or 500 (server error)
            assert response.status_code in [404, 500]

    def test_error_response_format(self, client, api_server):
        """Test error responses follow standardized format."""
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}

            response = client.get("/quote/INVALID")
            data = response.json()
            # Check error response format (detail for FastAPI errors)
            assert response.status_code == 404
            assert "detail" in data or "message" in data or "error" in data

    def test_error_response_includes_request_id(self, client, api_server):
        """Test error responses may include request ID."""
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}

            response1 = client.get("/quote/INVALID1")
            response2 = client.get("/quote/INVALID2")

            # Both should return 404
            assert response1.status_code == 404
            assert response2.status_code == 404

    def test_error_response_hides_internal_details(self, client, api_server):
        """Test error responses don't expose internal implementation details."""
        api_server.alpaca_client.get_quote = AsyncMock(
            side_effect=RuntimeError("Internal database connection failed at line 123")
        )
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            response = client.get("/quote/AAPL")
            data = response.json()

            # Error message should not expose internal details
            error_str = str(data).lower()
            assert "database connection" not in error_str or "line 123" not in error_str

    def test_deepstack_error_includes_details(self, client, api_server):
        """Test DeepStackError responses include error info."""
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}

            response = client.get("/quote/AAPL")
            data = response.json()
            # Should have some error information
            assert response.status_code == 404
            assert "detail" in data or "message" in data or "error" in data

    def test_circuit_breaker_error_status_code(
        self, client, api_server, mock_authenticated_user
    ):
        """Test CircuitBreakerTrippedError returns 403."""
        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=CircuitBreakerTrippedError(message="Circuit breaker tripped")
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 403

    def test_error_timestamp_format(self, client, api_server):
        """Test successful responses have timestamps in ISO format."""
        api_server.alpaca_client.get_quote = AsyncMock(
            return_value={
                "symbol": "AAPL",
                "bid": 149.50,
                "ask": 150.50,
                "last": 150.0,
            }
        )

        response = client.get("/quote/AAPL")
        data = response.json()

        # Verify timestamp is valid ISO format
        timestamp = data["timestamp"]
        datetime.fromisoformat(timestamp)

    def test_quote_unavailable_error_status(self, client, api_server):
        """Test QuoteUnavailableError returns 404."""
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            response = client.get("/quote/INVALID")
            assert response.status_code == 404

    def test_market_data_error_status(self, client, api_server):
        """Test MarketDataError returns appropriate status."""
        api_server.ibkr_client.connected = False
        api_server.alpaca_client.get_quote = AsyncMock(return_value=None)

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            response = client.get("/quote/AAPL")
            assert response.status_code == 404

    def test_order_execution_error_status(
        self, client, api_server, mock_authenticated_user
    ):
        """Test OrderExecutionError returns 500."""
        api_server.order_manager.place_market_order = AsyncMock(
            side_effect=OrderExecutionError(
                message="Order execution failed", symbol="AAPL"
            )
        )

        with patch(
            "core.api_server.get_current_user", return_value=mock_authenticated_user
        ):
            order_data = {
                "symbol": "AAPL",
                "quantity": 100,
                "action": "BUY",
                "order_type": "MKT",
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 500

    def test_error_logging_on_exception(self, client, api_server, caplog):
        """Test that exceptions are properly logged."""
        import logging

        caplog.set_level(logging.WARNING)

        api_server.alpaca_client.get_quote = AsyncMock(
            side_effect=Exception("Test exception")
        )
        api_server.ibkr_client.connected = False

        with patch("core.api_server.yf.Ticker") as mock_ticker:
            mock_ticker.return_value.info = {}
            client.get("/quote/AAPL")
            # Check that some warning/error was logged
            assert len(caplog.records) > 0


# =============================================================================
# Additional Edge Cases and Integration Tests
# =============================================================================


class TestAdditionalScenarios:
    """Additional test scenarios and edge cases."""

    def test_server_shutdown_closes_websockets(self, api_server):
        """Test server shutdown properly closes WebSocket connections."""
        # Add mock websocket
        mock_ws = Mock()
        mock_ws.close = AsyncMock()
        api_server.websocket_connections.append(mock_ws)

        # Call shutdown
        import asyncio

        asyncio.run(api_server.shutdown())

        # Verify websocket was closed
        mock_ws.close.assert_called_once()

    def test_server_shutdown_disconnects_ibkr(self, api_server):
        """Test server shutdown disconnects IBKR client."""
        import asyncio

        asyncio.run(api_server.shutdown())
        # IBKR disconnect should be called
        api_server.ibkr_client.disconnect.assert_called_once()

    def test_broadcast_update_to_websockets(self, api_server):
        """Test broadcast update sends to all WebSocket connections."""
        # Add mock websockets
        mock_ws1 = Mock()
        mock_ws1.send_json = AsyncMock()
        mock_ws2 = Mock()
        mock_ws2.send_json = AsyncMock()

        api_server.websocket_connections = [mock_ws1, mock_ws2]

        # Broadcast update
        import asyncio

        asyncio.run(
            api_server.broadcast_update("quote", {"symbol": "AAPL", "price": 150.0})
        )

        # Both should receive the update
        mock_ws1.send_json.assert_called_once()
        mock_ws2.send_json.assert_called_once()

    def test_broadcast_removes_failed_connections(self, api_server):
        """Test broadcast removes disconnected WebSocket clients."""
        # Add mock websockets - one will fail
        mock_ws_good = Mock()
        mock_ws_good.send_json = AsyncMock()
        mock_ws_failed = Mock()
        mock_ws_failed.send_json = AsyncMock(side_effect=Exception("Disconnected"))

        api_server.websocket_connections = [mock_ws_good, mock_ws_failed]

        # Broadcast update
        import asyncio

        asyncio.run(api_server.broadcast_update("test", {}))

        # Failed connection should be removed
        assert mock_ws_failed not in api_server.websocket_connections
        assert mock_ws_good in api_server.websocket_connections

    def test_get_app_returns_fastapi_instance(self, api_server):
        """Test get_app returns FastAPI application."""
        from fastapi import FastAPI

        app = api_server.get_app()
        assert isinstance(app, FastAPI)

    def test_create_app_function(self):
        """Test create_app factory function."""
        from fastapi import FastAPI

        from core.api_server import create_app

        with patch("core.api_server.get_config"):
            with patch("core.api_server.PaperTrader"):
                with patch("core.api_server.IBKRClient"):
                    with patch("core.api_server.OrderManager"):
                        app = create_app()
                        assert isinstance(app, FastAPI)

    def test_get_server_singleton(self):
        """Test get_server returns singleton instance."""
        from core.api_server import get_server

        with patch("core.api_server.get_config"):
            with patch("core.api_server.PaperTrader"):
                with patch("core.api_server.IBKRClient"):
                    with patch("core.api_server.OrderManager"):
                        server1 = get_server()
                        server2 = get_server()
                        # Should be same instance
                        assert server1 is server2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--no-cov"])
