"""
DeepStack Voice — Trading Context Gatherer

Queries all DeepStack data sources to build a real-time trading context
snapshot that gets injected into Claude's system prompt.

Data sources:
  - SQLite trade journal (Kalshi trades, P&L, strategy performance)
  - config.yaml (strategy state, risk limits)
  - Supabase DeepSignals (dark pool, insider, congress, PCR)
  - Kalshi API (live balance, open orders — future)
"""

import json
import logging
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
import yaml

# Ensure project root is importable
_PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from config.voice_config import DEEPSTACK_CONFIG_PATH as DEEPSTACK_CONFIG
from config.voice_config import RISK_LIMITS_PATH as RISK_LIMITS
from config.voice_config import (
    TRADE_JOURNAL_DB,
)

logger = logging.getLogger("deepstack.voice.context")


def _safe_query(db_path: str, query: str, params: tuple = ()) -> List[Dict]:
    """Execute a SQLite query and return results as list of dicts."""
    if not os.path.exists(db_path):
        logger.warning("Database not found: %s", db_path)
        return []

    try:
        conn = sqlite3.connect(db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(query, params)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except sqlite3.Error as e:
        logger.error("SQLite error on %s: %s", db_path, e)
        return []


def get_trade_journal_context() -> Dict[str, Any]:
    """Get recent trades, open positions, and P&L from the Kalshi trade journal."""
    context: Dict[str, Any] = {
        "recent_trades": [],
        "open_positions": [],
        "today_pnl_cents": 0,
        "total_trades": 0,
        "win_rate": 0.0,
        "strategy_performance": {},
    }

    if not os.path.exists(TRADE_JOURNAL_DB):
        context["status"] = "trade_journal_not_found"
        return context

    # Recent trades (last 10)
    context["recent_trades"] = _safe_query(
        TRADE_JOURNAL_DB,
        """
        SELECT market_ticker, side, action, contracts, entry_price_cents,
               exit_price_cents, pnl_cents, status, strategy, reasoning,
               created_at
        FROM trades
        ORDER BY created_at DESC
        LIMIT 10
        """,
    )

    # Open positions
    context["open_positions"] = _safe_query(
        TRADE_JOURNAL_DB,
        """
        SELECT market_ticker, side, contracts, entry_price_cents, strategy,
               reasoning, created_at
        FROM trades
        WHERE status = 'open'
        ORDER BY created_at DESC
        """,
    )

    # Today's P&L
    today = datetime.now().strftime("%Y-%m-%d")
    today_rows = _safe_query(
        TRADE_JOURNAL_DB,
        "SELECT COALESCE(SUM(pnl_cents), 0) as total "
        "FROM trades WHERE session_date = ?",
        (today,),
    )
    if today_rows:
        context["today_pnl_cents"] = today_rows[0].get("total", 0)

    # Overall stats
    stats = _safe_query(
        TRADE_JOURNAL_DB,
        """
        SELECT COUNT(*) as total,
               SUM(CASE WHEN pnl_cents > 0 THEN 1 ELSE 0 END) as wins,
               SUM(CASE WHEN pnl_cents <= 0 THEN 1 ELSE 0 END) as losses
        FROM trades
        WHERE status = 'closed'
        """,
    )
    if stats and stats[0]["total"]:
        context["total_trades"] = stats[0]["total"]
        wins = stats[0].get("wins", 0) or 0
        total = stats[0]["total"]
        context["win_rate"] = round(wins / total * 100, 1) if total > 0 else 0.0

    # Per-strategy performance
    strategy_rows = _safe_query(
        TRADE_JOURNAL_DB,
        """
        SELECT strategy,
               COUNT(*) as trades,
               SUM(pnl_cents) as total_pnl,
               SUM(CASE WHEN pnl_cents > 0 THEN 1 ELSE 0 END) as wins
        FROM trades
        WHERE status = 'closed'
        GROUP BY strategy
        """,
    )
    for row in strategy_rows:
        name = row.get("strategy", "unknown")
        trades = row.get("trades", 0)
        wins = row.get("wins", 0) or 0
        context["strategy_performance"][name] = {
            "trades": trades,
            "total_pnl_cents": row.get("total_pnl", 0),
            "win_rate": round(wins / trades * 100, 1) if trades > 0 else 0.0,
        }

    # Daily summary (last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    context["daily_summaries"] = _safe_query(
        TRADE_JOURNAL_DB,
        """
        SELECT date, total_trades, winning_trades, losing_trades,
               net_pnl_cents
        FROM daily_summary
        WHERE date >= ?
        ORDER BY date DESC
        """,
        (week_ago,),
    )

    context["status"] = "ok"
    return context


def get_strategy_config() -> Dict[str, Any]:
    """Load strategy configuration and risk limits."""
    context: Dict[str, Any] = {
        "trading_mode": "unknown",
        "strategies": {},
        "risk_limits": {},
    }

    # Main config
    if os.path.exists(DEEPSTACK_CONFIG):
        try:
            with open(DEEPSTACK_CONFIG) as f:
                config = yaml.safe_load(f) or {}

            context["trading_mode"] = config.get("trading", {}).get("mode", "paper")

            # Strategy states
            strategies = config.get("strategies", {})
            if isinstance(strategies, dict):
                for name, cfg in strategies.items():
                    context["strategies"][name] = {
                        "enabled": cfg.get("enabled", False),
                        "allocation": cfg.get("allocation", 0),
                    }
            elif isinstance(strategies, list):
                for item in strategies:
                    name = item.get("name", "unknown")
                    context["strategies"][name] = {
                        "enabled": item.get("enabled", False),
                        "markets": item.get("markets", []),
                    }
            else:
                logger.warning(
                    "Unexpected strategies config type: %s", type(strategies).__name__
                )

            # Risk settings from main config
            risk = config.get("risk", {})
            context["risk_limits"]["kelly_fraction"] = risk.get("kelly_fraction", 0.25)
            context["risk_limits"]["max_leverage"] = risk.get("max_leverage", 1.5)

        except Exception as e:
            logger.error("Failed to load config.yaml: %s", e)

    # Detailed risk limits
    if os.path.exists(RISK_LIMITS):
        try:
            with open(RISK_LIMITS) as f:
                limits = yaml.safe_load(f) or {}

            context["risk_limits"].update(
                {
                    "daily_stop": limits.get("loss_limits", {}).get("daily_stop", 0.02),
                    "weekly_stop": limits.get("loss_limits", {}).get(
                        "weekly_stop", 0.05
                    ),
                    "max_drawdown": limits.get("loss_limits", {}).get(
                        "max_drawdown", 0.15
                    ),
                    "max_position_pct": limits.get("position_limits", {}).get(
                        "max_position_pct", 0.05
                    ),
                    "emotional_override": limits.get("emotional_override", {}),
                }
            )
        except Exception as e:
            logger.error("Failed to load risk_limits.yaml: %s", e)

    return context


def get_deepsignals_context() -> Dict[str, Any]:
    """
    Get latest DeepSignals data from Supabase.

    Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
    Returns empty context gracefully if unavailable.
    """
    context: Dict[str, Any] = {
        "pcr": None,
        "dark_pool": [],
        "insider_trades": [],
        "congress_trades": [],
        "last_collection": None,
    }

    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not url or not key:
        context["status"] = "supabase_not_configured"
        return context

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        client = httpx.Client(timeout=10)

        # Latest put/call ratios
        resp = client.get(
            f"{url}/rest/v1/deepsignals_pcr?order=date.desc&limit=1",
            headers=headers,
        )
        if resp.status_code == 200:
            rows = resp.json()
            if rows:
                context["pcr"] = rows[0]

        # Recent dark pool / short volume (top 10 by short ratio)
        dp_query = "order=date.desc,short_volume_ratio.desc&limit=10"
        resp = client.get(
            f"{url}/rest/v1/deepsignals_dark_pool?{dp_query}",
            headers=headers,
        )
        if resp.status_code == 200:
            context["dark_pool"] = resp.json()

        # Recent insider trades (last 7 days)
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        insider_query = (
            f"transaction_date=gte.{week_ago}" "&order=transaction_date.desc&limit=10"
        )
        resp = client.get(
            f"{url}/rest/v1/deepsignals_insider?{insider_query}",
            headers=headers,
        )
        if resp.status_code == 200:
            context["insider_trades"] = resp.json()

        # Recent congressional trades
        resp = client.get(
            f"{url}/rest/v1/deepsignals_congress?order=transaction_date.desc&limit=10",
            headers=headers,
        )
        if resp.status_code == 200:
            context["congress_trades"] = resp.json()

        client.close()
        context["status"] = "ok"

    except Exception as e:
        logger.error("DeepSignals fetch failed: %s", e)
        context["status"] = f"error: {str(e)[:100]}"

    return context


def gather_full_context() -> Dict[str, Any]:
    """
    Aggregate all trading context into a single snapshot.

    Returns a dict suitable for injection into Claude's system prompt.
    Each source is independently fetched — partial failures produce partial context.
    """
    now = datetime.now()

    context = {
        "timestamp": now.isoformat(),
        "market_hours": _is_market_hours(now),
        "trade_journal": get_trade_journal_context(),
        "strategy_config": get_strategy_config(),
        "deepsignals": get_deepsignals_context(),
    }

    return context


def format_context_for_prompt(context: Dict[str, Any]) -> str:
    """
    Format the context dict into a readable text block for Claude's system prompt.

    Keeps it concise — Claude doesn't need JSON, it needs readable summaries.
    """
    lines = []
    lines.append(f"=== LIVE TRADING CONTEXT (as of {context['timestamp']}) ===")
    lines.append(f"Market hours: {'OPEN' if context['market_hours'] else 'CLOSED'}")
    lines.append("")

    # Trade Journal
    tj = context.get("trade_journal", {})
    if tj.get("status") == "ok":
        lines.append("-- PORTFOLIO --")
        lines.append(f"Open positions: {len(tj.get('open_positions', []))}")
        for pos in tj.get("open_positions", []):
            ticker = pos.get("market_ticker", "?")
            side = pos.get("side", "?")
            contracts = pos.get("contracts", 0)
            entry = pos.get("entry_price_cents", 0)
            strat = pos.get("strategy", "unknown")
            lines.append(f"  {ticker}: {contracts}x {side}" f" @ {entry}c ({strat})")

        pnl = tj.get("today_pnl_cents", 0)
        lines.append(f"Today P&L: {pnl:+d} cents (${pnl/100:+.2f})")
        total = tj.get("total_trades", 0)
        win_rate = tj.get("win_rate", 0)
        lines.append(f"Overall: {total} trades, {win_rate}% win rate")

        # Strategy performance
        sp = tj.get("strategy_performance", {})
        if sp:
            lines.append("")
            lines.append("-- STRATEGY PERFORMANCE --")
            for name, data in sp.items():
                pnl_cents = data.get("total_pnl_cents", 0)
                lines.append(
                    f"  {name}: {data['trades']} trades, "
                    f"{data['win_rate']}% win, "
                    f"{pnl_cents:+d}c P&L"
                )

        # Recent trades
        recent = tj.get("recent_trades", [])
        if recent:
            lines.append("")
            lines.append("-- RECENT TRADES (last 5) --")
            for t in recent[:5]:
                ticker = t.get("market_ticker", "?")
                action = t.get("action", "?")
                side = t.get("side", "?")
                pnl = t.get("pnl_cents")
                status = t.get("status", "?")
                pnl_str = f", P&L: {pnl:+d}c" if pnl is not None else ""
                lines.append(f"  {action} {side} {ticker} [{status}]{pnl_str}")
    else:
        lines.append("-- PORTFOLIO: No trade journal data available --")

    # Strategy Config
    sc = context.get("strategy_config", {})
    lines.append("")
    lines.append(f"-- STRATEGY CONFIG (mode: {sc.get('trading_mode', 'unknown')}) --")
    strategies = sc.get("strategies", {})
    for name, cfg in strategies.items():
        enabled = cfg.get("enabled", False)
        status = "ENABLED" if enabled else "disabled"
        alloc = cfg.get("allocation")
        alloc_str = f" ({alloc*100:.0f}% allocation)" if alloc else ""
        lines.append(f"  {name}: {status}{alloc_str}")

    # Risk limits
    risk = sc.get("risk_limits", {})
    if risk:
        lines.append("")
        lines.append("-- RISK LIMITS --")
        lines.append(f"  Kelly fraction: {risk.get('kelly_fraction', 'N/A')}")
        lines.append(f"  Daily stop: {risk.get('daily_stop', 'N/A')}")
        lines.append(f"  Max drawdown: {risk.get('max_drawdown', 'N/A')}")
        lines.append(f"  Max position: {risk.get('max_position_pct', 'N/A')}")

    # DeepSignals
    ds = context.get("deepsignals", {})
    if ds.get("status") == "ok":
        lines.append("")
        lines.append("-- DEEPSIGNALS --")

        pcr = ds.get("pcr")
        if pcr:
            lines.append(
                f"  PCR (total): {pcr.get('total_pcr', 'N/A')} | "
                f"Equity: {pcr.get('equity_pcr', 'N/A')} | "
                f"Index: {pcr.get('index_pcr', 'N/A')} "
                f"(date: {pcr.get('date', 'N/A')})"
            )

        dark_pool = ds.get("dark_pool", [])
        if dark_pool:
            lines.append(f"  Dark pool signals ({len(dark_pool)} tickers):")
            for dp in dark_pool[:5]:
                symbol = dp.get("symbol", "?")
                ratio = dp.get("short_volume_ratio", 0)
                lines.append(f"    {symbol}: {ratio:.1%} short volume ratio")

        insider = ds.get("insider_trades", [])
        if insider:
            lines.append(f"  Insider trades ({len(insider)} recent):")
            for it in insider[:3]:
                lines.append(
                    f"    {it.get('issuer_name', '?')}: "
                    f"{it.get('transaction_type', '?')} "
                    f"${it.get('transaction_value', 0):,.0f}"
                )

        congress = ds.get("congress_trades", [])
        if congress:
            lines.append(f"  Congress trades ({len(congress)} recent):")
            for ct in congress[:3]:
                lines.append(
                    f"    {ct.get('representative', '?')}: "
                    f"{ct.get('transaction', '?')} {ct.get('ticker', '?')} "
                    f"({ct.get('amount', 'N/A')})"
                )
    elif ds.get("status"):
        lines.append(f"-- DEEPSIGNALS: {ds['status']} --")

    lines.append("")
    lines.append("=== END TRADING CONTEXT ===")

    return "\n".join(lines)


def _is_market_hours(now: Optional[datetime] = None) -> bool:
    """Check if US stock market is currently open (rough check, no holidays)."""
    # Always use Eastern Time for market hours check
    et = timezone(timedelta(hours=-5))
    if now is None:
        now_et = datetime.now(et)
    elif now.tzinfo is None:
        # Assume UTC if no timezone, convert to ET
        now_et = now.replace(tzinfo=timezone.utc).astimezone(et)
    else:
        now_et = now.astimezone(et)

    weekday = now_et.weekday()
    if weekday >= 5:  # Saturday=5, Sunday=6
        return False
    hour = now_et.hour
    minute = now_et.minute
    # Market hours: 9:30 AM - 4:00 PM ET
    if hour < 9 or (hour == 9 and minute < 30):
        return False
    if hour >= 16:
        return False
    return True


if __name__ == "__main__":
    """Quick test: print the full context."""
    logging.basicConfig(level=logging.INFO)
    ctx = gather_full_context()
    print(format_context_for_prompt(ctx))
    print("\n--- Raw JSON ---")
    print(json.dumps(ctx, indent=2, default=str))
