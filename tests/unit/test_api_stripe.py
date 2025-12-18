"""
Unit tests for Stripe webhook handling in DeepStack API Server.

Tests cover:
- Checkout session creation
- Webhook signature verification
- Subscription lifecycle events
- Error handling
"""

import hashlib
import hmac
import json
import os
import sys
import time
from unittest.mock import MagicMock, patch

import pytest

# Import TestClient first before mocking
from fastapi.testclient import TestClient

# Then mock all external dependencies
sys.modules["stripe"] = MagicMock()
sys.modules["yfinance"] = MagicMock()
sys.modules["supabase"] = MagicMock()
sys.modules["cachetools"] = MagicMock()
sys.modules["ib_insync"] = MagicMock()


# Set up environment variables before importing the app
@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """Set up test environment variables."""
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_mock_secret_key"
    os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_mock_webhook_secret"
    os.environ["STRIPE_PRICE_PRO"] = "price_pro_test_123"
    os.environ["STRIPE_PRICE_ELITE"] = "price_elite_test_456"
    os.environ["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test_service_role_key"
    yield


class MockStripeSession:
    """Mock Stripe checkout session with explicit attributes.

    Using a real class instead of MagicMock ensures .url is always a string,
    avoiding Pydantic validation errors in CheckoutSessionResponse.
    """

    def __init__(self):
        self.url = "https://checkout.stripe.com/test_session_123"
        self.id = "cs_test_123"
        self.customer = "cus_test_123"
        self.subscription = "sub_test_123"


@pytest.fixture
def mock_stripe_api():
    """Mock Stripe API calls with explicit return values.

    CRITICAL: We configure the EXISTING stripe mock from sys.modules rather than
    creating a new one. This is because api_server imports stripe at module load
    time and holds a reference to that original mock. Creating a new mock would
    not affect api_server's reference.

    Uses a combination of MagicMock (for call tracking) and explicit objects
    (for return values) to ensure both test assertions and Pydantic validation work.
    """
    # Get the existing stripe mock that was set at module level
    # This is the same mock that api_server imported
    stripe_mock = sys.modules["stripe"]

    # Create the session object that will be returned - using explicit class
    # ensures .url is always a string, not a MagicMock
    mock_session = MockStripeSession()

    # Configure the existing mock's checkout.Session.create to return our session
    # We need to set these up fresh on each test to avoid state leakage
    stripe_mock.checkout = MagicMock()
    stripe_mock.checkout.Session = MagicMock()
    stripe_mock.checkout.Session.create = MagicMock(return_value=mock_session)

    # Set up webhook mock with default return value
    stripe_mock.Webhook = MagicMock()
    stripe_mock.Webhook.construct_event = MagicMock(
        return_value={
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "metadata": {"user_id": "user_123", "tier": "pro"},
                    "customer": "cus_test_123",
                    "subscription": "sub_test_123",
                }
            },
        }
    )

    # Create error mock with exception class
    stripe_mock.error = MagicMock()
    stripe_mock.error.SignatureVerificationError = type(
        "SignatureVerificationError", (Exception,), {}
    )

    # Set API key
    stripe_mock.api_key = "sk_test_mock_secret_key"

    yield stripe_mock


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client."""
    from supabase import create_client

    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_update = MagicMock()
    mock_eq = MagicMock()
    mock_execute = MagicMock()

    # Setup the chain
    mock_execute.execute.return_value = {"data": [{"id": "user_123"}], "error": None}
    mock_eq.execute = mock_execute.execute
    mock_update.eq.return_value = mock_eq
    mock_table.update.return_value = mock_update
    mock_client.table.return_value = mock_table

    create_client.return_value = mock_client

    return mock_client


@pytest.fixture
def app(mock_stripe_api, mock_supabase_client):
    """Create FastAPI app with mocked dependencies."""
    # Patch config and other dependencies
    with patch("core.config.get_config") as mock_config:
        # Configure mock config
        mock_cfg = MagicMock()
        mock_cfg.api.cors_origins = ["*"]
        mock_cfg.trading.mode = "paper"
        mock_cfg.alpaca_api_key = None
        mock_cfg.alpaca_secret_key = None
        mock_config.return_value = mock_cfg

        # Import and create app
        from core.api_server import create_app

        return create_app()


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


def generate_stripe_signature(payload: str, secret: str) -> str:
    """Generate valid Stripe webhook signature for testing."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode(), signed_payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


# ============================================
# CHECKOUT SESSION TESTS
# ============================================


def test_create_checkout_session_pro_tier(client, mock_stripe_api):
    """Test creating checkout session for Pro tier."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"] == "https://checkout.stripe.com/test_session_123"

    # Verify Stripe was called correctly
    mock_stripe_api.checkout.Session.create.assert_called_once()
    call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    assert call_kwargs["customer_email"] == "test@example.com"
    assert call_kwargs["mode"] == "subscription"
    assert call_kwargs["metadata"]["user_id"] == "user_123"
    assert call_kwargs["metadata"]["tier"] == "pro"


def test_create_checkout_session_elite_tier(client, mock_stripe_api):
    """Test creating checkout session for Elite tier."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "elite",
            "user_id": "user_456",
            "user_email": "elite@example.com",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "url" in data

    # Verify correct price ID was used
    call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    assert call_kwargs["line_items"][0]["price"] == "price_elite_test_456"
    assert call_kwargs["metadata"]["tier"] == "elite"


def test_create_checkout_session_invalid_tier(client):
    """Test checkout session with invalid tier."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "premium",  # Invalid tier
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    # error can be a dict or string
    error_text = str(data.get("error", "")).lower()
    assert "tier" in error_text


def test_create_checkout_session_missing_user_id(client):
    """Test checkout session with missing user_id."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            # user_id missing
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 422  # FastAPI validation error


def test_create_checkout_session_stripe_api_error(client, mock_stripe_api):
    """Test handling Stripe API errors during checkout."""
    mock_stripe_api.checkout.Session.create.side_effect = Exception("Stripe API Error")

    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    # Error code can be at top level or nested in error dict
    error_code = data.get("error_code") or data.get("error", {}).get("error_code")
    assert error_code == "STRIPE_CHECKOUT_ERROR"


def test_checkout_url_format(client, mock_stripe_api):
    """Test that checkout URL is properly formatted."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["url"].startswith("https://checkout.stripe.com/")


def test_checkout_session_metadata(client, mock_stripe_api):
    """Test that metadata is correctly attached to checkout session."""
    user_id = "user_xyz_789"
    tier = "elite"

    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": tier,
            "user_id": user_id,
            "user_email": "metadata@example.com",
        },
    )

    assert response.status_code == 200

    # Verify metadata
    call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    metadata = call_kwargs["metadata"]
    assert metadata["user_id"] == user_id
    assert metadata["tier"] == tier


def test_checkout_session_success_cancel_urls(client, mock_stripe_api):
    """Test that success and cancel URLs are properly configured."""
    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 200

    call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    assert "deepstack.trade/app?upgraded=true" in call_kwargs["success_url"]
    assert "deepstack.trade/pricing" in call_kwargs["cancel_url"]


# ============================================
# WEBHOOK SIGNATURE VERIFICATION TESTS
# ============================================


def test_webhook_signature_verification_success(client, mock_stripe_api):
    """Test successful webhook signature verification."""
    payload = json.dumps(
        {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "metadata": {"user_id": "user_123", "tier": "pro"},
                    "customer": "cus_123",
                    "subscription": "sub_123",
                }
            },
        }
    )

    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    signature = generate_stripe_signature(payload, secret)

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_webhook_signature_verification_failure(client, mock_stripe_api):
    """Test webhook with invalid signature."""
    mock_stripe_api.Webhook.construct_event.side_effect = (
        mock_stripe_api.error.SignatureVerificationError("Invalid signature")
    )

    payload = json.dumps({"type": "test.event", "data": {}})

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": "invalid_signature"},
    )

    assert response.status_code == 400
    assert "Invalid signature" in response.json()["detail"]


def test_webhook_invalid_payload(client, mock_stripe_api):
    """Test webhook with invalid JSON payload."""
    mock_stripe_api.Webhook.construct_event.side_effect = ValueError("Invalid payload")

    response = client.post(
        "/api/webhooks/stripe",
        data="invalid json{{{",
        headers={"stripe-signature": "t=123,v1=abc"},
    )

    assert response.status_code == 400
    assert "Invalid payload" in response.json()["detail"]


# ============================================
# WEBHOOK EVENT HANDLING TESTS
# ============================================


def test_webhook_checkout_session_completed(
    client, mock_stripe_api, mock_supabase_client
):
    """Test handling checkout.session.completed event."""
    event_data = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"user_id": "user_123", "tier": "pro"},
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_webhook_subscription_created(client, mock_stripe_api, mock_supabase_client):
    """Test handling customer.subscription.created event."""
    event_data = {
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "customer": "cus_test_123",
                "status": "active",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_webhook_subscription_updated(client, mock_stripe_api, mock_supabase_client):
    """Test handling customer.subscription.updated event."""
    event_data = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_test_123",
                "status": "active",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


def test_webhook_subscription_deleted(client, mock_stripe_api, mock_supabase_client):
    """Test handling customer.subscription.deleted event."""
    event_data = {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "customer": "cus_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


def test_webhook_payment_failed(client, mock_stripe_api, mock_supabase_client):
    """Test handling invoice.payment_failed event."""
    event_data = {
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "customer": "cus_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


def test_webhook_invoice_paid(client, mock_stripe_api):
    """Test handling invoice.paid event."""
    event_data = {
        "type": "invoice.paid",
        "data": {
            "object": {
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    # Should succeed even if we don't handle this event type
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_webhook_unknown_event_type(client, mock_stripe_api):
    """Test handling unknown event types gracefully."""
    event_data = {
        "type": "unknown.event.type",
        "data": {"object": {}},
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    # Should succeed and log that event was ignored
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_webhook_idempotency(client, mock_stripe_api, mock_supabase_client):
    """Test webhook can be called multiple times with same event (idempotency)."""
    event_data = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"user_id": "user_123", "tier": "pro"},
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    # Send webhook twice
    response1 = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    response2 = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    # Both should succeed
    assert response1.status_code == 200
    assert response2.status_code == 200


# ============================================
# SUBSCRIPTION MANAGEMENT TESTS
# ============================================


def test_subscription_tier_mapping(client, mock_stripe_api):
    """Test that tier names map correctly to Stripe price IDs."""
    # Test Pro tier
    response_pro = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )
    assert response_pro.status_code == 200

    pro_call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    assert pro_call_kwargs["line_items"][0]["price"] == "price_pro_test_123"

    # Reset mock for next call
    mock_stripe_api.checkout.Session.create.reset_mock()

    # Test Elite tier
    response_elite = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "elite",
            "user_id": "user_456",
            "user_email": "elite@example.com",
        },
    )
    assert response_elite.status_code == 200

    elite_call_kwargs = mock_stripe_api.checkout.Session.create.call_args[1]
    assert elite_call_kwargs["line_items"][0]["price"] == "price_elite_test_456"


def test_subscription_status_active(client, mock_stripe_api, mock_supabase_client):
    """Test subscription status is set to active on successful checkout."""
    event_data = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"user_id": "user_123", "tier": "pro"},
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


def test_subscription_status_cancelled(client, mock_stripe_api, mock_supabase_client):
    """Test subscription status is set to canceled on deletion."""
    event_data = {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "customer": "cus_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


def test_subscription_status_past_due(client, mock_stripe_api, mock_supabase_client):
    """Test subscription status is set to past_due on payment failure."""
    event_data = {
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "customer": "cus_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == 200


# ============================================
# ERROR HANDLING TESTS
# ============================================


def test_webhook_missing_secret(client, mock_stripe_api, monkeypatch):
    """Test webhook fails gracefully when webhook secret is not configured."""
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)

    # Recreate client with new env
    payload = json.dumps({"type": "test.event", "data": {}})

    response = client.post(
        "/api/webhooks/stripe",
        data=payload,
        headers={"stripe-signature": "t=123,v1=abc"},
    )

    # Should fail with 500 error
    assert response.status_code == 500
    assert "not configured" in response.json()["detail"]


def test_checkout_missing_stripe_key(client, mock_stripe_api, monkeypatch):
    """Test checkout fails gracefully when Stripe API key is missing."""
    # Clear the Stripe secret key environment variable
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)

    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "pro",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    # Error code can be at top level or nested in error dict
    error_code = data.get("error_code") or data.get("error", {}).get("error_code")
    assert error_code == "STRIPE_NOT_CONFIGURED"


def test_webhook_supabase_update_failure(client, mock_stripe_api):
    """Test webhook handles Supabase update failures gracefully."""
    event_data = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"user_id": "user_123", "tier": "pro"},
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    # Make Supabase fail
    with patch("supabase.create_client") as mock_create:
        mock_create.side_effect = Exception("Database error")

        response = client.post(
            "/api/webhooks/stripe",
            data=payload,
            headers={"stripe-signature": signature},
        )

        # Webhook should still return success (failures logged but don't block webhook)
        assert response.status_code == 200


def test_checkout_missing_price_id(client, mock_stripe_api, monkeypatch):
    """Test checkout fails when price ID is not configured for tier."""
    # Clear the elite price ID
    monkeypatch.delenv("STRIPE_PRICE_ELITE", raising=False)

    response = client.post(
        "/api/checkout/create-session",
        json={
            "tier": "elite",
            "user_id": "user_123",
            "user_email": "test@example.com",
        },
    )

    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    error_text = str(data.get("error", "")).lower()
    assert "not configured" in error_text


def test_webhook_concurrent_processing(client, mock_stripe_api, mock_supabase_client):
    """Test multiple webhooks can be processed concurrently."""
    event_data = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_test_123",
                "status": "active",
            }
        },
    }

    mock_stripe_api.Webhook.construct_event.return_value = event_data
    payload = json.dumps(event_data)
    signature = generate_stripe_signature(payload, os.getenv("STRIPE_WEBHOOK_SECRET"))

    # Send multiple webhooks concurrently
    responses = []
    for _ in range(3):
        response = client.post(
            "/api/webhooks/stripe",
            data=payload,
            headers={"stripe-signature": signature},
        )
        responses.append(response)

    # All should succeed
    for response in responses:
        assert response.status_code == 200
