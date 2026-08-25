import sys
import uuid
import structlog
from structlog.stdlib import LoggerFactory
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    log_level = settings.LOG_LEVEL.upper()

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
    ]

    if settings.DEBUG:
        structlog.configure(
            processors=shared_processors + [
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=LoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        structlog.configure(
            processors=shared_processors + [
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    import logging
    logging.basicConfig(level=log_level)


def get_logger(name: str = None) -> structlog.BoundLogger:
    return structlog.get_logger(name)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        logger = get_logger("request")
        logger.info("request_started", method=request.method, url=str(request.url))

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        logger.info("request_completed", status_code=response.status_code)
        return response