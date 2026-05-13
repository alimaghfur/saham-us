"""Static reference data used by multiple modules."""
from __future__ import annotations

# Major US indices shown on the dashboard
INDEX_SYMBOLS = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq Composite"),
    ("^DJI", "Dow Jones"),
    ("^RUT", "Russell 2000"),
    ("^VIX", "VIX"),
    ("DX-Y.NYB", "US Dollar Index"),
]

# GICS sectors mapped to Select Sector SPDR ETFs
SECTOR_ETFS = [
    ("Technology", "XLK"),
    ("Financials", "XLF"),
    ("Health Care", "XLV"),
    ("Consumer Discretionary", "XLY"),
    ("Consumer Staples", "XLP"),
    ("Energy", "XLE"),
    ("Industrials", "XLI"),
    ("Materials", "XLB"),
    ("Utilities", "XLU"),
    ("Real Estate", "XLRE"),
    ("Communication Services", "XLC"),
]

# A small, curated universe for MVP screener / scanners (subset of S&P 500).
# Keeps API calls bounded while giving variety across sectors.
DEFAULT_UNIVERSE = [
    # Mega-cap tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AVGO", "ORCL", "ADBE",
    "CRM", "AMD", "INTC", "QCOM", "CSCO", "IBM", "NFLX", "NOW", "INTU", "PLTR",
    # Financials
    "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "V", "MA",
    # Healthcare
    "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
    # Consumer
    "WMT", "HD", "COST", "PG", "KO", "PEP", "MCD", "NKE", "SBUX", "DIS",
    # Industrials / Energy / Others
    "CAT", "BA", "GE", "HON", "LMT", "RTX", "UPS", "FDX",
    "XOM", "CVX", "COP", "SLB",
    "LIN", "DOW",
    "T", "VZ", "TMUS",
    "NEE", "DUK", "SO",
    "PLD", "AMT", "EQIX",
    "SPY", "QQQ", "DIA", "IWM",  # ETFs for market breadth
]

# Top movers universe — smaller list for faster loading, less rate limiting
TOP_MOVERS_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AVGO",
    "JPM", "V", "MA", "UNH", "LLY", "WMT", "HD",
    "XOM", "CVX", "BA", "CAT", "GE",
    "NFLX", "AMD", "CRM", "ORCL", "ADBE",
    "PG", "KO", "MCD", "NKE", "DIS",
]
