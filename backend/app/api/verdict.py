"""Final Verdict API — the ultimate trading decision."""
from fastapi import APIRouter
from app.services.ensemble_verdict import get_ensemble_verdict

router = APIRouter(prefix="/verdict", tags=["verdict"])

@router.get("/{symbol}")
async def final_verdict(symbol: str):
    """The ULTIMATE trading verdict combining ALL analysis models.
    
    Returns STRONG BUY / BUY / LEAN BUY / HOLD / LEAN SELL / SELL / STRONG SELL / DO NOT TRADE
    with confidence %, consensus breakdown, and actionable trade plan.
    """
    return await get_ensemble_verdict().final_verdict(symbol)
