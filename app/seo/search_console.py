"""SEO module — Google Search Console integration (real OAuth2 + the actual
Search Analytics API, not a mock).

This is genuinely free and returns real data (indexed queries, real clicks/
impressions/CTR/average position) — but two things have to happen outside
this codebase before any of it works, and neither can be done by code:

  1. The property (https://planazo.in/) must be verified in Google Search
     Console under an account that has access to it.
  2. That same Google account must complete the OAuth consent screen this
     module's /connect endpoint sends them to, granting the
     "https://www.googleapis.com/auth/webmasters.readonly" scope.

Until both are done, /api/seo/admin/gsc/status reports connected=false and
/report returns a clear 409, never fabricated numbers.

Uses the existing GOOGLE_CLIENT_ID/SECRET (already configured for user
login) — the redirect URI below just needs to also be added as an
"Authorized redirect URI" on that same OAuth client in Google Cloud Console.
"""
from __future__ import annotations
from typing import List
from urllib.parse import urlencode
import httpx

from app.core.config import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SEARCH_ANALYTICS_URL = "https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"


class SearchConsoleError(Exception):
    pass


def redirect_uri() -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/api/seo/admin/gsc/callback"


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",  # forces a refresh_token every time, not just first consent
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
        })
    if resp.status_code != 200:
        raise SearchConsoleError(f"Token exchange failed: {resp.text}")
    return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
    if resp.status_code != 200:
        raise SearchConsoleError(f"Access token refresh failed: {resp.text}")
    return resp.json()["access_token"]


async def query_search_analytics(
    access_token: str, site_url: str, start_date: str, end_date: str,
    dimensions: List[str], row_limit: int = 25,
) -> dict:
    from urllib.parse import quote
    url = SEARCH_ANALYTICS_URL.format(site=quote(site_url, safe=""))

    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"startDate": start_date, "endDate": end_date, "dimensions": dimensions, "rowLimit": row_limit},
        )
    if resp.status_code != 200:
        raise SearchConsoleError(f"Search Analytics query failed: {resp.text}")
    return resp.json()
