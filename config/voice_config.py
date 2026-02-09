"""
DeepStack Voice Configuration

Non-secret settings for the voice system. Secrets live in deepstack-voice.env.
"""

import os

# ── Paths ──────────────────────────────────────────────────────────

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(PROJECT_ROOT, "deepstack-voice.env")
TRADING_BRAIN_PATH = os.path.join(PROJECT_ROOT, "docs", "TRADING_BRAIN.md")
SOUL_PATH = os.path.join(PROJECT_ROOT, "docs", "SOUL.md")
TRADE_JOURNAL_DB = os.path.join(
    os.path.expanduser("~"),
    "clawd",
    "projects",
    "kalshi-trading",
    "trade_journal.db",
)
DEEPSTACK_CONFIG_PATH = os.path.join(PROJECT_ROOT, "config", "config.yaml")
KALSHI_BOT_CONFIG_PATH = os.path.join(
    os.path.expanduser("~"),
    "clawd",
    "projects",
    "kalshi-trading",
    "config.yaml",
)
RISK_LIMITS_PATH = os.path.join(PROJECT_ROOT, "config", "risk_limits.yaml")

# State directory
STATE_DIR = os.path.join(PROJECT_ROOT, "data", "voice-state")
OFFSET_FILE = os.path.join(STATE_DIR, "telegram-offset.txt")
LOCK_DIR = os.path.join(STATE_DIR, "listener.lockdir")
CONVERSATION_LOG = os.path.join(STATE_DIR, "conversations.jsonl")

# Logs
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
LISTENER_LOG = os.path.join(LOG_DIR, "voice-listener.log")

# ── Telegram ───────────────────────────────────────────────────────

TELEGRAM_API_BASE = "https://api.telegram.org"
POLL_TIMEOUT = 30  # seconds for long-polling
MAX_MESSAGE_LENGTH = 4000  # Telegram limit

# ── Claude Models ──────────────────────────────────────────────────

BRAIN_MODEL = "claude-sonnet-4-5-20250929"
BRAIN_MAX_TOKENS = 1024
BRAIN_TIMEOUT = 30  # seconds

PARSE_MODEL = "claude-haiku-4-5-20251001"
PARSE_MAX_TOKENS = 100
PARSE_TIMEOUT = 5  # seconds

# ── ElevenLabs TTS (used by Bash listener) ────────────────────────

ELEVENLABS_MODEL = "eleven_turbo_v2_5"
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# ── Deepgram (used by Bash listener) ──────────────────────────────

DEEPGRAM_TRANSCRIPTION_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"

# ── Error Handling ─────────────────────────────────────────────────

ERROR_BACKOFF_BASE = 5  # seconds
ERROR_BACKOFF_MAX = 300  # 5 minutes
MAX_CONSECUTIVE_ERRORS = 10

# NL parsing system prompt for Claude Haiku
NL_PARSE_SYSTEM = (  # noqa: E501
    "You classify trading-related messages into intent types.\n"
    'Return ONLY valid JSON: {"type": "<intent>", '
    '"args": [...], "confidence": "high|medium|low"}\n\n'
    "Intent types:\n"
    "- market_status: current market conditions, portfolio, P&L\n"
    "- explain_trade: why a trade was made, reasoning\n"
    "- strategy_question: how a strategy works, risk rules\n"
    "- what_if: hypothetical scenarios\n"
    "- portfolio_check: balance, positions, orders\n"
    "- signal_alert: DeepSignals (dark pool, insider, congress, PCR)\n"
    "- trade_journal: logging a trade, reviewing history\n"
    "- general_chat: greetings, meta questions, anything else\n\n"
    "Examples:\n"
    '"how\'s my portfolio?" -> '
    '{"type": "portfolio_check", "args": [], '
    '"confidence": "high"}\n'
    '"explain the mean reversion strategy" -> '
    '{"type": "strategy_question", '
    '"args": ["mean_reversion"], "confidence": "high"}\n'
    '"any dark pool activity today?" -> '
    '{"type": "signal_alert", "args": ["dark_pool"], '
    '"confidence": "high"}\n'
    '"what if SPY drops 5% tomorrow?" -> '
    '{"type": "what_if", "args": ["SPY", "drop", "5%"], '
    '"confidence": "high"}\n'
    '"log: bought INXD YES at 45c" -> '
    '{"type": "trade_journal", '
    '"args": ["bought INXD YES at 45c"], '
    '"confidence": "high"}\n'
    '"hey, you there?" -> '
    '{"type": "general_chat", "args": [], '
    '"confidence": "high"}'
)
