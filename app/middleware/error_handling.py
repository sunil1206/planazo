"""Consistent JSON error shape across the whole API.

Every error response keeps the existing ``detail`` key (so no existing
frontend error handling breaks) and additionally includes ``error`` (a short
machine-readable code) and ``path``. Registered once from app/main.py via
``register_error_handlers(app)``.

Why the catch-all Exception handler at the bottom matters, beyond just a
nicer error body: registering a handler for FastAPI's base ``Exception``
class doesn't just "handle it inside the app" the way it does for
HTTPException — Starlette special-cases it (see
``Starlette.build_middleware_stack``): any handler registered for
``Exception`` (or status 500) is pulled out and given to the *outermost*
``ServerErrorMiddleware``, which wraps every other middleware, including
CORSMiddleware. That response is sent directly through the raw ASGI
``send`` callable, so it never passes back out through CORSMiddleware's
own send-wrapper — meaning it gets **no** Access-Control-Allow-Origin
header no matter what CORSMiddleware is configured with. The browser then
reports this to JS as a plain CORS failure / "Network Error", completely
hiding the real 500 and its message — which is exactly what made a real
backend bug (an unhandled exception in GET
/api/invitations/websites/{slug}/) look like "the Edit button does
nothing" from the frontend: the request 500'd, but the browser refused to
let the frontend see the response at all.

The fix is to attach the CORS headers ourselves, in this handler, based on
the same allowlist CORSMiddleware uses (settings.cors_origins) — see
_cors_headers_for() below.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.utils.validators import ValidationError

logger = logging.getLogger("planazo")


def _cors_headers_for(request: Request) -> dict:
    """Replicates just enough of CORSMiddleware's decision for the one path
    (ServerErrorMiddleware's substitute response) that never passes through
    CORSMiddleware itself. Only adds headers when the request's Origin is
    actually in the configured allowlist — never a bare "*", since
    allow_credentials=True on the real CORSMiddleware forbids that anyway."""
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


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
            content={
                "detail": jsonable_encoder(exc.errors()),
                "error": "validation_error",
                "path": request.url.path,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error": "http_error", "path": request.url.path},
            headers=getattr(exc, "headers", None),
        )

    # Catch-all for genuinely unexpected exceptions (DB errors, bugs, etc.).
    # See module docstring — this is what keeps CORS headers on 500s instead
    # of the browser reporting a misleading "blocked by CORS policy".
    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "error": "internal_error",
                "path": request.url.path,
            },
            headers=_cors_headers_for(request),
        )
