import logging
import os
from logging.handlers import RotatingFileHandler

from app.settings import settings

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")

_configured = False


def setup_logging() -> None:
    """Configure root logging with a rotating file handler + console handler."""
    global _configured
    if _configured:
        return

    os.makedirs(LOG_DIR, exist_ok=True)

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    root = logging.getLogger()
    root.setLevel(level)

    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5_000_000, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    _configured = True
