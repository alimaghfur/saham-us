"""Root entry point — allows `uvicorn main:app` from the backend/ directory."""
from app.main import app  # noqa: F401
