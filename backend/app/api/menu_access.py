"""Menu access control API — manage which menus each role can access."""
from __future__ import annotations

import json

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.menu_access import MenuAccess
from app.models.user import User
from app.api.deps import get_current_user, require_super_admin

router = APIRouter(prefix="/menu-access", tags=["menu-access"])

# All available menus in the system
ALL_MENUS = [
    {"path": "/", "name": "Dashboard", "section": "Overview"},
    {"path": "/markets", "name": "Markets & Sectors", "section": "Overview"},
    {"path": "/markets/hours", "name": "Market Hours", "section": "Overview"},
    {"path": "/macro", "name": "Macro Economy", "section": "Overview"},
    {"path": "/recap", "name": "Weekly Recap", "section": "Overview"},
    {"path": "/score", "name": "Stock Score", "section": "Analisa"},
    {"path": "/prediction", "name": "Prediksi Saham", "section": "Analisa"},
    {"path": "/ml-prediction", "name": "ML Prediction", "section": "Analisa"},
    {"path": "/sentiment", "name": "Sentimen Berita", "section": "Analisa"},
    {"path": "/social-sentiment", "name": "Social Buzz", "section": "Analisa"},
    {"path": "/earnings-predict", "name": "Earnings Predict", "section": "Analisa"},
    {"path": "/insider-trading", "name": "Insider Trading", "section": "Analisa"},
    {"path": "/patterns", "name": "Pattern Recognition", "section": "Analisa"},
    {"path": "/recommendations", "name": "Rekomendasi", "section": "Analisa"},
    {"path": "/opportunities", "name": "Buy the Dip", "section": "Analisa"},
    {"path": "/screener", "name": "Screener", "section": "Analisa"},
    {"path": "/ai", "name": "AI Insights", "section": "Analisa"},
    {"path": "/news", "name": "News", "section": "Analisa"},
    {"path": "/swing", "name": "Swing Trading", "section": "Trading"},
    {"path": "/scalping", "name": "Scalping", "section": "Trading"},
    {"path": "/backtest", "name": "Backtesting", "section": "Trading"},
    {"path": "/options", "name": "Options Chain", "section": "Trading"},
    {"path": "/unusual-options", "name": "Unusual Options", "section": "Trading"},
    {"path": "/dark-pool", "name": "Dark Pool", "section": "Trading"},
    {"path": "/fibonacci", "name": "Fibonacci", "section": "Trading"},
    {"path": "/monte-carlo", "name": "Monte Carlo", "section": "Trading"},
    {"path": "/calculator", "name": "Position Calculator", "section": "Trading"},
    {"path": "/calculator/dca", "name": "DCA Planner", "section": "Trading"},
    {"path": "/watchlist", "name": "Watchlist", "section": "Portfolio"},
    {"path": "/paper-trading", "name": "Paper Trading", "section": "Portfolio"},
    {"path": "/portfolio-optimizer", "name": "Portfolio Optimizer", "section": "Portfolio"},
    {"path": "/copy-trading", "name": "Copy Trading", "section": "Portfolio"},
    {"path": "/portfolio", "name": "Portfolio", "section": "Portfolio"},
    {"path": "/etf-screener", "name": "ETF Screener", "section": "Portfolio"},
    {"path": "/dividends", "name": "Dividends & DRIP", "section": "Portfolio"},
    {"path": "/journal", "name": "Trading Journal", "section": "Portfolio"},
    {"path": "/alerts", "name": "Alerts", "section": "Portfolio"},
    {"path": "/risk", "name": "Risk Dashboard", "section": "Portfolio"},
    {"path": "/goals", "name": "Goal Tracker", "section": "Portfolio"},
    {"path": "/education", "name": "Panduan Investasi", "section": "Belajar"},
    {"path": "/economic-calendar", "name": "Economic Calendar", "section": "Belajar"},
    {"path": "/market-breadth", "name": "Market Breadth", "section": "Belajar"},
    {"path": "/account", "name": "Akun Saya", "section": "Settings"},
    {"path": "/settings", "name": "Settings", "section": "Settings"},
]


class MenuAccessResponse(BaseModel):
    role: str
    allowed_menus: list[str]


class UpdateMenuAccessRequest(BaseModel):
    allowed_menus: list[str]


@router.get("/all-menus")
async def get_all_menus():
    """Get list of all available menus in the system."""
    return ALL_MENUS


@router.get("/my-menus")
async def get_my_menus(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get menus accessible by the current user based on their role."""
    # Super admin always has access to everything
    if current_user.role == "super_admin":
        return [m["path"] for m in ALL_MENUS] + ["/admin", "/menu-settings"]

    result = await db.execute(select(MenuAccess).where(MenuAccess.role == current_user.role))
    access = result.scalar_one_or_none()

    if access is None:
        # Default: allow all menus for admin if not configured
        return [m["path"] for m in ALL_MENUS]

    return json.loads(access.allowed_menus)


@router.get("/{role}", response_model=MenuAccessResponse)
async def get_role_access(
    role: str,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get menu access config for a specific role (Super Admin only)."""
    result = await db.execute(select(MenuAccess).where(MenuAccess.role == role))
    access = result.scalar_one_or_none()

    if access is None:
        # Not configured yet — return all menus as default
        return MenuAccessResponse(
            role=role,
            allowed_menus=[m["path"] for m in ALL_MENUS],
        )

    return MenuAccessResponse(
        role=role,
        allowed_menus=json.loads(access.allowed_menus),
    )


@router.put("/{role}", response_model=MenuAccessResponse)
async def update_role_access(
    role: str,
    body: UpdateMenuAccessRequest,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update menu access for a role (Super Admin only)."""
    if role == "super_admin":
        raise HTTPException(status_code=400, detail="Super Admin selalu punya akses penuh, tidak bisa dibatasi")

    result = await db.execute(select(MenuAccess).where(MenuAccess.role == role))
    access = result.scalar_one_or_none()

    if access is None:
        access = MenuAccess(role=role, allowed_menus=json.dumps(body.allowed_menus))
        db.add(access)
    else:
        access.allowed_menus = json.dumps(body.allowed_menus)
        db.add(access)

    await db.flush()

    return MenuAccessResponse(
        role=role,
        allowed_menus=body.allowed_menus,
    )
