from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from app.core.logging import get_logger

logger = get_logger("exceptions")


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[list[ErrorDetail]] = None
    request_id: Optional[str] = None


class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None


class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[list[ErrorDetail]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        "application_error",
        code=exc.code,
        message=exc.message,
        details=exc.details,
        request_id=request_id,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.code,
            message=exc.message,
            details=exc.details,
            request_id=request_id,
        ).model_dump(),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        "http_error",
        status_code=exc.status_code,
        detail=exc.detail,
        request_id=request_id,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            message=str(exc.detail),
            request_id=request_id,
        ).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    details = [
        ErrorDetail(
            code="VALIDATION_ERROR",
            message=err["msg"],
            field=".".join(str(x) for x in err["loc"]),
        )
        for err in exc.errors()
    ]
    logger.warning(
        "validation_error",
        details=details,
        request_id=request_id,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="VALIDATION_ERROR",
            message="Request validation failed",
            details=details,
            request_id=request_id,
        ).model_dump(),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.exception(
        "unhandled_exception",
        error=str(exc),
        request_id=request_id,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            message="An unexpected error occurred",
            request_id=request_id,
        ).model_dump(),
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)