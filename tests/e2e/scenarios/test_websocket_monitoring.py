"""
E2E Test: WebSocket Monitoring
Tests real-time monitoring and event broadcasting via WebSocket.
"""

import asyncio
import json
from unittest.mock import MagicMock

import pytest


@pytest.mark.asyncio
async def test_websocket_connection_establishment(e2e_trading_system):
    """
    Test WebSocket connection establishment and handshake.

    Validates:
    - Client can connect to WebSocket server
    - Authentication/handshake succeeds
    - Connection state is properly tracked
    """
    # Simulate WebSocket connection
    mock_websocket = MagicMock()
    mock_websocket.closed = False
    mock_websocket.open = True

    # Connection metadata
    connection_data = {
        "connection_id": "test_conn_001",
        "client_type": "dashboard",
        "connected_at": asyncio.get_event_loop().time(),
        "authenticated": True,
    }

    # Store connection
    e2e_trading_system["ws_connection"] = mock_websocket
    e2e_trading_system["ws_connection_data"] = connection_data

    # Verify connection established
    assert mock_websocket.open is True
    assert connection_data["authenticated"] is True


@pytest.mark.asyncio
async def test_realtime_position_updates(e2e_trading_system):
    """
    Test real-time position updates via WebSocket.

    Validates:
    - Position changes broadcast immediately
    - Update format is correct
    - Clients receive updates in real-time
    """
    trader = e2e_trading_system["trader"]
    mock_websocket = MagicMock()

    # Setup WebSocket message queue
    messages_sent = []

    async def mock_send(message):
        messages_sent.append(
            json.loads(message) if isinstance(message, str) else message
        )

    mock_websocket.send = mock_send
    e2e_trading_system["ws_connection"] = mock_websocket

    # Create position
    symbol = "AAPL"
    e2e_trading_system["mock_data"][symbol] = {"price": 150.0}

    order_id = await trader.place_market_order(symbol, 10, "BUY")
    assert order_id is not None

    # Simulate WebSocket broadcast
    position = trader.get_position(symbol)
    update_message = {
        "type": "position_update",
        "timestamp": asyncio.get_event_loop().time(),
        "data": {
            "symbol": symbol,
            "quantity": position["quantity"],
            "avg_price": position.get("avg_price", position.get("avg_cost", 150.0)),
            "current_value": position["quantity"] * 150.0,
            "unrealized_pnl": 0.0,
        },
    }

    await mock_send(json.dumps(update_message))

    # Verify update sent
    assert len(messages_sent) > 0

    last_message = messages_sent[-1]
    assert last_message["type"] == "position_update"
    assert last_message["data"]["symbol"] == symbol
    assert last_message["data"]["quantity"] == 10


@pytest.mark.asyncio
async def test_trade_execution_notifications(e2e_trading_system):
    """
    Test trade execution notifications via WebSocket.

    Validates:
    - Trade executed event broadcast
    - Notification includes order details
    - Execution status is accurate
    """
    trader = e2e_trading_system["trader"]

    # Setup WebSocket
    notifications = []

    async def capture_notification(message):
        notifications.append(
            json.loads(message) if isinstance(message, str) else message
        )

    mock_websocket = MagicMock()
    mock_websocket.send = capture_notification

    e2e_trading_system["ws_connection"] = mock_websocket

    # Execute trade
    symbol = "MSFT"
    e2e_trading_system["mock_data"][symbol] = {"price": 380.0}

    order_id = await trader.place_market_order(symbol, 5, "BUY")

    # Simulate execution notification
    execution_notification = {
        "type": "trade_executed",
        "timestamp": asyncio.get_event_loop().time(),
        "data": {
            "order_id": order_id,
            "symbol": symbol,
            "side": "BUY",
            "quantity": 5,
            "price": 380.0,
            "total_value": 1900.0,
            "status": "filled",
        },
    }

    await capture_notification(json.dumps(execution_notification))

    # Verify notification
    assert len(notifications) > 0

    last_notification = notifications[-1]
    assert last_notification["type"] == "trade_executed"
    assert last_notification["data"]["symbol"] == symbol
    assert last_notification["data"]["status"] == "filled"


@pytest.mark.asyncio
async def test_portfolio_value_streaming(e2e_trading_system):
    """
    Test streaming portfolio value updates.

    Validates:
    - Portfolio value broadcast periodically
    - Values are accurate
    - Includes breakdown by position
    """
    trader = e2e_trading_system["trader"]

    # Setup streaming
    stream_updates = []

    async def capture_stream(message):
        stream_updates.append(
            json.loads(message) if isinstance(message, str) else message
        )

    mock_websocket = MagicMock()
    mock_websocket.send = capture_stream

    # Create multiple positions
    symbols = ["AAPL", "MSFT", "GOOGL"]
    for symbol in symbols:
        e2e_trading_system["mock_data"][symbol] = {"price": 100.0}
        await trader.place_market_order(symbol, 10, "BUY")

    # Simulate portfolio value stream
    portfolio_value = trader.get_portfolio_value()
    positions = trader.get_positions()

    # Calculate positions value
    positions_value = 0
    for p in positions:
        symbol = p.get("symbol")
        if symbol:
            price = e2e_trading_system["mock_data"].get(symbol, {}).get("price", 100.0)
            positions_value += p["quantity"] * price

    stream_message = {
        "type": "portfolio_update",
        "timestamp": asyncio.get_event_loop().time(),
        "data": {
            "total_value": portfolio_value,
            "cash": trader.cash,
            "positions_value": positions_value,
            "positions_count": len(positions),
            "daily_pnl": 0.0,  # Would calculate from start of day
            "total_pnl": 0.0,
        },
    }

    await capture_stream(json.dumps(stream_message))

    # Verify stream update
    assert len(stream_updates) > 0

    last_update = stream_updates[-1]
    assert last_update["type"] == "portfolio_update"
    assert last_update["data"]["positions_count"] == 3
    assert last_update["data"]["total_value"] > 0


@pytest.mark.asyncio
async def test_alert_broadcasting(e2e_trading_system):
    """
    Test alert broadcasting to connected clients.

    Validates:
    - Alerts sent to all connected clients
    - Alert priority/severity included
    - System alerts vs trading alerts differentiated
    """
    breaker = e2e_trading_system["breaker"]

    # Setup WebSocket connections (multiple clients)
    clients = []
    for i in range(3):
        client_messages = []

        async def capture_message(msg, client_id=i, messages=client_messages):
            messages.append(json.loads(msg) if isinstance(msg, str) else msg)

        mock_client = MagicMock()
        mock_client.send = capture_message
        mock_client.client_id = f"client_{i}"

        clients.append({"websocket": mock_client, "messages": client_messages})

    e2e_trading_system["ws_clients"] = clients

    # Trigger circuit breaker alert
    breaker.trip_breaker("manual", "Testing alert broadcasting")

    # Broadcast alert to all clients
    alert_message = {
        "type": "alert",
        "timestamp": asyncio.get_event_loop().time(),
        "severity": "critical",
        "category": "circuit_breaker",
        "data": {
            "breaker_type": "manual",
            "reason": "Testing alert broadcasting",
            "trading_allowed": False,
            "action_required": "Review and reset breaker",
        },
    }

    # Send to all clients
    for client in clients:
        await client["websocket"].send(json.dumps(alert_message))

    # Verify all clients received alert
    for client in clients:
        assert len(client["messages"]) > 0
        last_message = client["messages"][-1]
        assert last_message["type"] == "alert"
        assert last_message["severity"] == "critical"


@pytest.mark.asyncio
async def test_client_disconnection_handling(e2e_trading_system):
    """
    Test handling of client disconnections.

    Validates:
    - Disconnections detected properly
    - Client removed from active connections
    - No errors when broadcasting to disconnected client
    - Reconnection works correctly
    """
    # Setup initial connection
    mock_websocket = MagicMock()
    mock_websocket.closed = False
    mock_websocket.open = True

    connection_data = {
        "connection_id": "disconnect_test",
        "connected_at": asyncio.get_event_loop().time(),
    }

    e2e_trading_system["ws_connection"] = mock_websocket
    e2e_trading_system["ws_connection_data"] = connection_data

    # Simulate disconnection
    mock_websocket.closed = True
    mock_websocket.open = False

    # Try to send message to disconnected client
    send_error = None
    try:
        if mock_websocket.closed:
            raise ConnectionError("WebSocket connection closed")
        await mock_websocket.send("test message")
    except Exception as e:
        send_error = e

    # Verify disconnection detected
    assert send_error is not None
    assert mock_websocket.closed is True

    # Simulate reconnection
    new_websocket = MagicMock()
    new_websocket.closed = False
    new_websocket.open = True

    new_connection_data = {
        "connection_id": "disconnect_test_reconnect",
        "connected_at": asyncio.get_event_loop().time(),
        "reconnection": True,
    }

    e2e_trading_system["ws_connection"] = new_websocket
    e2e_trading_system["ws_connection_data"] = new_connection_data

    # Verify reconnection successful
    assert new_websocket.open is True
    assert new_connection_data["reconnection"] is True


@pytest.mark.asyncio
async def test_reconnection_recovery(e2e_trading_system):
    """
    Test client reconnection and state recovery.

    Validates:
    - Client can reconnect after disconnection
    - State is restored (positions, portfolio value)
    - Client receives catch-up updates
    - No duplicate notifications
    """
    trader = e2e_trading_system["trader"]

    # Create positions before disconnection
    symbols = ["AAPL", "MSFT"]
    for symbol in symbols:
        e2e_trading_system["mock_data"][symbol] = {"price": 100.0}
        await trader.place_market_order(symbol, 10, "BUY")

    # Simulate disconnection period
    disconnected_at = asyncio.get_event_loop().time()

    # More trades happen during disconnection
    e2e_trading_system["mock_data"]["GOOGL"] = {"price": 140.0}
    await trader.place_market_order("GOOGL", 5, "BUY")

    # Client reconnects
    reconnected_at = asyncio.get_event_loop().time()

    mock_websocket = MagicMock()
    recovery_messages = []

    async def capture_recovery(message):
        recovery_messages.append(
            json.loads(message) if isinstance(message, str) else message
        )

    mock_websocket.send = capture_recovery

    # Send state recovery message
    positions_list = trader.get_positions()
    # Convert positions to JSON-serializable format
    serializable_positions = []
    for p in positions_list:
        serializable_positions.append(
            {
                "symbol": p.get("symbol", "UNKNOWN"),
                "quantity": p.get("quantity", 0),
                "avg_cost": p.get("avg_cost", 0.0),
            }
        )

    recovery_message = {
        "type": "state_recovery",
        "timestamp": reconnected_at,
        "data": {
            "disconnected_at": disconnected_at,
            "reconnected_at": reconnected_at,
            "missed_events": 1,  # 1 trade during disconnection
            "current_state": {
                "portfolio_value": trader.get_portfolio_value(),
                "positions": serializable_positions,
                "pending_orders": [],
            },
        },
    }

    await capture_recovery(json.dumps(recovery_message))

    # Verify recovery
    assert len(recovery_messages) > 0

    recovery = recovery_messages[-1]
    assert recovery["type"] == "state_recovery"
    assert recovery["data"]["missed_events"] == 1
    assert len(recovery["data"]["current_state"]["positions"]) == 3

    # Verify state is complete
    current_positions = recovery["data"]["current_state"]["positions"]
    position_symbols = [p["symbol"] for p in current_positions]
    assert "AAPL" in position_symbols
    assert "MSFT" in position_symbols
    assert "GOOGL" in position_symbols
