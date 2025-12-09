"""
Unit tests for WebSocket functionality in DeepStack API Server.

Tests cover:
- WebSocket connection lifecycle
- Message broadcasting to multiple clients
- Message handling and echo functionality
- Connection cleanup and error handling
"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# Mock all dependencies before any imports
@pytest.fixture
def api_server():
    """Create API server with mocked dependencies."""
    # Mock all the modules that api_server imports
    with (
        patch.dict(
            "sys.modules",
            {
                "stripe": MagicMock(),
                "yfinance": MagicMock(),
                "cachetools": MagicMock(),
                "httpx": MagicMock(),
                "supabase": MagicMock(),
            },
        ),
        patch("core.broker.paper_trader.PaperTrader") as mock_paper_trader,
        patch("core.data.alpaca_client.AlpacaClient") as mock_alpaca,
        patch("core.broker.ibkr_client.IBKRClient") as mock_ibkr,
        patch("core.broker.order_manager.OrderManager") as mock_order_manager,
        patch("core.risk.portfolio_risk.PortfolioRisk") as mock_risk,
        patch("core.data.alphavantage_client.AlphaVantageClient") as mock_av,
        patch("core.data.market_data.MarketDataManager") as mock_market_data,
        patch("core.strategies.deep_value.DeepValueStrategy") as mock_strategy,
        patch("core.strategies.hedged_position.HedgedPositionManager") as mock_hedge,
    ):

        # Import after patching
        from core.api_server import DeepStackAPIServer

        # Configure mocks
        mock_paper_trader.return_value.cash = 100000.0
        mock_paper_trader.return_value.get_buying_power.return_value = 100000.0
        mock_paper_trader.return_value.get_portfolio_value.return_value = 100000.0
        mock_paper_trader.return_value.get_positions.return_value = []

        server = DeepStackAPIServer()
        return server


@pytest.fixture
def client(api_server):
    """Create test client."""
    return TestClient(api_server.app)


# ==========================================
# Connection Tests (5 tests)
# ==========================================


def test_websocket_connect_success(client):
    """Test successful WebSocket connection establishment."""
    with client.websocket_connect("/ws") as websocket:
        # Connection is established - verify we can send/receive
        websocket.send_text("test")
        data = websocket.receive_text()
        assert "Echo: test" in data


def test_websocket_disconnect_graceful(client, api_server):
    """Test graceful WebSocket disconnection."""
    # Track initial connection count
    initial_count = len(api_server.websocket_connections)

    with client.websocket_connect("/ws") as websocket:
        # Verify connection was added
        assert len(api_server.websocket_connections) == initial_count + 1
        websocket.send_text("ping")
        websocket.receive_text()

    # After context exit, connection should be removed
    # Give it a moment to clean up
    assert len(api_server.websocket_connections) == initial_count


def test_websocket_disconnect_abrupt(client, api_server):
    """Test abrupt WebSocket disconnection is handled properly."""
    initial_count = len(api_server.websocket_connections)

    with client.websocket_connect("/ws") as websocket:
        assert len(api_server.websocket_connections) == initial_count + 1
        # Close without proper cleanup
        websocket.close()

    # Connection should still be cleaned up
    assert len(api_server.websocket_connections) == initial_count


def test_websocket_multiple_connections(client, api_server):
    """Test multiple simultaneous WebSocket connections."""
    connections = []

    try:
        # Open 3 connections
        for i in range(3):
            ws = client.websocket_connect("/ws")
            ws.__enter__()
            connections.append(ws)

        # Verify all are tracked
        assert len(api_server.websocket_connections) == 3

        # Each can send/receive independently
        for i, ws in enumerate(connections):
            ws.send_text(f"message_{i}")
            response = ws.receive_text()
            assert f"Echo: message_{i}" in response

    finally:
        # Clean up all connections
        for ws in connections:
            try:
                ws.__exit__(None, None, None)
            except:
                pass


def test_websocket_connection_limit(client, api_server):
    """Test handling of many concurrent connections."""
    connections = []
    max_connections = 10

    try:
        # Open many connections
        for i in range(max_connections):
            ws = client.websocket_connect("/ws")
            ws.__enter__()
            connections.append(ws)

        # Verify all are tracked
        assert len(api_server.websocket_connections) == max_connections

        # All should be functional
        connections[0].send_text("test")
        response = connections[0].receive_text()
        assert "Echo: test" in response

    finally:
        # Clean up
        for ws in connections:
            try:
                ws.__exit__(None, None, None)
            except:
                pass


# ==========================================
# Message Broadcasting Tests (5 tests)
# ==========================================


@pytest.mark.asyncio
async def test_broadcast_message_to_all_clients(api_server):
    """Test broadcasting message to all connected clients."""
    # Create mock websockets
    mock_ws1 = AsyncMock()
    mock_ws2 = AsyncMock()
    mock_ws3 = AsyncMock()

    # Add to connections
    api_server.websocket_connections = [mock_ws1, mock_ws2, mock_ws3]

    # Broadcast a message
    test_data = {"symbol": "AAPL", "price": 150.00}
    await api_server.broadcast_update("quote", test_data)

    # Verify all clients received the message
    assert mock_ws1.send_json.call_count == 1
    assert mock_ws2.send_json.call_count == 1
    assert mock_ws3.send_json.call_count == 1

    # Verify message structure
    sent_message = mock_ws1.send_json.call_args[0][0]
    assert sent_message["type"] == "quote"
    assert sent_message["data"] == test_data
    assert "timestamp" in sent_message


@pytest.mark.asyncio
async def test_broadcast_quote_update(api_server):
    """Test broadcasting quote updates."""
    mock_ws = AsyncMock()
    api_server.websocket_connections = [mock_ws]

    quote_data = {
        "symbol": "TSLA",
        "bid": 245.50,
        "ask": 245.75,
        "last": 245.60,
        "volume": 1000000,
    }

    await api_server.broadcast_update("quote_update", quote_data)

    # Verify message sent
    assert mock_ws.send_json.called
    message = mock_ws.send_json.call_args[0][0]
    assert message["type"] == "quote_update"
    assert message["data"]["symbol"] == "TSLA"
    assert message["data"]["last"] == 245.60


@pytest.mark.asyncio
async def test_broadcast_order_status_update(api_server):
    """Test broadcasting order status updates."""
    mock_ws = AsyncMock()
    api_server.websocket_connections = [mock_ws]

    order_data = {
        "order_id": "ORD123",
        "symbol": "NVDA",
        "status": "filled",
        "filled_qty": 100,
        "avg_price": 450.25,
    }

    await api_server.broadcast_update("order_status", order_data)

    assert mock_ws.send_json.called
    message = mock_ws.send_json.call_args[0][0]
    assert message["type"] == "order_status"
    assert message["data"]["order_id"] == "ORD123"
    assert message["data"]["status"] == "filled"


@pytest.mark.asyncio
async def test_broadcast_alert_message(api_server):
    """Test broadcasting alert messages."""
    mock_ws1 = AsyncMock()
    mock_ws2 = AsyncMock()
    api_server.websocket_connections = [mock_ws1, mock_ws2]

    alert_data = {
        "level": "warning",
        "message": "High volatility detected",
        "symbol": "SPY",
    }

    await api_server.broadcast_update("alert", alert_data)

    # Both clients should receive the alert
    assert mock_ws1.send_json.called
    assert mock_ws2.send_json.called

    message = mock_ws1.send_json.call_args[0][0]
    assert message["type"] == "alert"
    assert message["data"]["level"] == "warning"


@pytest.mark.asyncio
async def test_broadcast_with_no_connections(api_server):
    """Test broadcasting when no clients are connected."""
    # Empty connection list
    api_server.websocket_connections = []

    # Should not raise an error
    await api_server.broadcast_update("test", {"data": "value"})

    # Verify no errors and connections list is still empty
    assert len(api_server.websocket_connections) == 0


# ==========================================
# Message Handling Tests (5 tests)
# ==========================================


def test_receive_subscribe_message(client):
    """Test receiving a subscribe message (echo functionality)."""
    with client.websocket_connect("/ws") as websocket:
        subscribe_msg = json.dumps(
            {"action": "subscribe", "channel": "quotes", "symbols": ["AAPL", "GOOGL"]}
        )

        websocket.send_text(subscribe_msg)
        response = websocket.receive_text()

        # Currently echoes back
        assert "Echo:" in response
        assert "subscribe" in response


def test_receive_unsubscribe_message(client):
    """Test receiving an unsubscribe message."""
    with client.websocket_connect("/ws") as websocket:
        unsubscribe_msg = json.dumps(
            {"action": "unsubscribe", "channel": "quotes", "symbols": ["AAPL"]}
        )

        websocket.send_text(unsubscribe_msg)
        response = websocket.receive_text()

        assert "Echo:" in response
        assert "unsubscribe" in response


def test_receive_invalid_json(client):
    """Test handling of invalid JSON messages."""
    with client.websocket_connect("/ws") as websocket:
        # Send invalid JSON
        websocket.send_text("{invalid json")

        # Should still echo (current implementation)
        response = websocket.receive_text()
        assert "Echo:" in response


def test_receive_unknown_message_type(client):
    """Test handling of unknown message types."""
    with client.websocket_connect("/ws") as websocket:
        unknown_msg = json.dumps({"type": "unknown_action", "data": "test"})

        websocket.send_text(unknown_msg)
        response = websocket.receive_text()

        # Should still process (echo back)
        assert "Echo:" in response


def test_message_queue_ordering(client):
    """Test that messages are processed in order."""
    with client.websocket_connect("/ws") as websocket:
        # Send multiple messages
        messages = ["message_1", "message_2", "message_3"]

        for msg in messages:
            websocket.send_text(msg)

        # Receive and verify order
        for i, expected_msg in enumerate(messages):
            response = websocket.receive_text()
            assert expected_msg in response
            assert "Echo:" in response


# ==========================================
# Additional Edge Cases and Error Handling
# ==========================================


@pytest.mark.asyncio
async def test_broadcast_handles_disconnected_client(api_server):
    """Test that broadcasting handles disconnected clients gracefully."""
    # Create mock websockets - one will fail
    mock_ws_good = AsyncMock()
    mock_ws_bad = AsyncMock()
    mock_ws_bad.send_json.side_effect = Exception("Connection lost")

    api_server.websocket_connections = [mock_ws_good, mock_ws_bad]

    # Broadcast should handle the error and continue
    await api_server.broadcast_update("test", {"data": "value"})

    # Good client should receive message
    assert mock_ws_good.send_json.called

    # Bad client should be removed from connections
    assert len(api_server.websocket_connections) == 1
    assert mock_ws_bad not in api_server.websocket_connections


@pytest.mark.asyncio
async def test_broadcast_cleans_up_multiple_failed_connections(api_server):
    """Test that multiple failed connections are cleaned up."""
    # Create multiple failing connections
    failing_ws = [AsyncMock() for _ in range(3)]
    for ws in failing_ws:
        ws.send_json.side_effect = Exception("Failed")

    # One good connection
    good_ws = AsyncMock()

    api_server.websocket_connections = failing_ws + [good_ws]

    # Broadcast
    await api_server.broadcast_update("test", {"data": "value"})

    # Only good connection should remain
    assert len(api_server.websocket_connections) == 1
    assert good_ws in api_server.websocket_connections


def test_websocket_connection_tracking(client, api_server):
    """Test that connections are properly tracked in the server."""
    initial_count = len(api_server.websocket_connections)

    # Open connection
    ws1 = client.websocket_connect("/ws")
    ws1.__enter__()

    # Verify it's tracked
    assert len(api_server.websocket_connections) == initial_count + 1

    # Open another
    ws2 = client.websocket_connect("/ws")
    ws2.__enter__()

    assert len(api_server.websocket_connections) == initial_count + 2

    # Close first connection
    ws1.__exit__(None, None, None)

    # Should have one less
    assert len(api_server.websocket_connections) == initial_count + 1

    # Clean up
    ws2.__exit__(None, None, None)


@pytest.mark.asyncio
async def test_broadcast_message_structure(api_server):
    """Test that broadcast messages have correct structure."""
    mock_ws = AsyncMock()
    api_server.websocket_connections = [mock_ws]

    test_data = {"key": "value", "number": 42}
    await api_server.broadcast_update("custom_type", test_data)

    # Get the sent message
    sent_message = mock_ws.send_json.call_args[0][0]

    # Verify structure
    assert "type" in sent_message
    assert "timestamp" in sent_message
    assert "data" in sent_message

    # Verify content
    assert sent_message["type"] == "custom_type"
    assert sent_message["data"] == test_data

    # Verify timestamp is ISO format
    datetime.fromisoformat(sent_message["timestamp"])


def test_concurrent_message_sending(client):
    """Test sending messages concurrently from client."""
    with client.websocket_connect("/ws") as websocket:
        # Send multiple messages rapidly
        for i in range(10):
            websocket.send_text(f"rapid_message_{i}")

        # All should be echoed back
        received = []
        for i in range(10):
            response = websocket.receive_text()
            received.append(response)

        # Verify all messages were processed
        assert len(received) == 10
        for i, response in enumerate(received):
            assert f"rapid_message_{i}" in response
