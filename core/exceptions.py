"""
DeepStack Custom Exception Hierarchy

This module defines a comprehensive exception hierarchy for the DeepStack trading platform.
All exceptions inherit from DeepStackError and include error codes, request IDs, timestamps,
and optional details for comprehensive error tracking and debugging.

Exception Hierarchy:
    DeepStackError (base)
    ├── TradingError
    │   ├── OrderError
    │   │   ├── OrderRejectedError
    │   │   ├── OrderExecutionError
    │   │   ├── InsufficientFundsError
    │   │   └── MarketClosedError
    │   └── CircuitBreakerTrippedError
    ├── DataError
    │   ├── DatabaseError
    │   │   └── DatabaseInitializationError
    │   ├── MarketDataError
    │   │   └── QuoteUnavailableError
    │   └── RateLimitError
    ├── APIError
    │   ├── ExternalAPIError
    │   ├── AuthenticationError
    │   └── WebSocketError
    ├── ConfigurationError
    │   ├── MissingAPIKeyError
    │   └── InvalidConfigError
    ├── ValidationError
    │   ├── InvalidSymbolError
    │   └── InvalidQuantityError
    └── RiskError
        ├── PortfolioHeatExceededError
        └── PositionLimitExceededError
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class DeepStackError(Exception):
    """
    Base exception class for all DeepStack platform errors.

    Provides comprehensive error tracking with error codes, request IDs,
    timestamps, and optional details for debugging and logging.

    Attributes:
        message: Human-readable error message
        error_code: Machine-readable error code (e.g., "ORDER_REJECTED")
        request_id: Auto-generated UUID for tracking this specific error
        timestamp: UTC datetime when the error occurred
        details: Optional dictionary containing additional context

    Example:
        >>> raise DeepStackError(
        ...     message="An unexpected error occurred",
        ...     error_code="DEEPSTACK_GENERIC",
        ...     details={"component": "trading_engine"}
        ... )
    """

    default_error_code: str = "DEEPSTACK_ERROR"

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a DeepStackError.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code (uses class default if not provided)
            request_id: UUID for tracking (auto-generated if not provided)
            timestamp: When the error occurred (uses current UTC time if not provided)
            details: Additional context dictionary
            **kwargs: Additional keyword arguments added to details
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.default_error_code
        self.request_id = request_id or str(uuid.uuid4())
        self.timestamp = timestamp or datetime.now(timezone.utc)
        self.details = details or {}

        # Merge any additional kwargs into details
        if kwargs:
            self.details.update(kwargs)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the exception to a dictionary for JSON serialization.

        Returns:
            Dictionary representation of the error suitable for JSON encoding.

        Example:
            >>> error = DeepStackError("Test error", error_code="TEST_001")
            >>> error_dict = error.to_dict()
            >>> print(error_dict["error_code"])
            TEST_001
        """
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "error_code": self.error_code,
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details,
        }

    def __str__(self) -> str:
        """
        Return a human-readable string representation of the error.

        Returns:
            Formatted string with error code, message, and request ID.
        """
        return f"[{self.error_code}] {self.message} (request_id: {self.request_id})"

    def __repr__(self) -> str:
        """
        Return a detailed string representation for debugging.

        Returns:
            String representation showing class name and key attributes.
        """
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"error_code={self.error_code!r}, "
            f"request_id={self.request_id!r})"
        )


# =============================================================================
# Trading Errors
# =============================================================================


class TradingError(DeepStackError):
    """
    Base exception for all trading-related errors.

    Covers errors related to order execution, market operations,
    and trading engine failures.
    """

    default_error_code: str = "TRADE_ERROR"


class OrderError(TradingError):
    """
    Base exception for order-related errors.

    Covers errors that occur during order creation, submission,
    or execution.

    Attributes:
        symbol: Trading symbol associated with the order
        quantity: Order quantity
        order_type: Type of order (market, limit, etc.)
        side: Order side (buy/sell)
    """

    default_error_code: str = "ORDER_ERROR"

    def __init__(
        self,
        message: str,
        symbol: Optional[str] = None,
        quantity: Optional[float] = None,
        order_type: Optional[str] = None,
        side: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an OrderError.

        Args:
            message: Human-readable error message
            symbol: Trading symbol (e.g., "AAPL")
            quantity: Order quantity
            order_type: Order type (e.g., "market", "limit")
            side: Order side (e.g., "buy", "sell")
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if symbol:
            details["symbol"] = symbol
        if quantity is not None:
            details["quantity"] = quantity
        if order_type:
            details["order_type"] = order_type
        if side:
            details["side"] = side

        super().__init__(message, details=details, **kwargs)
        self.symbol = symbol
        self.quantity = quantity
        self.order_type = order_type
        self.side = side


class OrderRejectedError(OrderError):
    """
    Raised when an order is rejected by the broker or exchange.

    Common reasons include invalid symbols, price limits exceeded,
    or broker-side validations failing.

    Example:
        >>> raise OrderRejectedError(
        ...     message="Order rejected by broker",
        ...     symbol="AAPL",
        ...     quantity=100,
        ...     reason="Symbol not tradeable"
        ... )
    """

    default_error_code: str = "ORDER_REJECTED"

    def __init__(
        self, message: str, reason: Optional[str] = None, **kwargs: Any
    ) -> None:
        """
        Initialize an OrderRejectedError.

        Args:
            message: Human-readable error message
            reason: Specific reason for rejection
            **kwargs: Additional arguments passed to parent
        """
        if reason:
            kwargs.setdefault("details", {})
            if kwargs["details"] is None:
                kwargs["details"] = {}
            kwargs["details"]["rejection_reason"] = reason

        super().__init__(message, **kwargs)
        self.reason = reason


class OrderExecutionError(OrderError):
    """
    Raised when an order fails during execution.

    This occurs when an order is accepted but fails during
    the execution phase.

    Example:
        >>> raise OrderExecutionError(
        ...     message="Failed to execute market order",
        ...     symbol="AAPL",
        ...     quantity=100,
        ...     reason="Insufficient buying power"
        ... )
    """

    default_error_code: str = "ORDER_EXECUTION_FAILED"

    def __init__(
        self,
        message: str,
        reason: Optional[str] = None,
        order_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an OrderExecutionError.

        Args:
            message: Human-readable error message
            reason: Specific reason for execution failure
            order_id: The order ID that failed
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if reason:
            details["execution_reason"] = reason
        if order_id:
            details["order_id"] = order_id

        super().__init__(message, details=details, **kwargs)
        self.reason = reason
        self.order_id = order_id


class InsufficientFundsError(OrderError):
    """
    Raised when there are insufficient funds to execute an order.

    Attributes:
        required_amount: Amount required for the order
        available_amount: Amount available in the account

    Example:
        >>> raise InsufficientFundsError(
        ...     message="Insufficient funds for order",
        ...     symbol="AAPL",
        ...     quantity=100,
        ...     required_amount=15000.00,
        ...     available_amount=10000.00
        ... )
    """

    default_error_code: str = "ORDER_INSUFFICIENT_FUNDS"

    def __init__(
        self,
        message: str,
        required_amount: Optional[float] = None,
        available_amount: Optional[float] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an InsufficientFundsError.

        Args:
            message: Human-readable error message
            required_amount: Amount required for the order
            available_amount: Amount available in the account
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if required_amount is not None:
            details["required_amount"] = required_amount
        if available_amount is not None:
            details["available_amount"] = available_amount
        if required_amount is not None and available_amount is not None:
            details["shortfall"] = required_amount - available_amount

        super().__init__(message, details=details, **kwargs)
        self.required_amount = required_amount
        self.available_amount = available_amount


class MarketClosedError(OrderError):
    """
    Raised when attempting to trade while the market is closed.

    Attributes:
        market: The market that is closed
        next_open: When the market will next open

    Example:
        >>> raise MarketClosedError(
        ...     message="Cannot execute order - market is closed",
        ...     symbol="AAPL",
        ...     market="NYSE",
        ...     next_open="2024-01-02T09:30:00-05:00"
        ... )
    """

    default_error_code: str = "ORDER_MARKET_CLOSED"

    def __init__(
        self,
        message: str,
        market: Optional[str] = None,
        next_open: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a MarketClosedError.

        Args:
            message: Human-readable error message
            market: Name of the closed market
            next_open: ISO timestamp of next market open
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if market:
            details["market"] = market
        if next_open:
            details["next_open"] = next_open

        super().__init__(message, details=details, **kwargs)
        self.market = market
        self.next_open = next_open


class CircuitBreakerTrippedError(TradingError):
    """
    Raised when the circuit breaker is tripped due to risk limits.

    The circuit breaker prevents trading when certain risk thresholds
    are exceeded or during unusual market conditions.

    Attributes:
        trigger: What triggered the circuit breaker
        cooldown_seconds: How long until trading resumes

    Example:
        >>> raise CircuitBreakerTrippedError(
        ...     message="Circuit breaker tripped - daily loss limit exceeded",
        ...     trigger="daily_loss_limit",
        ...     cooldown_seconds=3600
        ... )
    """

    default_error_code: str = "TRADE_CIRCUIT_BREAKER_TRIPPED"

    def __init__(
        self,
        message: str,
        trigger: Optional[str] = None,
        cooldown_seconds: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a CircuitBreakerTrippedError.

        Args:
            message: Human-readable error message
            trigger: What triggered the circuit breaker
            cooldown_seconds: Seconds until trading can resume
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if trigger:
            details["trigger"] = trigger
        if cooldown_seconds is not None:
            details["cooldown_seconds"] = cooldown_seconds

        super().__init__(message, details=details, **kwargs)
        self.trigger = trigger
        self.cooldown_seconds = cooldown_seconds


# =============================================================================
# Data Errors
# =============================================================================


class DataError(DeepStackError):
    """
    Base exception for all data-related errors.

    Covers errors related to data retrieval, storage, and processing.
    """

    default_error_code: str = "DATA_ERROR"


class DatabaseError(DataError):
    """
    Base exception for database-related errors.

    Covers errors related to database connections, queries,
    and transactions.

    Attributes:
        database: Name or identifier of the database
        query: The query that caused the error (if applicable)
    """

    default_error_code: str = "DB_ERROR"

    def __init__(
        self,
        message: str,
        database: Optional[str] = None,
        query: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a DatabaseError.

        Args:
            message: Human-readable error message
            database: Database name or identifier
            query: The problematic query
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if database:
            details["database"] = database
        if query:
            details["query"] = query

        super().__init__(message, details=details, **kwargs)
        self.database = database
        self.query = query


class DatabaseInitializationError(DatabaseError):
    """
    Raised when database initialization fails.

    This can occur during schema creation, migration,
    or initial connection setup.

    Example:
        >>> raise DatabaseInitializationError(
        ...     message="Failed to initialize database schema",
        ...     database="paper_trading.db",
        ...     reason="Migration script failed"
        ... )
    """

    default_error_code: str = "DB_INIT_FAILED"

    def __init__(
        self,
        message: str,
        reason: Optional[str] = None,
        original_error: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a DatabaseInitializationError.

        Args:
            message: Human-readable error message
            reason: Specific reason for initialization failure
            original_error: Original error message from the underlying system
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if reason:
            details["init_reason"] = reason
        if original_error:
            details["original_error"] = original_error

        super().__init__(message, details=details, **kwargs)
        self.reason = reason
        self.original_error = original_error


class MarketDataError(DataError):
    """
    Base exception for market data errors.

    Covers errors related to fetching and processing market data
    such as quotes, bars, and other financial data.

    Attributes:
        symbol: The symbol for which data was requested
        data_type: Type of market data (quote, bar, etc.)
    """

    default_error_code: str = "DATA_MARKET_ERROR"

    def __init__(
        self,
        message: str,
        symbol: Optional[str] = None,
        data_type: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a MarketDataError.

        Args:
            message: Human-readable error message
            symbol: Trading symbol
            data_type: Type of market data requested
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if symbol:
            details["symbol"] = symbol
        if data_type:
            details["data_type"] = data_type

        super().__init__(message, details=details, **kwargs)
        self.symbol = symbol
        self.data_type = data_type


class QuoteUnavailableError(MarketDataError):
    """
    Raised when a market quote is unavailable.

    This can occur during market hours due to data feed issues
    or for symbols that are not supported.

    Example:
        >>> raise QuoteUnavailableError(
        ...     message="Quote unavailable for symbol",
        ...     symbol="INVALID",
        ...     reason="Symbol not found"
        ... )
    """

    default_error_code: str = "DATA_QUOTE_UNAVAILABLE"

    def __init__(
        self, message: str, reason: Optional[str] = None, **kwargs: Any
    ) -> None:
        """
        Initialize a QuoteUnavailableError.

        Args:
            message: Human-readable error message
            reason: Specific reason quote is unavailable
            **kwargs: Additional arguments passed to parent
        """
        kwargs["data_type"] = "quote"
        if reason:
            kwargs.setdefault("details", {})
            if kwargs["details"] is None:
                kwargs["details"] = {}
            kwargs["details"]["unavailable_reason"] = reason

        super().__init__(message, **kwargs)
        self.reason = reason


class RateLimitError(DataError):
    """
    Raised when an API rate limit is exceeded.

    Attributes:
        service: The service that rate limited the request
        retry_after: Seconds until the rate limit resets

    Example:
        >>> raise RateLimitError(
        ...     message="Rate limit exceeded for market data API",
        ...     service="alpaca",
        ...     retry_after=60
        ... )
    """

    default_error_code: str = "DATA_RATE_LIMITED"

    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        retry_after: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a RateLimitError.

        Args:
            message: Human-readable error message
            service: Name of the rate-limited service
            retry_after: Seconds until rate limit resets
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if service:
            details["service"] = service
        if retry_after is not None:
            details["retry_after"] = retry_after

        super().__init__(message, details=details, **kwargs)
        self.service = service
        self.retry_after = retry_after


# =============================================================================
# API Errors
# =============================================================================


class APIError(DeepStackError):
    """
    Base exception for all API-related errors.

    Covers errors related to external API calls, authentication,
    and WebSocket connections.

    Attributes:
        status_code: HTTP status code (if applicable)
        endpoint: The API endpoint that was called
    """

    default_error_code: str = "API_ERROR"

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        endpoint: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an APIError.

        Args:
            message: Human-readable error message
            status_code: HTTP status code
            endpoint: API endpoint URL
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if status_code is not None:
            details["status_code"] = status_code
        if endpoint:
            details["endpoint"] = endpoint

        super().__init__(message, details=details, **kwargs)
        self.status_code = status_code
        self.endpoint = endpoint


class ExternalAPIError(APIError):
    """
    Raised when an external API call fails.

    Used for errors from third-party services like brokers,
    market data providers, or other external systems.

    Attributes:
        service: Name of the external service
        response_body: Raw response body from the service

    Example:
        >>> raise ExternalAPIError(
        ...     message="Alpaca API returned an error",
        ...     service="alpaca",
        ...     status_code=400,
        ...     response_body='{"message": "Invalid request"}'
        ... )
    """

    default_error_code: str = "API_EXTERNAL_ERROR"

    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        response_body: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an ExternalAPIError.

        Args:
            message: Human-readable error message
            service: Name of the external service
            response_body: Raw response body
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if service:
            details["service"] = service
        if response_body:
            details["response_body"] = response_body

        super().__init__(message, details=details, **kwargs)
        self.service = service
        self.response_body = response_body


class AuthenticationError(APIError):
    """
    Raised when API authentication fails.

    This can occur due to invalid credentials, expired tokens,
    or missing authentication headers.

    Example:
        >>> raise AuthenticationError(
        ...     message="API authentication failed",
        ...     service="alpaca",
        ...     reason="Invalid API key"
        ... )
    """

    default_error_code: str = "API_AUTH_FAILED"

    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        reason: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an AuthenticationError.

        Args:
            message: Human-readable error message
            service: Name of the service
            reason: Specific reason for auth failure
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if service:
            details["service"] = service
        if reason:
            details["auth_reason"] = reason

        # Auth errors are typically 401
        kwargs.setdefault("status_code", 401)

        super().__init__(message, details=details, **kwargs)
        self.service = service
        self.reason = reason


class WebSocketError(APIError):
    """
    Raised when a WebSocket connection fails.

    Covers errors during connection establishment, message handling,
    or unexpected disconnections.

    Attributes:
        ws_url: WebSocket URL
        close_code: WebSocket close code (if applicable)

    Example:
        >>> raise WebSocketError(
        ...     message="WebSocket connection closed unexpectedly",
        ...     ws_url="wss://stream.data.alpaca.markets/v2/iex",
        ...     close_code=1006
        ... )
    """

    default_error_code: str = "API_WEBSOCKET_ERROR"

    def __init__(
        self,
        message: str,
        ws_url: Optional[str] = None,
        close_code: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a WebSocketError.

        Args:
            message: Human-readable error message
            ws_url: WebSocket URL
            close_code: WebSocket close code
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if ws_url:
            details["ws_url"] = ws_url
        if close_code is not None:
            details["close_code"] = close_code

        super().__init__(message, details=details, **kwargs)
        self.ws_url = ws_url
        self.close_code = close_code


# =============================================================================
# Configuration Errors
# =============================================================================


class ConfigurationError(DeepStackError):
    """
    Base exception for configuration-related errors.

    Covers errors related to missing or invalid configuration settings.

    Attributes:
        config_key: The configuration key that caused the error
    """

    default_error_code: str = "CONFIG_ERROR"

    def __init__(
        self, message: str, config_key: Optional[str] = None, **kwargs: Any
    ) -> None:
        """
        Initialize a ConfigurationError.

        Args:
            message: Human-readable error message
            config_key: The problematic configuration key
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if config_key:
            details["config_key"] = config_key

        super().__init__(message, details=details, **kwargs)
        self.config_key = config_key


class MissingAPIKeyError(ConfigurationError):
    """
    Raised when a required API key is missing.

    Example:
        >>> raise MissingAPIKeyError(
        ...     message="Alpaca API key not configured",
        ...     service="alpaca",
        ...     key_name="ALPACA_API_KEY"
        ... )
    """

    default_error_code: str = "CONFIG_MISSING_API_KEY"

    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        key_name: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a MissingAPIKeyError.

        Args:
            message: Human-readable error message
            service: Name of the service requiring the key
            key_name: Environment variable or config key name
            **kwargs: Additional arguments passed to parent
        """
        kwargs["config_key"] = key_name
        details = kwargs.pop("details", {}) or {}
        if service:
            details["service"] = service
        if key_name:
            details["key_name"] = key_name

        super().__init__(message, details=details, **kwargs)
        self.service = service
        self.key_name = key_name


class InvalidConfigError(ConfigurationError):
    """
    Raised when a configuration value is invalid.

    Example:
        >>> raise InvalidConfigError(
        ...     message="Invalid risk tolerance value",
        ...     config_key="RISK_TOLERANCE",
        ...     expected="float between 0 and 1",
        ...     actual="invalid"
        ... )
    """

    default_error_code: str = "CONFIG_INVALID"

    def __init__(
        self,
        message: str,
        expected: Optional[str] = None,
        actual: Optional[Any] = None,
        config_value: Optional[Any] = None,
        original_error: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an InvalidConfigError.

        Args:
            message: Human-readable error message
            expected: Description of expected value
            actual: The actual invalid value
            config_value: The configuration value that was invalid
            original_error: Original error message from the underlying system
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if expected:
            details["expected"] = expected
        if actual is not None:
            details["actual"] = str(actual)
        if config_value is not None:
            details["config_value"] = str(config_value)
        if original_error:
            details["original_error"] = original_error

        super().__init__(message, details=details, **kwargs)
        self.expected = expected
        self.actual = actual
        self.config_value = config_value
        self.original_error = original_error


# =============================================================================
# Validation Errors
# =============================================================================


class ValidationError(DeepStackError):
    """
    Base exception for input validation errors.

    Covers errors related to invalid input parameters.

    Attributes:
        field: The field that failed validation
        value: The invalid value
    """

    default_error_code: str = "VALIDATION_ERROR"

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a ValidationError.

        Args:
            message: Human-readable error message
            field: Name of the invalid field
            value: The invalid value
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)

        super().__init__(message, details=details, **kwargs)
        self.field = field
        self.value = value


class InvalidSymbolError(ValidationError):
    """
    Raised when an invalid trading symbol is provided.

    Example:
        >>> raise InvalidSymbolError(
        ...     message="Invalid trading symbol",
        ...     symbol="123INVALID",
        ...     reason="Symbol contains invalid characters"
        ... )
    """

    default_error_code: str = "VALIDATION_INVALID_SYMBOL"

    def __init__(
        self,
        message: str,
        symbol: Optional[str] = None,
        reason: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an InvalidSymbolError.

        Args:
            message: Human-readable error message
            symbol: The invalid symbol
            reason: Why the symbol is invalid
            **kwargs: Additional arguments passed to parent
        """
        kwargs["field"] = "symbol"
        kwargs["value"] = symbol
        details = kwargs.pop("details", {}) or {}
        if reason:
            details["validation_reason"] = reason

        super().__init__(message, details=details, **kwargs)
        self.symbol = symbol
        self.reason = reason


class InvalidQuantityError(ValidationError):
    """
    Raised when an invalid quantity is provided.

    Example:
        >>> raise InvalidQuantityError(
        ...     message="Invalid order quantity",
        ...     quantity=-100,
        ...     reason="Quantity must be positive"
        ... )
    """

    default_error_code: str = "VALIDATION_INVALID_QUANTITY"

    def __init__(
        self,
        message: str,
        quantity: Optional[float] = None,
        reason: Optional[str] = None,
        min_quantity: Optional[float] = None,
        max_quantity: Optional[float] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize an InvalidQuantityError.

        Args:
            message: Human-readable error message
            quantity: The invalid quantity
            reason: Why the quantity is invalid
            min_quantity: Minimum allowed quantity
            max_quantity: Maximum allowed quantity
            **kwargs: Additional arguments passed to parent
        """
        kwargs["field"] = "quantity"
        kwargs["value"] = quantity
        details = kwargs.pop("details", {}) or {}
        if reason:
            details["validation_reason"] = reason
        if min_quantity is not None:
            details["min_quantity"] = min_quantity
        if max_quantity is not None:
            details["max_quantity"] = max_quantity

        super().__init__(message, details=details, **kwargs)
        self.quantity = quantity
        self.reason = reason
        self.min_quantity = min_quantity
        self.max_quantity = max_quantity


# =============================================================================
# Risk Errors
# =============================================================================


class RiskError(DeepStackError):
    """
    Base exception for risk management errors.

    Covers errors related to risk limits, position limits,
    and portfolio constraints.
    """

    default_error_code: str = "RISK_ERROR"


class PortfolioHeatExceededError(RiskError):
    """
    Raised when portfolio heat (total risk) exceeds limits.

    Portfolio heat represents the total risk exposure across
    all positions as a percentage of portfolio value.

    Attributes:
        current_heat: Current portfolio heat percentage
        max_heat: Maximum allowed portfolio heat

    Example:
        >>> raise PortfolioHeatExceededError(
        ...     message="Portfolio heat limit exceeded",
        ...     current_heat=0.25,
        ...     max_heat=0.20
        ... )
    """

    default_error_code: str = "RISK_PORTFOLIO_HEAT_EXCEEDED"

    def __init__(
        self,
        message: str,
        current_heat: Optional[float] = None,
        max_heat: Optional[float] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a PortfolioHeatExceededError.

        Args:
            message: Human-readable error message
            current_heat: Current portfolio heat (0-1)
            max_heat: Maximum allowed heat (0-1)
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if current_heat is not None:
            details["current_heat"] = current_heat
            details["current_heat_pct"] = f"{current_heat * 100:.1f}%"
        if max_heat is not None:
            details["max_heat"] = max_heat
            details["max_heat_pct"] = f"{max_heat * 100:.1f}%"
        if current_heat is not None and max_heat is not None:
            details["excess"] = current_heat - max_heat
            details["excess_pct"] = f"{(current_heat - max_heat) * 100:.1f}%"

        super().__init__(message, details=details, **kwargs)
        self.current_heat = current_heat
        self.max_heat = max_heat


class PositionLimitExceededError(RiskError):
    """
    Raised when a position limit is exceeded.

    Position limits prevent excessive concentration in
    a single symbol or sector.

    Attributes:
        symbol: The symbol with the position limit issue
        current_size: Current position size
        max_size: Maximum allowed position size

    Example:
        >>> raise PositionLimitExceededError(
        ...     message="Maximum position size exceeded for AAPL",
        ...     symbol="AAPL",
        ...     current_size=1000,
        ...     max_size=500
        ... )
    """

    default_error_code: str = "RISK_POSITION_LIMIT_EXCEEDED"

    def __init__(
        self,
        message: str,
        symbol: Optional[str] = None,
        current_size: Optional[float] = None,
        max_size: Optional[float] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize a PositionLimitExceededError.

        Args:
            message: Human-readable error message
            symbol: Symbol with the position limit issue
            current_size: Current position size
            max_size: Maximum allowed position size
            **kwargs: Additional arguments passed to parent
        """
        details = kwargs.pop("details", {}) or {}
        if symbol:
            details["symbol"] = symbol
        if current_size is not None:
            details["current_size"] = current_size
        if max_size is not None:
            details["max_size"] = max_size
        if current_size is not None and max_size is not None:
            details["excess_size"] = current_size - max_size

        super().__init__(message, details=details, **kwargs)
        self.symbol = symbol
        self.current_size = current_size
        self.max_size = max_size


# =============================================================================
# Exception Factory and Utilities
# =============================================================================


def create_error_response(error: DeepStackError) -> Dict[str, Any]:
    """
    Create a standardized error response dictionary from a DeepStackError.

    Useful for API responses and logging.

    Args:
        error: The DeepStackError instance

    Returns:
        Dictionary suitable for JSON API responses

    Example:
        >>> try:
        ...     raise OrderRejectedError("Order rejected", symbol="AAPL")
        ... except DeepStackError as e:
        ...     response = create_error_response(e)
        ...     print(response["success"])
        False
    """
    return {"success": False, "error": error.to_dict()}


def is_retryable_error(error: Exception) -> bool:
    """
    Determine if an error is potentially retryable.

    Args:
        error: The exception to check

    Returns:
        True if the error might succeed on retry, False otherwise

    Example:
        >>> error = RateLimitError("Rate limited", retry_after=60)
        >>> is_retryable_error(error)
        True
    """
    retryable_types = (
        RateLimitError,
        WebSocketError,
        QuoteUnavailableError,
    )

    if isinstance(error, retryable_types):
        return True

    if isinstance(error, ExternalAPIError):
        # 5xx errors and some 4xx errors may be retryable
        if error.status_code is not None:
            return error.status_code >= 500 or error.status_code == 429

    return False


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    # Base
    "DeepStackError",
    # Trading
    "TradingError",
    "OrderError",
    "OrderRejectedError",
    "OrderExecutionError",
    "InsufficientFundsError",
    "MarketClosedError",
    "CircuitBreakerTrippedError",
    # Data
    "DataError",
    "DatabaseError",
    "DatabaseInitializationError",
    "MarketDataError",
    "QuoteUnavailableError",
    "RateLimitError",
    # API
    "APIError",
    "ExternalAPIError",
    "AuthenticationError",
    "WebSocketError",
    # Configuration
    "ConfigurationError",
    "MissingAPIKeyError",
    "InvalidConfigError",
    # Validation
    "ValidationError",
    "InvalidSymbolError",
    "InvalidQuantityError",
    # Risk
    "RiskError",
    "PortfolioHeatExceededError",
    "PositionLimitExceededError",
    # Utilities
    "create_error_response",
    "is_retryable_error",
]
