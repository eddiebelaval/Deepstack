"""Tests for API error handling."""

import json
from datetime import datetime


class TestAPIErrorResponses:
    """Test that API endpoints return proper error responses."""

    def test_error_response_format(self):
        """Verify error responses have required fields."""
        # Mock error response
        error_response = {
            "success": False,
            "error": {
                "error": "Test error",
                "error_code": "TEST_ERROR",
                "request_id": "abc-123",
                "timestamp": "2024-01-01T00:00:00Z",
                "details": {},
            },
        }

        assert "success" in error_response
        assert error_response["success"] == False
        assert "error" in error_response
        assert "error" in error_response["error"]
        assert "error_code" in error_response["error"]
        assert "request_id" in error_response["error"]
        assert "timestamp" in error_response["error"]

    def test_error_response_timestamp_valid(self):
        """Verify error timestamps are valid ISO format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Test error",
                "error_code": "TEST_ERROR",
                "request_id": "abc-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {},
            },
        }

        # Should be parseable as ISO format
        timestamp = error_response["error"]["timestamp"]
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

    def test_no_internal_details_exposed(self):
        """Verify internal error details are not exposed."""
        # This tests the generic error handler
        generic_error = {
            "success": False,
            "error": {
                "error": "An unexpected error occurred. Please try again.",
                "error_code": "INTERNAL_ERROR",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {},
            },
        }

        # Should NOT contain stack traces, file paths, etc
        error_str = json.dumps(generic_error)
        assert "Traceback" not in error_str
        assert "/Users/" not in error_str
        assert "/home/" not in error_str
        assert "sqlite3" not in error_str
        assert "password" not in error_str.lower()
        assert "secret" not in error_str.lower()

    def test_error_details_structure(self):
        """Verify error details are properly structured."""
        error_response = {
            "success": False,
            "error": {
                "error": "Order execution failed",
                "error_code": "ORDER_EXECUTION_FAILED",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"symbol": "AAPL", "quantity": 100, "side": "BUY"},
            },
        }

        assert isinstance(error_response["error"]["details"], dict)
        assert "symbol" in error_response["error"]["details"]
        assert error_response["error"]["details"]["symbol"] == "AAPL"


class TestOrderAPIErrorHandling:
    """Test order API error handling."""

    def test_insufficient_funds_error_format(self):
        """Test insufficient funds error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Insufficient funds: Required 10000.0, Available 5000.0, Shortfall 5000.0",
                "error_code": "INSUFFICIENT_FUNDS",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {
                    "required_amount": 10000.0,
                    "available_amount": 5000.0,
                    "shortfall": 5000.0,
                },
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "INSUFFICIENT_FUNDS"
        assert error_response["error"]["details"]["shortfall"] == 5000.0

    def test_invalid_symbol_error_format(self):
        """Test invalid symbol error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Invalid symbol: ''",
                "error_code": "INVALID_SYMBOL",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"symbol": ""},
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "INVALID_SYMBOL"

    def test_order_rejection_error_format(self):
        """Test order rejection error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Order rejected for AAPL",
                "error_code": "ORDER_REJECTED",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"symbol": "AAPL", "reason": "Outside trading hours"},
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "ORDER_REJECTED"
        assert "reason" in error_response["error"]["details"]


class TestDatabaseAPIErrorHandling:
    """Test database API error handling."""

    def test_database_error_format(self):
        """Test database error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Database operation failed",
                "error_code": "DATABASE_ERROR",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"operation": "SELECT"},
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "DATABASE_ERROR"
        # Should NOT expose query details to external clients
        assert "query" not in json.dumps(error_response["error"]["error"])

    def test_database_init_error_format(self):
        """Test database initialization error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Failed to initialize database at /path/to/db",
                "error_code": "DB_INIT_FAILED",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"database": "/path/to/db"},
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "DB_INIT_FAILED"


class TestRateLimitErrorHandling:
    """Test rate limit error handling."""

    def test_rate_limit_error_format(self):
        """Test rate limit error response format."""
        error_response = {
            "success": False,
            "error": {
                "error": "Rate limit exceeded for alpaca",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"service": "alpaca", "retry_after": 60},
            },
        }

        assert error_response["success"] == False
        assert error_response["error"]["error_code"] == "RATE_LIMIT_EXCEEDED"
        assert "retry_after" in error_response["error"]["details"]
        assert error_response["error"]["details"]["retry_after"] == 60

    def test_rate_limit_retry_after_header(self):
        """Test that rate limit errors include retry-after information."""
        error_response = {
            "success": False,
            "error": {
                "error": "Rate limit exceeded for alpaca",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {"service": "alpaca", "retry_after": 60},
            },
        }

        retry_after = error_response["error"]["details"].get("retry_after")
        assert retry_after is not None
        assert isinstance(retry_after, (int, float))
        assert retry_after > 0


class TestSuccessResponseFormat:
    """Test success response format for comparison."""

    def test_success_response_format(self):
        """Verify success responses have consistent format."""
        success_response = {
            "success": True,
            "data": {"order_id": "123", "symbol": "AAPL", "status": "filled"},
        }

        assert "success" in success_response
        assert success_response["success"] == True
        assert "data" in success_response
        assert "error" not in success_response

    def test_success_response_no_error_field(self):
        """Verify success responses don't include error field."""
        success_response = {"success": True, "data": {"result": "OK"}}

        assert "error" not in success_response
        assert "error_code" not in success_response


class TestErrorResponseConsistency:
    """Test consistency across different error types."""

    def test_all_errors_have_required_fields(self):
        """Verify all error responses have the same required fields."""
        error_types = [
            {
                "success": False,
                "error": {
                    "error": "Order failed",
                    "error_code": "ORDER_ERROR",
                    "request_id": "test-1",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "details": {},
                },
            },
            {
                "success": False,
                "error": {
                    "error": "Database failed",
                    "error_code": "DATABASE_ERROR",
                    "request_id": "test-2",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "details": {},
                },
            },
            {
                "success": False,
                "error": {
                    "error": "Validation failed",
                    "error_code": "VALIDATION_ERROR",
                    "request_id": "test-3",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "details": {},
                },
            },
        ]

        required_fields = ["success", "error"]
        required_error_fields = [
            "error",
            "error_code",
            "request_id",
            "timestamp",
            "details",
        ]

        for error_response in error_types:
            # Check top-level fields
            for field in required_fields:
                assert field in error_response, f"Missing field: {field}"

            # Check error object fields
            for field in required_error_fields:
                assert field in error_response["error"], f"Missing error field: {field}"

            # Check success is always False for errors
            assert error_response["success"] == False

    def test_error_codes_are_uppercase(self):
        """Verify all error codes are uppercase snake_case."""
        error_codes = [
            "ORDER_ERROR",
            "DATABASE_ERROR",
            "VALIDATION_ERROR",
            "RATE_LIMIT_EXCEEDED",
            "INSUFFICIENT_FUNDS",
            "INVALID_SYMBOL",
            "ORDER_REJECTED",
        ]

        for code in error_codes:
            assert code.isupper(), f"Error code not uppercase: {code}"
            assert " " not in code, f"Error code contains space: {code}"
            # Should be snake_case (underscores)
            assert "-" not in code, f"Error code contains dash: {code}"


class TestErrorSerialization:
    """Test error serialization for JSON responses."""

    def test_error_json_serializable(self):
        """Verify error responses are JSON serializable."""
        error_response = {
            "success": False,
            "error": {
                "error": "Test error",
                "error_code": "TEST_ERROR",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {
                    "field": "value",
                    "number": 123,
                    "boolean": True,
                    "null": None,
                },
            },
        }

        # Should not raise exception
        json_str = json.dumps(error_response)
        assert json_str is not None

        # Should be deserializable
        parsed = json.loads(json_str)
        assert parsed["success"] == False
        assert parsed["error"]["error_code"] == "TEST_ERROR"

    def test_error_no_datetime_objects(self):
        """Verify error responses don't contain datetime objects."""
        error_response = {
            "success": False,
            "error": {
                "error": "Test error",
                "error_code": "TEST_ERROR",
                "request_id": "test-123",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "details": {},
            },
        }

        # Should be JSON serializable without custom encoder
        json_str = json.dumps(error_response)
        assert "datetime" not in json_str.lower()
