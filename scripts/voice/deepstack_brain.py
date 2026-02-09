"""
DeepStack Voice — Brain Function

The core intelligence layer. Loads TRADING_BRAIN.md + live trading context,
calls Claude Sonnet, and returns a natural language response.

Usage:
    from deepstack_brain import ask_brain
    response = ask_brain("how's my portfolio doing?")
"""

import json
import logging
import os
import sys
from typing import Optional

import httpx

# Add project root to path
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, PROJECT_ROOT)

from config.voice_config import (
    BRAIN_MAX_TOKENS,
    BRAIN_MODEL,
    BRAIN_TIMEOUT,
    TRADING_BRAIN_PATH,
)
from core.voice.context_gatherer import format_context_for_prompt, gather_full_context

logger = logging.getLogger("deepstack.voice.brain")

# Cache the brain document (static knowledge, loaded once)
_brain_document: Optional[str] = None


def _load_brain_document() -> str:
    """Load TRADING_BRAIN.md from disk. Cached after first load."""
    global _brain_document
    if _brain_document is not None:
        return _brain_document

    if not os.path.exists(TRADING_BRAIN_PATH):
        logger.warning("TRADING_BRAIN.md not found at %s", TRADING_BRAIN_PATH)
        _brain_document = (
            "No trading brain document found. "
            "Answer based on general trading knowledge."
        )
        return _brain_document

    with open(TRADING_BRAIN_PATH, "r") as f:
        _brain_document = f.read()

    logger.info("Loaded TRADING_BRAIN.md (%d chars)", len(_brain_document))
    return _brain_document


def _build_system_prompt(live_context: str) -> str:
    """Build the full system prompt: brain document + live context."""
    brain = _load_brain_document()

    return f"""{brain}

---

{live_context}

---

RESPONSE RULES:
- You are responding via Telegram. Keep responses under 3000 characters.
- Use **bold** for emphasis, `backticks` for tickers/numbers.
- Be direct and specific. Use actual data from the live context above.
- If data is missing or unavailable, say so honestly.
- Think in risk/reward. Always consider downside.
- Use trader vernacular but remain clear.
- When citing numbers, always specify units (cents, dollars, percentage).
- For Telegram HTML: convert **bold** to <b>bold</b>, `code` to <code>code</code>.
  Output as markdown — the system handles conversion.
"""


def ask_brain(
    message: str,
    intent_type: str = "general_chat",
    conversation_history: Optional[list] = None,
) -> str:
    """
    Ask the DeepStack brain a question.

    Args:
        message: The user's message/question.
        intent_type: Classified intent (from NL parser). Used to optimize context.
        conversation_history: Optional list of prior messages for multi-turn context.

    Returns:
        The brain's response as a string.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Error: ANTHROPIC_API_KEY not configured. Cannot process your question."

    # Gather live trading context
    try:
        context = gather_full_context()
        live_context = format_context_for_prompt(context)
    except Exception as e:
        logger.error("Failed to gather context: %s", e)
        live_context = (
            "=== LIVE CONTEXT UNAVAILABLE ===\nCould not fetch live trading data."
        )

    system_prompt = _build_system_prompt(live_context)

    # Build messages array
    messages = []

    # Add conversation history if provided (last 6 messages for context window)
    if conversation_history:
        messages.extend(conversation_history[-6:])

    # Add current user message
    messages.append({"role": "user", "content": message})

    # Call Claude Sonnet
    try:
        timeout = httpx.Timeout(connect=5.0, read=BRAIN_TIMEOUT, write=5.0, pool=5.0)
        client = httpx.Client(timeout=timeout)
        response = client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": BRAIN_MODEL,
                "max_tokens": BRAIN_MAX_TOKENS,
                "system": system_prompt,
                "messages": messages,
            },
        )
        client.close()

        if response.status_code != 200:
            # Sanitize error: never log raw response (may contain API key echoes)
            error_type = (
                response.json().get("error", {}).get("type", "unknown")
                if response.headers.get("content-type", "").startswith(
                    "application/json"
                )
                else "unknown"
            )
            logger.error(
                "Claude API error %d: type=%s", response.status_code, error_type
            )
            return f"Brain error (HTTP {response.status_code}). Try again in a moment."

        data = response.json()
        content = data.get("content", [])
        if content and content[0].get("type") == "text":
            return content[0]["text"]
        else:
            return "Brain returned an unexpected response format."

    except httpx.TimeoutException:
        logger.error("Claude API timeout after %ds", BRAIN_TIMEOUT)
        return "Brain timed out. The market waits for no one — try a simpler question."
    except Exception as e:
        # Sanitize: only log exception type, not message (may contain secrets)
        logger.error("Brain error: %s", type(e).__name__)
        return "Brain encountered an error. Try again in a moment."


def classify_intent(message: str) -> dict:
    """
    Classify a user message into an intent type using Claude Haiku.

    Returns:
        {"type": "intent_type", "args": [...], "confidence": "high|medium|low"}
    """
    from config.voice_config import (
        NL_PARSE_SYSTEM,
        PARSE_MAX_TOKENS,
        PARSE_MODEL,
        PARSE_TIMEOUT,
    )

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"type": "general_chat", "args": [], "confidence": "low"}

    try:
        timeout = httpx.Timeout(connect=3.0, read=PARSE_TIMEOUT, write=3.0, pool=3.0)
        client = httpx.Client(timeout=timeout)
        response = client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": PARSE_MODEL,
                "max_tokens": PARSE_MAX_TOKENS,
                "system": NL_PARSE_SYSTEM,
                "messages": [{"role": "user", "content": message}],
            },
        )
        client.close()

        if response.status_code == 200:
            data = response.json()
            text = data.get("content", [{}])[0].get("text", "")
            # Parse JSON from response
            result = json.loads(text.strip())
            if isinstance(result, dict) and "type" in result:
                return result
    except Exception as e:
        logger.warning("Intent classification failed: %s", type(e).__name__)

    # Fallback: keyword-based classification
    return _classify_rigid(message)


def _classify_rigid(message: str) -> dict:
    """Fallback keyword-based intent classification (free, no API call)."""
    msg = message.lower().strip()

    keyword_map = {
        "portfolio_check": ["balance", "portfolio", "positions", "how much", "account"],
        "market_status": ["market", "spy", "how are things", "what's happening"],
        "strategy_question": [
            "strategy",
            "how does",
            "explain",
            "kelly",
            "mean reversion",
            "momentum",
        ],
        "signal_alert": [
            "signal",
            "dark pool",
            "insider",
            "congress",
            "pcr",
            "put call",
        ],
        "explain_trade": ["why did", "reasoning", "why we", "that trade"],
        "what_if": ["what if", "scenario", "hypothetical", "imagine"],
        "trade_journal": ["log", "journal", "record trade", "traded today"],
        "general_chat": ["hey", "hello", "hi", "thanks", "help"],
    }

    for intent, keywords in keyword_map.items():
        for kw in keywords:
            if kw in msg:
                return {"type": intent, "args": [], "confidence": "medium"}

    return {"type": "general_chat", "args": [], "confidence": "low"}


if __name__ == "__main__":
    """Quick test: ask the brain a question from CLI."""
    logging.basicConfig(level=logging.INFO)

    question = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "How's my portfolio?"
    print(f"Question: {question}")
    print("---")

    intent = classify_intent(question)
    print(f"Intent: {intent}")
    print("---")

    answer = ask_brain(question, intent_type=intent["type"])
    print(answer)
