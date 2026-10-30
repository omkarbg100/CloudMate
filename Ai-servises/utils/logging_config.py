"""Structured JSON logging via structlog."""

from __future__ import annotations

import logging
import os

import structlog


def configure_logging() -> None:
    """Configure structlog for JSON output compatible with ELK / Cloud Logging."""
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        level=log_level,
    )

    # Suppress noisy third-party loggers
    for noisy_logger in ["httpx", "httpcore", "litellm", "urllib3", "LiteLLM"]:
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)
