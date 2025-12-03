"""Integration tests for error handling across the system."""

from core.exceptions import (
    DatabaseError,
    InsufficientFundsError,
    InvalidSymbolError,
    OrderExecutionError,
    RateLimitError,
    create_error_response,
)


class TestErrorPropagation:
    """Test that errors propagate correctly through the system."""

    def test_order_execution_error_propagation(self):
        """Test order execution error creates proper response."""
        # Simulate an order execution failure
        error = OrderExecutionError(
            message="Failed to execute order",
            symbol="AAPL",
            quantity=100,
            side="BUY",
            reason="Market closed",
        )

        response = create_error_response(error)

        # Verify response structure
        assert response["success"] == False
        assert response["error"]["error_code"] == "ORDER_EXECUTION_FAILED"
        assert response["error"]["details"]["symbol"] == "AAPL"
        assert response["error"]["details"]["quantity"] == 100
        assert response["error"]["details"]["side"] == "BUY"
        assert response["error"]["details"]["execution_reason"] == "Market closed"

    def test_insufficient_funds_error_propagation(self):
        """Test insufficient funds error creates detailed response."""
        error = InsufficientFundsError(
            message="Not enough funds",
            symbol="TSLA",
            quantity=50,
            required_amount=25000.0,
            available_amount=10000.0,
        )

        response = create_error_response(error)

        # Verify calculations
        assert response["success"] == False
        assert response["error"]["error_code"] == "ORDER_INSUFFICIENT_FUNDS"
        assert response["error"]["details"]["required_amount"] == 25000.0
        assert response["error"]["details"]["available_amount"] == 10000.0
        assert response["error"]["details"]["shortfall"] == 15000.0

    def test_validation_error_propagation(self):
        """Test validation error creates clear response."""
        error = InvalidSymbolError(
            message="Invalid trading symbol", symbol="", reason="Symbol cannot be empty"
        )

        response = create_error_response(error)

        # Verify validation details
        assert response["success"] == False
        assert response["error"]["error_code"] == "VALIDATION_INVALID_SYMBOL"
        assert response["error"]["details"]["field"] == "symbol"
        assert response["error"]["details"]["value"] == ""
        assert (
            response["error"]["details"]["validation_reason"]
            == "Symbol cannot be empty"
        )


class TestErrorContextPreservation:
    """Test that error context is preserved through the stack."""

    def test_nested_exception_context(self):
        """Test that nested exceptions preserve context."""
        try:
            try:
                # Simulate database error
                raise ValueError("Connection lost")
            except ValueError as e:
                # Wrap in our custom exception
                raise DatabaseError(
                    message="Failed to query database",
                    database="trading.db",
                    query="SELECT * FROM orders",
                ) from e
        except DatabaseError as exc:
            response = create_error_response(exc)

            # Verify original context is preserved
            assert response["error"]["message"] == "Failed to query database"
            assert response["error"]["details"]["database"] == "trading.db"
            assert response["error"]["details"]["query"] == "SELECT * FROM orders"
            # Original error is in __cause__
            assert exc.__cause__ is not None
            assert str(exc.__cause__) == "Connection lost"

    def test_multiple_error_details(self):
        """Test that multiple detail fields are all preserved."""
        error = OrderExecutionError(
            message="Order failed",
            symbol="NVDA",
            quantity=75,
            side="SELL",
            order_type="LIMIT",
            reason="Price limit exceeded",
            order_id="order-12345",
        )

        response = create_error_response(error)

        # Verify all details preserved
        details = response["error"]["details"]
        assert details["symbol"] == "NVDA"
        assert details["quantity"] == 75
        assert details["side"] == "SELL"
        assert details["order_type"] == "LIMIT"
        assert details["execution_reason"] == "Price limit exceeded"
        assert details["order_id"] == "order-12345"


class TestErrorResponseSerialization:
    """Test that error responses serialize correctly for JSON."""

    def test_response_is_json_serializable(self):
        """Test that error responses can be serialized to JSON."""
        import json

        error = RateLimitError(
            message="Rate limit exceeded", service="alpaca", retry_after=60
        )

        response = create_error_response(error)

        # Should not raise exception
        json_str = json.dumps(response)
        assert json_str is not None

        # Should be deserializable
        parsed = json.loads(json_str)
        assert parsed["success"] == False
        assert parsed["error"]["error_code"] == "DATA_RATE_LIMITED"

    def test_response_contains_no_datetime_objects(self):
        """Test that datetime objects are converted to strings."""
        import json

        error = OrderExecutionError(message="Test error", symbol="TEST")

        response = create_error_response(error)

        # Should serialize without custom encoder
        json_str = json.dumps(response)

        # Timestamp should be ISO string, not datetime object
        assert "datetime" not in json_str.lower()
        # Should contain ISO format timestamp
        assert response["error"]["timestamp"]
        assert "T" in response["error"]["timestamp"]  # ISO format indicator

    def test_all_field_types_serializable(self):
        """Test that all common field types serialize correctly."""
        import json

        error = InsufficientFundsError(
            message="Test error",
            required_amount=1000.50,  # float
            available_amount=500,  # int
            symbol="TEST",  # string
        )

        response = create_error_response(error)

        # Should handle all types
        json_str = json.dumps(response)
        parsed = json.loads(json_str)

        assert isinstance(parsed["error"]["details"]["required_amount"], float)
        assert isinstance(parsed["error"]["details"]["available_amount"], (int, float))
        assert isinstance(parsed["error"]["details"]["symbol"], str)


class TestErrorIdentification:
    """Test error identification and tracking."""

    def test_request_id_uniqueness(self):
        """Test that each error gets a unique request ID."""
        error1 = OrderExecutionError(message="Error 1", symbol="AAPL")
        error2 = OrderExecutionError(message="Error 2", symbol="AAPL")

        # Request IDs should be different
        assert error1.request_id != error2.request_id

    def test_request_id_in_response(self):
        """Test that request ID is included in response."""
        error = OrderExecutionError(message="Test", symbol="TEST")
        response = create_error_response(error)

        assert "request_id" in response["error"]
        assert response["error"]["request_id"] == error.request_id

    def test_timestamp_in_response(self):
        """Test that timestamp is included in response."""
        error = OrderExecutionError(message="Test", symbol="TEST")
        response = create_error_response(error)

        assert "timestamp" in response["error"]
        # Should be ISO format string
        timestamp = response["error"]["timestamp"]
        assert isinstance(timestamp, str)
        assert "T" in timestamp or ":" in timestamp


class TestErrorSecurityFeatures:
    """Test security features of error handling."""

    def test_no_stack_trace_in_response(self):
        """Test that stack traces are not included in responses."""
        import json

        try:
            # Cause an actual exception with stack trace
            raise ValueError("Test error")
        except ValueError:
            # Wrap it
            error = DatabaseError(message="Database error", database="test.db")

        response = create_error_response(error)
        json_str = json.dumps(response)

        # Should not contain stack trace markers
        assert "Traceback" not in json_str
        assert 'File "' not in json_str
        assert "line " not in json_str.lower()

    def test_sensitive_details_only_in_details_field(self):
        """Test that sensitive info is only in details, not message."""
        error = DatabaseError(
            message="Database query failed",
            database="/path/to/sensitive/database.db",
            query="SELECT * FROM sensitive_table",
        )

        response = create_error_response(error)

        # Main message should be generic
        assert "/path/to/sensitive" not in response["error"]["message"]
        assert "sensitive_table" not in response["error"]["message"]

        # But details can contain it (for internal logging)
        assert (
            response["error"]["details"]["database"] == "/path/to/sensitive/database.db"
        )
        assert response["error"]["details"]["query"] == "SELECT * FROM sensitive_table"

    def test_error_code_not_leaking_internals(self):
        """Test that error codes don't leak internal implementation."""
        errors = [
            OrderExecutionError(message="Test", symbol="TEST"),
            InvalidSymbolError(message="Test", symbol=""),
            RateLimitError(message="Test", service="test"),
        ]

        for error in errors:
            response = create_error_response(error)

            # Error code should be generic
            code = response["error"]["error_code"]
            assert "sqlite" not in code.lower()
            assert "postgres" not in code.lower()
            assert "mysql" not in code.lower()
            assert ".py" not in code.lower()
            assert "Exception" not in code


class TestErrorResponseConsistency:
    """Test that all errors follow the same response format."""

    def test_all_responses_have_success_field(self):
        """Test all error responses have success: false."""
        errors = [
            OrderExecutionError(message="Test 1", symbol="TEST"),
            InvalidSymbolError(message="Test 2", symbol=""),
            DatabaseError(message="Test 3"),
            RateLimitError(message="Test 4", service="test"),
        ]

        for error in errors:
            response = create_error_response(error)
            assert "success" in response
            assert response["success"] == False

    def test_all_responses_have_error_object(self):
        """Test all error responses have error object."""
        errors = [
            OrderExecutionError(message="Test 1", symbol="TEST"),
            InvalidSymbolError(message="Test 2", symbol=""),
            DatabaseError(message="Test 3"),
            RateLimitError(message="Test 4", service="test"),
        ]

        for error in errors:
            response = create_error_response(error)
            assert "error" in response
            assert isinstance(response["error"], dict)

    def test_all_errors_have_required_fields(self):
        """Test all errors have required fields."""
        errors = [
            OrderExecutionError(message="Test 1", symbol="TEST"),
            InvalidSymbolError(message="Test 2", symbol=""),
            DatabaseError(message="Test 3"),
            RateLimitError(message="Test 4", service="test"),
        ]

        required_fields = [
            "message",
            "error_code",
            "request_id",
            "timestamp",
            "details",
        ]

        for error in errors:
            response = create_error_response(error)
            error_obj = response["error"]

            for field in required_fields:
                assert (
                    field in error_obj
                ), f"Missing {field} in {error.__class__.__name__}"
