import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Import core components
# Note: In a real app, these would be injected or singletons
from core.agents.strategy_agent import StrategyAgent
from core.broker.paper_trader import PaperTrader
from core.config import get_config
from core.data.alpaca_client import AlpacaClient

logger = logging.getLogger(__name__)

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None


# Initialize components (Lazy loading or singleton pattern recommended for production)
config = get_config()
# We need an Alpaca client for the trader and agent
# In a real app, this should be shared from main.py
alpaca = AlpacaClient(
    api_key=config.alpaca_api_key or "dummy",
    secret_key=config.alpaca_secret_key or "dummy",
)
trader = PaperTrader(config, alpaca)
agent = StrategyAgent()

from dataclasses import asdict


@router.post("/api/command", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """
    Execute a CLI-style command from the chat interface.
    Supported commands:
    - /analyze <symbol>
    - /screen
    - /order <side> <symbol> <qty>
    """
    cmd = request.command.strip()
    parts = cmd.split()

    if not parts:
        raise HTTPException(status_code=400, detail="Empty command")

    action = parts[0].lower()

    try:
        if action == "/analyze":
            if len(parts) < 2:
                return CommandResponse(
                    status="error", message="Usage: /analyze <symbol>"
                )

            symbol = parts[1].upper()
            # Run analysis
            # Note: This might be slow, in production use background tasks
            analysis = await agent.analyze_stock(symbol)
            return CommandResponse(
                status="success",
                message=f"Analysis for {symbol} complete.",
                data=asdict(analysis),
            )

        elif action == "/screen":
            # Run screener
            # Placeholder for actual screener logic
            return CommandResponse(
                status="success",
                message="Screener results",
                data={"matches": ["AAPL", "MSFT", "TSLA"]},  # Mock data
            )

        elif action == "/order":
            if len(parts) < 4:
                return CommandResponse(
                    status="error", message="Usage: /order <buy/sell> <symbol> <qty>"
                )

            side = parts[1].upper()
            symbol = parts[2].upper()
            try:
                qty = int(parts[3])
            except ValueError:
                return CommandResponse(
                    status="error", message="Quantity must be an integer"
                )

            # Place order
            order = await trader.submit_order(
                symbol=symbol, qty=qty, side=side, type="market", time_in_force="day"
            )

            return CommandResponse(
                status="success",
                message=f"Order placed: {side} {qty} {symbol}",
                data=order,
            )

        else:
            return CommandResponse(status="error", message=f"Unknown command: {action}")

    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return CommandResponse(status="error", message=str(e))
