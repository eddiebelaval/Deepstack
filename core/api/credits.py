"""
Unified Credit Deduction System for DeepStack API

Provides middleware for checking and deducting credits across all API endpoints.
Uses the database functions created in 012_unified_credit_system.sql for
atomic operations.
"""

import logging
import os
from enum import Enum
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, Response

logger = logging.getLogger(__name__)


class ActionCost(Enum):
    """Credit costs for different API actions.

    Cost tiers:
    - Free (0): All data endpoints (quotes, bars, news, options, predictions)
    - AI (15-30): Chat, analysis, deep screeners - the premium value

    Strategy: Data is the loss leader, AI analysis is the monetization.
    Users can browse all data freely; they pay when they want AI insights.
    """

    # === FREE TIER (0 credits) - Data is the loss leader ===

    # Health & System
    HEALTH = 0
    CALENDAR = 0

    # Market Data (free to attract users)
    QUOTE = 0
    QUOTES_BATCH = 0
    ASSETS_SEARCH = 0
    BARS = 0

    # News (free - commodity data)
    NEWS = 0
    NEWS_AGGREGATED = 0
    NEWS_SOURCES_HEALTH = 0

    # Options Data (free - let them explore)
    OPTIONS_EXPIRATIONS = 0
    OPTIONS_CHAIN = 0
    OPTIONS_QUOTE = 0

    # Screener (free - basic filtering)
    SCREENER = 0

    # Prediction Markets (free - browsing/discovery)
    PREDICTION_MARKETS_LIST = 0
    PREDICTION_MARKETS_DETAIL = 0

    # DeepSignals (free - market intelligence data)
    SIGNALS_FLOW = 0
    SIGNALS_GEX = 0
    SIGNALS_DARKPOOL = 0
    SIGNALS_INSIDER = 0
    SIGNALS_CONGRESS = 0
    SIGNALS_SENTIMENT = 0
    SIGNALS_IV = 0

    # === PAID TIER - AI Analysis (the premium value) ===

    # AI Chat & Analysis (15-30 credits)
    CHAT = 15
    ANALYZE = 20
    DEEP_VALUE_SCREEN = 30
    EMBEDDINGS = 5

    # Options Strategy (AI-powered)
    OPTIONS_STRATEGY = 25
    OPTIONS_GREEKS = 10

    # Prediction Markets AI Analysis
    PREDICTION_MARKETS_ANALYZE = 20

    # === PERPLEXITY FINANCE (AI-powered research) ===
    # SEC Filing Search (moderate - useful data)
    SEC_SEARCH = 10
    # Earnings Transcript Search (premium data)
    EARNINGS_TRANSCRIPT = 15
    # Market Summary (light - encourage frequent use)
    MARKET_SUMMARY = 5
    # Natural Language Screener (AI-powered)
    NL_SCREENER = 20
    # Company Profile Builder (deep research)
    COMPANY_PROFILE = 15
    # Deep Research Report (expensive - comprehensive)
    DEEP_RESEARCH = 50


class ActionCategory(Enum):
    """Categories for usage tracking."""

    AI_CHAT = "ai_chat"
    DATA_API = "data_api"
    ANALYSIS = "analysis"
    OPTIONS = "options"
    OTHER = "other"


# Map ActionCost to ActionCategory for usage tracking
ACTION_CATEGORIES: Dict[ActionCost, ActionCategory] = {
    ActionCost.HEALTH: ActionCategory.OTHER,
    ActionCost.CALENDAR: ActionCategory.DATA_API,
    ActionCost.QUOTE: ActionCategory.DATA_API,
    ActionCost.QUOTES_BATCH: ActionCategory.DATA_API,
    ActionCost.ASSETS_SEARCH: ActionCategory.DATA_API,
    ActionCost.NEWS_SOURCES_HEALTH: ActionCategory.DATA_API,
    ActionCost.BARS: ActionCategory.DATA_API,
    ActionCost.NEWS: ActionCategory.DATA_API,
    ActionCost.NEWS_AGGREGATED: ActionCategory.DATA_API,
    ActionCost.OPTIONS_EXPIRATIONS: ActionCategory.OPTIONS,
    ActionCost.OPTIONS_CHAIN: ActionCategory.OPTIONS,
    ActionCost.OPTIONS_QUOTE: ActionCategory.OPTIONS,
    ActionCost.OPTIONS_STRATEGY: ActionCategory.OPTIONS,
    ActionCost.OPTIONS_GREEKS: ActionCategory.OPTIONS,
    ActionCost.SCREENER: ActionCategory.DATA_API,
    ActionCost.PREDICTION_MARKETS_LIST: ActionCategory.DATA_API,
    ActionCost.PREDICTION_MARKETS_DETAIL: ActionCategory.DATA_API,
    ActionCost.PREDICTION_MARKETS_ANALYZE: ActionCategory.ANALYSIS,
    # DeepSignals
    ActionCost.SIGNALS_FLOW: ActionCategory.DATA_API,
    ActionCost.SIGNALS_GEX: ActionCategory.DATA_API,
    ActionCost.SIGNALS_DARKPOOL: ActionCategory.DATA_API,
    ActionCost.SIGNALS_INSIDER: ActionCategory.DATA_API,
    ActionCost.SIGNALS_CONGRESS: ActionCategory.DATA_API,
    ActionCost.SIGNALS_SENTIMENT: ActionCategory.DATA_API,
    ActionCost.SIGNALS_IV: ActionCategory.DATA_API,
    ActionCost.CHAT: ActionCategory.AI_CHAT,
    ActionCost.ANALYZE: ActionCategory.ANALYSIS,
    ActionCost.DEEP_VALUE_SCREEN: ActionCategory.ANALYSIS,
    ActionCost.EMBEDDINGS: ActionCategory.AI_CHAT,
    # Perplexity Finance
    ActionCost.SEC_SEARCH: ActionCategory.ANALYSIS,
    ActionCost.EARNINGS_TRANSCRIPT: ActionCategory.ANALYSIS,
    ActionCost.MARKET_SUMMARY: ActionCategory.DATA_API,
    ActionCost.NL_SCREENER: ActionCategory.ANALYSIS,
    ActionCost.COMPANY_PROFILE: ActionCategory.ANALYSIS,
    ActionCost.DEEP_RESEARCH: ActionCategory.ANALYSIS,
}


# Demo mode in-memory credit tracker (when Supabase not configured)
DEMO_CREDITS: Dict[str, int] = {}
DEMO_DEFAULT_CREDITS = 100


# === MODEL-BASED CREDIT MULTIPLIERS ===
# Different AI models have different costs based on their API pricing
# Users can choose efficiency (Haiku) vs capability (Opus)
MODEL_MULTIPLIERS: Dict[str, float] = {
    "claude_haiku": 0.3,  # Fastest, cheapest
    "claude": 1.0,  # Sonnet - baseline
    "claude_opus": 3.0,  # Most capable, premium
    "grok": 0.8,  # Fast alternative
    "sonar_reasoning": 0.5,  # DeepSeek R1 via Perplexity
    "perplexity": 0.4,  # Real-time search
}

# Extended thinking adds 50% to the cost
EXTENDED_THINKING_MULTIPLIER = 1.5


def calculate_model_cost(
    base_cost: int,
    model: Optional[str] = None,
    extended_thinking: bool = False,
) -> int:
    """Calculate credit cost based on model and options.

    Args:
        base_cost: Base cost from ActionCost enum
        model: Model identifier (e.g., 'claude_opus', 'claude_haiku')
        extended_thinking: Whether extended thinking is enabled

    Returns:
        Final credit cost (minimum 1)
    """
    if base_cost == 0:
        return 0

    multiplier = MODEL_MULTIPLIERS.get(model, 1.0) if model else 1.0

    cost = base_cost * multiplier

    if extended_thinking:
        cost *= EXTENDED_THINKING_MULTIPLIER

    return max(1, int(cost))


def get_supabase_client():
    """Get Supabase client with service role key."""
    try:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

        if not url or not key:
            logger.debug("Supabase credentials not configured - using demo mode")
            return None

        return create_client(url, key)
    except ImportError:
        logger.warning("Supabase library not installed")
        return None
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


async def verify_token(authorization: str = Header(None)) -> str:
    """Verify Supabase JWT and return user ID.

    If no auth configured (demo mode), returns 'demo-user'.
    """
    supabase = get_supabase_client()

    if not supabase:
        return "demo-user"

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")


async def verify_token_optional(authorization: str = Header(None)) -> Optional[str]:
    """Optionally verify Supabase JWT and return user ID.

    Returns None if no authorization provided (for free/public endpoints).
    Returns 'demo-user' if no Supabase configured.
    Returns user ID if valid token provided.
    Raises 401 only if invalid token provided (not for missing token).
    """
    supabase = get_supabase_client()

    if not supabase:
        return "demo-user"

    if not authorization:
        return None  # Allow anonymous access for free endpoints

    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        logger.debug(f"Optional auth failed: {e}")
        return None  # Treat invalid tokens as anonymous for free endpoints


class CreditDeduction:
    """FastAPI dependency for credit deduction.

    Usage with cost:
        @app.get("/api/endpoint", dependencies=[Depends(CreditDeduction(cost=10))])
        async def endpoint():
            ...

    Usage with action enum:
        credit_dep = CreditDeduction(action=ActionCost.BARS)
        @app.get("/api/endpoint", dependencies=[Depends(credit_dep)])
        async def endpoint():
            ...

    The dependency will:
    1. Verify the user's JWT token
    2. Check if user has sufficient credits
    3. Deduct credits atomically
    4. Log the usage to credit_usage table
    5. Set X-DeepStack-Credits header with remaining balance
    6. Raise 402 if insufficient credits
    """

    def __init__(
        self,
        cost: Optional[int] = None,
        action: Optional[ActionCost] = None,
        action_name: Optional[str] = None,
        category: Optional[ActionCategory] = None,
    ):
        if cost is not None:
            self.cost = cost
            self.action_name = action_name or "api_call"
            self.category = category or ActionCategory.OTHER
        elif action is not None:
            self.cost = action.value
            self.action_name = action.name.lower()
            self.category = ACTION_CATEGORIES.get(action, ActionCategory.OTHER)
        else:
            raise ValueError("Either cost or action must be provided")

    async def __call__(
        self,
        response: Response,
        user_id: str = Depends(verify_token),
    ) -> Dict[str, Any]:
        """Execute credit check and deduction."""

        # Skip deduction for zero-cost actions
        if self.cost == 0:
            return {"user_id": user_id, "credits_remaining": None, "skipped": True}

        supabase = get_supabase_client()

        # --- DEMO MODE (No DB) ---
        if not supabase:
            return await self._handle_demo_mode(response, user_id)

        # --- PRODUCTION MODE (Use database function) ---
        return await self._handle_production_mode(response, user_id, supabase)

    async def _handle_demo_mode(
        self, response: Response, user_id: str
    ) -> Dict[str, Any]:
        """Handle credit deduction in demo mode (no database)."""
        # Initialize demo user if needed
        if user_id not in DEMO_CREDITS:
            DEMO_CREDITS[user_id] = DEMO_DEFAULT_CREDITS

        current = DEMO_CREDITS[user_id]

        if current < self.cost:
            response.headers["X-DeepStack-Credits"] = str(current)
            raise HTTPException(
                status_code=402,
                detail="Payment Required: Insufficient Credits",
                headers={"X-DeepStack-Credits": str(current)},
            )

        DEMO_CREDITS[user_id] = current - self.cost
        remaining = DEMO_CREDITS[user_id]

        response.headers["X-DeepStack-Credits"] = str(remaining)

        logger.debug(
            f"[DEMO] User {user_id}: deducted {self.cost}, remaining {remaining}"
        )

        return {"user_id": user_id, "credits_remaining": remaining, "demo_mode": True}

    async def _handle_production_mode(
        self, response: Response, user_id: str, supabase
    ) -> Dict[str, Any]:
        """Handle credit deduction using database function."""
        try:
            # Call the atomic deduction function
            result = supabase.rpc(
                "deduct_credits_v2",
                {
                    "p_user_id": user_id,
                    "p_action": self.action_name,
                    "p_cost": self.cost,
                    "p_category": self.category.value,
                    "p_endpoint": None,  # Could be enhanced to include actual endpoint
                    "p_metadata": {},
                },
            ).execute()

            data = result.data

            if not data:
                logger.error(f"No response from deduct_credits_v2 for user {user_id}")
                raise HTTPException(status_code=500, detail="Credit deduction failed")

            if not data.get("success"):
                error = data.get("error", "UNKNOWN_ERROR")
                remaining = data.get("remaining", 0)

                response.headers["X-DeepStack-Credits"] = str(remaining)

                if error == "INSUFFICIENT_CREDITS":
                    raise HTTPException(
                        status_code=402,
                        detail="Payment Required: Insufficient Credits",
                        headers={"X-DeepStack-Credits": str(remaining)},
                    )
                elif error == "USER_NOT_FOUND":
                    raise HTTPException(
                        status_code=404, detail="User profile not found"
                    )
                else:
                    raise HTTPException(
                        status_code=500, detail=f"Credit deduction failed: {error}"
                    )

            # Success - set header and return
            remaining = data.get("remaining", 0)
            response.headers["X-DeepStack-Credits"] = str(remaining)

            logger.debug(
                f"User {user_id}: deducted {self.cost} ({self.action_name}), "
                f"remaining {remaining}, tier {data.get('tier')}"
            )

            return {
                "user_id": user_id,
                "credits_remaining": remaining,
                "tier": data.get("tier"),
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Credit deduction error for user {user_id}: {e}", exc_info=True
            )
            raise HTTPException(status_code=500, detail="Credit check failed")


# Convenience factory functions


def require_credits(
    cost: int,
    action_name: str = "api_call",
    category: ActionCategory = ActionCategory.OTHER,
):
    """Factory for creating CreditDeduction dependencies with custom cost.

    Usage:
        dep = require_credits(10, "custom_action")
        @app.get("/api/endpoint", dependencies=[Depends(dep)])
    """
    return CreditDeduction(cost=cost, action_name=action_name, category=category)


def require_action(action: ActionCost):
    """Factory for creating CreditDeduction dependencies from ActionCost enum.

    Usage:
        dep = require_action(ActionCost.BARS)
        @app.get("/api/endpoint", dependencies=[Depends(dep)])
    """
    return CreditDeduction(action=action)


class FreeEndpoint:
    """FastAPI dependency for free (public) endpoints.

    Used for data endpoints that don't require auth or credits.
    This is the "loss leader" strategy - let users browse data freely.

    Usage:
        @app.get("/api/endpoint", dependencies=[Depends(FreeEndpoint())])
        async def endpoint():
            ...

    Or with action enum:
        @app.get("/api/endpoint", dependencies=[Depends(free_action(ActionCost.BARS))])
        async def endpoint():
            ...
    """

    def __init__(self, action_name: str = "free_access"):
        self.action_name = action_name

    async def __call__(
        self,
        response: Response,
        user_id: Optional[str] = Depends(verify_token_optional),
    ) -> Dict[str, Any]:
        """Allow access without authentication."""
        # Set header if user is authenticated (shows their balance)
        if user_id:
            supabase = get_supabase_client()
            if supabase:
                try:
                    result = (
                        supabase.table("profiles")
                        .select("credits")
                        .eq("id", user_id)
                        .single()
                        .execute()
                    )
                    if result.data:
                        response.headers["X-DeepStack-Credits"] = str(
                            result.data.get("credits", 0)
                        )
                except Exception as e:
                    logger.debug(f"Optional credit header fetch failed: {e}")

        return {
            "user_id": user_id or "anonymous",
            "credits_remaining": None,
            "free_endpoint": True,
        }


def free_action(action: ActionCost):
    """Factory for creating FreeEndpoint dependencies.

    Use for endpoints that should be public (no auth required).
    The action is used for logging/tracking only.

    Usage:
        dep = free_action(ActionCost.PREDICTION_MARKETS_LIST)
        @app.get("/api/endpoint", dependencies=[Depends(dep)])
    """
    return FreeEndpoint(action_name=action.name.lower())


# Utility functions


def get_demo_credits(user_id: str = "demo-user") -> int:
    """Get current credits for a demo user."""
    return DEMO_CREDITS.get(user_id, DEMO_DEFAULT_CREDITS)


def reset_demo_credits(user_id: str = "demo-user", amount: int = DEMO_DEFAULT_CREDITS):
    """Reset credits for a demo user (for testing)."""
    DEMO_CREDITS[user_id] = amount


async def get_user_credits(user_id: str) -> Dict[str, Any]:
    """Get current credit balance and tier for a user.

    Returns dict with: credits, tier, monthly_base, reset_date
    """
    supabase = get_supabase_client()

    if not supabase:
        return {
            "credits": DEMO_CREDITS.get(user_id, DEMO_DEFAULT_CREDITS),
            "tier": "free",
            "monthly_base": DEMO_DEFAULT_CREDITS,
            "demo_mode": True,
        }

    try:
        select_cols = (
            "credits, subscription_tier, credits_monthly_base, "
            "billing_cycle_anchor, last_credit_reset"
        )
        result = (
            supabase.table("profiles")
            .select(select_cols)
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            return {"error": "User not found"}

        return {
            "credits": result.data.get("credits", 0),
            "tier": result.data.get("subscription_tier", "free"),
            "monthly_base": result.data.get("credits_monthly_base", 100),
            "billing_cycle_anchor": result.data.get("billing_cycle_anchor"),
            "last_reset": result.data.get("last_credit_reset"),
        }
    except Exception as e:
        logger.error(f"Error fetching user credits: {e}")
        return {"error": str(e)}
