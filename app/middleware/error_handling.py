"""Consistent JSON error shape across the whole API.

Every error response keeps the existing ``detail`` key (so no existing
frontend error handling breaks) and additionally includes ``error`` (a short
machine-readable code) and ``path``. Registered once from app/main.py via
``register_error_handlers(app)``.
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.validators import ValidationError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ValidationError)
    async def _validation_error_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "error": "validation_error", "path": request.url.path},
        )

    @app.exception_handler(RequestValidationError)
    async def _pydantic_validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "error": "validation_error", "path": request.url.path},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error": "http_error", "path": request.url.path},
            headers=getattr(exc, "headers", None),
        )
