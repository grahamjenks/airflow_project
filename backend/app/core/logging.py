from __future__ import annotations

import json
import logging
import time
from typing import Any

from pythonjsonlogger import jsonlogger

from app.core.config import settings


def configure_logging() -> None:
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter("%(levelname)s %(message)s %(name)s %(asctime)s")
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())


def log_event(logger: logging.Logger, event: str, **fields: Any) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, default=str))


def now_ms() -> int:
    return int(time.time() * 1000)

