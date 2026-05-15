"""SQLAlchemy models."""
import logging

log = logging.getLogger(__name__)

try:
    from app.models.user import User  # noqa: F401
    from app.models.watchlist import Watchlist, WatchlistItem  # noqa: F401
    from app.models.portfolio import Portfolio, PortfolioTransaction  # noqa: F401
    from app.models.journal import TradingJournal  # noqa: F401
except ImportError as e:
    log.warning("Could not import models (missing dependencies): %s", e)
