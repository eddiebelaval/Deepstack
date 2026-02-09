#!/usr/bin/env python3
"""
DeepSignals Daily Data Collector

Fetches market intelligence data from all DeepSignals sources and
stores results to Supabase. Designed to run at market close via launchd.

Sources:
  cboe   - Put/call ratios (total, equity, index)
  finra  - FINRA RegSHO dark pool / short volume
  edgar  - SEC Form 4 insider trades
  quiver - Congressional trading disclosures

Usage:
  python scripts/deepsignals_collector.py --all
  python scripts/deepsignals_collector.py --source finra
  python scripts/deepsignals_collector.py --source cboe --source edgar
  python scripts/deepsignals_collector.py --help
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from core.data.cboe_client import CBOEClient, PutCallData
from core.data.finra_client import FINRAClient
from core.data.sec_edgar_client import SECEdgarClient
from core.data.quiver_client import QuiverClient

# ── Logging ──────────────────────────────────────────────────────

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            os.path.join(LOG_DIR, "deepsignals_collector.log"),
            encoding="utf-8",
        ),
    ],
)
logger = logging.getLogger("deepsignals.collector")

VALID_SOURCES = ("cboe", "finra", "edgar", "quiver")


# ── Supabase REST helper ────────────────────────────────────────


class SupabaseREST:
    """Thin wrapper around Supabase REST API using httpx."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client: Optional[Any] = None

        if not self.url or not self.key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
            )

    async def _ensure_client(self):
        if self._client is None:
            import httpx
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30, connect=10),
            )
        return self._client

    async def upsert(
        self, table: str, rows: List[Dict], on_conflict: str = ""
    ) -> int:
        """
        Upsert rows to a Supabase table via REST API.

        Args:
            table: Table name
            rows: List of row dicts
            on_conflict: Comma-separated conflict columns for upsert

        Returns:
            Number of rows upserted
        """
        if not rows:
            return 0

        client = await self._ensure_client()
        url = f"{self.url}/rest/v1/{table}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }

        total = 0
        batch_size = 500

        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            params = {}
            if on_conflict:
                params["on_conflict"] = on_conflict

            resp = await client.post(url, json=batch, headers=headers, params=params)
            if resp.status_code in (200, 201):
                total += len(batch)
            else:
                logger.error(
                    f"Supabase upsert to {table} failed: "
                    f"HTTP {resp.status_code} - {resp.text[:200]}"
                )

        return total

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


# ── Collectors ───────────────────────────────────────────────────


async def collect_cboe(db: Optional[SupabaseREST]) -> Dict[str, Any]:
    """Collect CBOE put/call ratios."""
    result: Dict[str, Any] = {"source": "cboe", "status": "ok", "records": 0, "details": {}}
    client = CBOEClient()

    try:
        ratios = {}
        for ratio_type in ("total", "equity", "index"):
            data = await client.get_put_call_ratio(ratio_type)
            ratios[ratio_type] = data.put_call_ratio
            logger.info(f"CBOE {ratio_type} PCR: {data.put_call_ratio:.3f} ({data.date})")

        percentile = await client.get_pcr_percentile("total")
        result["details"] = {
            "pcr_total": ratios["total"],
            "pcr_equity": ratios["equity"],
            "pcr_index": ratios["index"],
            "pcr_percentile": round(percentile, 4),
        }
        result["records"] = 3
        logger.info(f"CBOE collection complete: total PCR={ratios['total']:.3f}, percentile={percentile:.1%}")

    except Exception as e:
        logger.error(f"CBOE collection failed: {e}")
        result["status"] = "error"
        result["error"] = str(e)
    finally:
        await client.close()

    return result


async def collect_finra(db: Optional[SupabaseREST]) -> Dict[str, Any]:
    """Collect FINRA dark pool / short volume data."""
    result: Dict[str, Any] = {"source": "finra", "status": "ok", "records": 0}
    client = FINRAClient()

    try:
        records = await client.get_daily_short_volume()
        if not records:
            logger.warning("No FINRA records for today")
            result["records"] = 0
            return result

        logger.info(f"FINRA: fetched {len(records)} short volume records")

        if db:
            rows = [
                {
                    "symbol": r.symbol,
                    "date": r.date.isoformat(),
                    "short_volume": r.short_volume,
                    "short_exempt_volume": r.short_exempt_volume,
                    "total_volume": r.total_volume,
                    "short_ratio": round(r.short_ratio, 6),
                    "market": r.market,
                }
                for r in records
            ]
            stored = await db.upsert(
                "deepsignals_dark_pool", rows, on_conflict="symbol,date,market"
            )
            logger.info(f"Stored {stored} FINRA records to Supabase")

        result["records"] = len(records)

    except Exception as e:
        logger.error(f"FINRA collection failed: {e}")
        result["status"] = "error"
        result["error"] = str(e)
    finally:
        await client.close()

    return result


async def collect_edgar(db: Optional[SupabaseREST]) -> Dict[str, Any]:
    """Collect SEC EDGAR insider trades (Form 4)."""
    result: Dict[str, Any] = {"source": "edgar", "status": "ok", "records": 0}
    client = SECEdgarClient()

    try:
        trades = await client.get_recent_insider_trades(limit=100)
        if not trades:
            logger.warning("No EDGAR insider trades found")
            return result

        logger.info(f"EDGAR: fetched {len(trades)} insider trades")

        if db:
            rows = [
                {
                    "filer_name": t.filer_name,
                    "filer_cik": t.filer_cik,
                    "company": t.company,
                    "symbol": t.ticker,
                    "filing_date": t.filing_date,
                    "transaction_type": t.transaction_type,
                    "shares": t.shares,
                    "price_per_share": t.price_per_share,
                    "total_value": t.total_value,
                    "ownership_type": t.ownership_type,
                    "source_url": t.source_url,
                }
                for t in trades
            ]
            stored = await db.upsert("deepsignals_insider_trades", rows)
            logger.info(f"Stored {stored} insider trades to Supabase")

        result["records"] = len(trades)

    except Exception as e:
        logger.error(f"EDGAR collection failed: {e}")
        result["status"] = "error"
        result["error"] = str(e)
    finally:
        await client.close()

    return result


async def collect_quiver(db: Optional[SupabaseREST]) -> Dict[str, Any]:
    """Collect Quiver Quantitative congress trades."""
    result: Dict[str, Any] = {"source": "quiver", "status": "ok", "records": 0}
    client = QuiverClient()

    try:
        trades = await client.get_recent_congress_trades(limit=50)
        if not trades:
            logger.warning("No congress trades found")
            return result

        logger.info(f"Quiver: fetched {len(trades)} congress trades")

        if db:
            rows = [
                {
                    "politician": t.politician,
                    "party": t.party,
                    "chamber": t.chamber,
                    "state": t.state,
                    "symbol": t.ticker,
                    "company_name": t.company_name,
                    "transaction_type": t.transaction_type,
                    "transaction_date": t.transaction_date,
                    "disclosure_date": t.disclosure_date,
                    "amount_min": t.amount_min,
                    "amount_max": t.amount_max,
                }
                for t in trades
            ]
            stored = await db.upsert("deepsignals_congress_trades", rows)
            logger.info(f"Stored {stored} congress trades to Supabase")

        result["records"] = len(trades)

    except Exception as e:
        logger.error(f"Quiver collection failed: {e}")
        result["status"] = "error"
        result["error"] = str(e)
    finally:
        await client.close()

    return result


COLLECTORS = {
    "cboe": collect_cboe,
    "finra": collect_finra,
    "edgar": collect_edgar,
    "quiver": collect_quiver,
}


# ── Main ─────────────────────────────────────────────────────────


async def run(sources: List[str]):
    """Run selected collectors."""
    start = datetime.now()
    logger.info("=" * 60)
    logger.info(f"DeepSignals collector starting: sources={sources}")

    # Load env files
    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
    except ImportError:
        pass

    # Init Supabase (optional — collector still logs data if Supabase is down)
    db: Optional[SupabaseREST] = None
    try:
        db = SupabaseREST()
        logger.info("Supabase connection ready")
    except Exception as e:
        logger.warning(f"Supabase unavailable, data will not be stored: {e}")

    # Run selected collectors concurrently
    tasks = [COLLECTORS[s](db) for s in sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Report results
    for i, r in enumerate(results):
        src = sources[i]
        if isinstance(r, Exception):
            logger.error(f"  {src}: EXCEPTION - {r}")
        elif r.get("status") == "error":
            logger.error(f"  {src}: ERROR - {r.get('error', 'unknown')}")
        else:
            logger.info(f"  {src}: OK - {r.get('records', 0)} records")

    if db:
        await db.close()

    elapsed = (datetime.now() - start).total_seconds()
    logger.info(f"Collection finished in {elapsed:.1f}s")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="deepsignals_collector",
        description="DeepSignals daily data collector — fetches market intelligence and stores to Supabase",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all collectors (cboe, finra, edgar, quiver)",
    )
    parser.add_argument(
        "--source",
        action="append",
        choices=VALID_SOURCES,
        help="Run a specific source collector (can be repeated)",
    )
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.all:
        sources = list(VALID_SOURCES)
    elif args.source:
        sources = args.source
    else:
        parser.print_help()
        sys.exit(0)

    try:
        asyncio.run(run(sources))
    except KeyboardInterrupt:
        logger.info("Collection interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
