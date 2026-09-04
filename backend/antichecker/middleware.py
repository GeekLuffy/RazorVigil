"""
RazorVigil Sentinel — Drop-in Anti-Checker ASGI Middleware.

Provides plug-and-play defense against automated card checkers for any
FastAPI, Starlette, or ASGI-compatible payment service.

Usage:
    from backend.antichecker.middleware import AntiCheckerMiddleware
    app.add_middleware(AntiCheckerMiddleware)
"""

from __future__ import annotations

import json
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from backend.antichecker.anti_checker_engine import AntiCheckerGuard


class AntiCheckerMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, enable_tarpit: bool = True):
        super().__init__(app)
        self.guard = AntiCheckerGuard(enable_tarpit_poisoning=enable_tarpit)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only inspect checkout and payment processing paths
        if request.url.path in ("/checkout", "/v1/standard_checkout/payments/create/ajax"):
            # Check for direct scraper header anomalies
            user_agent = request.headers.get("user-agent", "").lower()
            ja3_mismatch = request.headers.get("x-ja3-mismatch") == "1"

            # Check if using Python requests directly without standard browser headers
            if "python-requests" in user_agent or "curl_cffi" in user_agent:
                tarpit = self.guard.generate_poisoned_honeypot_response("4111110000001111")
                return JSONResponse(status_code=200, content=tarpit)

        return await call_next(request)
