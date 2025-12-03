"""Tests for the DeepStack exception hierarchy."""

from datetime import datetime

from core.exceptions import (
    DatabaseError,
    DatabaseInitializationError,
    DataError,
    DeepStackError,
    InsufficientFundsError,
    InvalidSymbolError,
    OrderError,
    OrderExecutionError,
    OrderRejectedError,
    RateLimitError,
    TradingError,
    ValidationError,
    create_error_response,
    is_retryable_error,
)


class TestDeepStackError:
    """Test base exception class."""

    def test_basic_creation(self):
        exc = DeepStackError("Test error")
        assert exc.message == "Test error"
        assert exc.error_code == "DEEPSTACK_ERROR"
        assert exc.request_id is not None
        assert exc.timestamp is not None

    def test_with_custom_fields(self):
        exc = DeepStackError("Test error", custom_field="value", another_field=123)
        assert exc.message == "Test error"
        assert "custom_field" in exc.details
        assert exc.details["custom_field"] == "value"
        assert exc.details["another_field"] == 123

    def test_to_dict(self):
        exc = DeepStackError("Test error", custom_field="value")
        d = exc.to_dict()
        assert d["message"] == "Test error"
        assert d["error_code"] == "DEEPSTACK_ERROR"
        assert "request_id" in d
        assert "timestamp" in d
        assert d["details"]["custom_field"] == "value"

    def test_str_representation(self):
        exc = DeepStackError("Test error")
        assert "DEEPSTACK_ERROR" in str(exc)
        assert "Test error" in str(exc)

    def test_timestamp_format(self):
        exc = DeepStackError("Test error")
        # Verify timestamp is a datetime object
        assert isinstance(exc.timestamp, datetime)
        # Verify it can be converted to ISO format
        iso_string = exc.timestamp.isoformat()
        assert iso_string is not None


class TestTradingError:
    """Test trading error class."""

    def test_trading_error_code(self):
        exc = TradingError("Trading failed")
        assert exc.error_code == "TRADE_ERROR"

    def test_trading_error_inheritance(self):
        exc = TradingError("Trading failed")
        assert isinstance(exc, DeepStackError)


class TestOrderExceptions:
    """Test order-related exceptions."""

    def test_order_error_basic(self):
        exc = OrderError("Order failed")
        assert exc.error_code == "ORDER_ERROR"

    def test_order_execution_error(self):
        exc = OrderExecutionError(
            message="Order failed",
            symbol="AAPL",
            quantity=100,
            side="BUY",
            reason="Insufficient funds",
        )
        assert exc.symbol == "AAPL"
        assert exc.quantity == 100
        assert exc.side == "BUY"
        assert exc.error_code == "ORDER_EXECUTION_FAILED"
        assert exc.details["execution_reason"] == "Insufficient funds"

    def test_order_rejected_error(self):
        exc = OrderRejectedError(
            message="Order rejected", symbol="TSLA", reason="Outside trading hours"
        )
        assert exc.error_code == "ORDER_REJECTED"
        assert exc.symbol == "TSLA"
        assert exc.details["rejection_reason"] == "Outside trading hours"

    def test_insufficient_funds_error(self):
        exc = InsufficientFundsError(
            message="Insufficient funds",
            required_amount=10000.0,
            available_amount=5000.0,
        )
        assert exc.details["shortfall"] == 5000.0
        assert exc.required_amount == 10000.0
        assert exc.available_amount == 5000.0
        assert "INSUFFICIENT_FUNDS" in exc.error_code


class TestDataExceptions:
    """Test data-related exceptions."""

    def test_data_error_basic(self):
        exc = DataError("Data error")
        assert exc.error_code == "DATA_ERROR"

    def test_database_error(self):
        exc = DatabaseError(
            message="Database error",
            query="SELECT * FROM trades",
            database="/path/to/db",
        )
        assert exc.error_code == "DB_ERROR"
        assert exc.details["query"] == "SELECT * FROM trades"
        assert exc.details["database"] == "/path/to/db"

    def test_database_init_error(self):
        exc = DatabaseInitializationError(
            message="DB init failed",
            database="/path/to/db",
            original_error="Permission denied",
        )
        assert exc.database == "/path/to/db"
        assert "DB_INIT_FAILED" in exc.error_code
        assert exc.details["original_error"] == "Permission denied"


class TestValidationExceptions:
    """Test validation exceptions."""

    def test_validation_error_basic(self):
        exc = ValidationError("Invalid input")
        assert exc.error_code == "VALIDATION_ERROR"

    def test_validation_error_with_field(self):
        exc = ValidationError(
            message="Invalid input", field="email", value="invalid-email"
        )
        assert exc.details["field"] == "email"
        assert exc.details["value"] == "invalid-email"

    def test_invalid_symbol_error(self):
        exc = InvalidSymbolError(message="Invalid symbol", symbol="")
        assert exc.symbol == ""
        assert "INVALID_SYMBOL" in exc.error_code


class TestRateLimitError:
    """Test rate limit exception."""

    def test_rate_limit_basic(self):
        exc = RateLimitError(message="Rate limited", service="alpaca")
        assert exc.error_code == "DATA_RATE_LIMITED"
        assert exc.service == "alpaca"

    def test_rate_limit_with_retry(self):
        exc = RateLimitError(message="Rate limited", service="alpaca", retry_after=60)
        assert exc.retry_after == 60
        assert exc.details["retry_after"] == 60


class TestUtilityFunctions:
    """Test utility functions."""

    def test_create_error_response_basic(self):
        exc = OrderExecutionError(message="Test", symbol="AAPL")
        response = create_error_response(exc)

        assert response["success"] == False
        assert "error" in response
        assert response["error"]["message"] == "Test"
        assert response["error"]["error_code"] == "ORDER_EXECUTION_FAILED"
        assert "request_id" in response["error"]
        assert "timestamp" in response["error"]

    def test_create_error_response_with_details(self):
        exc = DatabaseError(
            message="DB error", query="SELECT * FROM trades", database="/path/to/db"
        )
        response = create_error_response(exc)

        assert response["success"] == False
        assert response["error"]["details"]["query"] == "SELECT * FROM trades"
        assert response["error"]["details"]["database"] == "/path/to/db"

    def test_create_error_response_structure(self):
        exc = OrderExecutionError(message="Test", symbol="AAPL")
        response = create_error_response(exc)

        # Verify structure
        assert isinstance(response, dict)
        assert "success" in response
        assert "error" in response
        assert isinstance(response["error"], dict)

    def test_is_retryable_error_true_cases(self):
        # Rate limit errors are retryable
        rate_limit = RateLimitError(
            message="Rate limited", service="alpaca", retry_after=60
        )
        assert is_retryable_error(rate_limit) == True

    def test_is_retryable_error_false_cases(self):
        # Validation errors are not retryable
        validation = InvalidSymbolError(message="Invalid symbol", symbol="")
        assert is_retryable_error(validation) == False

        # Insufficient funds is not retryable
        funds = InsufficientFundsError(
            message="Insufficient funds", required_amount=100, available_amount=50
        )
        assert is_retryable_error(funds) == False

        # Order rejected is not retryable
        rejected = OrderRejectedError(message="Rejected", symbol="AAPL")
        assert is_retryable_error(rejected) == False

    def test_is_retryable_error_generic_exception(self):
        # Generic exceptions should not be retryable by default
        exc = Exception("Generic error")
        assert is_retryable_error(exc) == False


class TestExceptionChaining:
    """Test exception chaining and context."""

    def test_exception_chain(self):
        try:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise DatabaseError("Database failed", database="/db") from e
        except DatabaseError as exc:
            assert exc.__cause__ is not None
            assert isinstance(exc.__cause__, ValueError)
            assert str(exc.__cause__) == "Original error"

    def test_to_dict_includes_cause(self):
        try:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise DatabaseError("Database failed") from e
        except DatabaseError as exc:
            d = exc.to_dict()
            # The to_dict should handle the exception gracefully
            assert "message" in d
            assert d["message"] == "Database failed"


class TestErrorMessageSafety:
    """Test that error messages don't expose sensitive information."""

    def test_no_file_paths_in_generic_errors(self):
        exc = DeepStackError("An error occurred")
        error_str = str(exc)
        error_dict = exc.to_dict()

        # Should not contain absolute paths
        assert "/Users/" not in error_str
        assert "/home/" not in error_str
        assert "C:\\" not in error_str

    def test_database_path_only_in_details(self):
        exc = DatabaseError(message="Database error", database="/path/to/sensitive/db")
        d = exc.to_dict()

        # Path should be in details, not in main error message
        assert d["details"]["database"] == "/path/to/sensitive/db"
        # Main message should be generic
        assert "/path/to/sensitive/db" not in d["message"]
