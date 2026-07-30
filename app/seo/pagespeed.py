"""SEO module — Core Web Vitals via Google's real PageSpeed Insights API.

Free, no Google Cloud project strictly required (works unauthenticated at a
lower rate limit — set PAGESPEED_API_KEY in .env.production to raise it).
Every number returned here comes straight from Google's own Lighthouse run
against the live URL — nothing estimated or hardcoded.

https://developers.google.com/speed/docs/insights/v5/get-started
"""
from __future__ import annotations
from typing import Optional
import httpx

from app.core.config import settings

PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


class PageSpeedError(Exception):
    pass


async def fetch_core_web_vitals(url: str, strategy: str = "mobile") -> dict:
    """Runs a real PageSpeed Insights check against `url` and returns the
    parsed metrics. Raises PageSpeedError with Google's own message on
    failure (invalid URL, rate limited, etc.) — never falls back to fake
    numbers."""
    if strategy not in ("mobile", "desktop"):
        raise ValueError("strategy must be 'mobile' or 'desktop'")

    params = {"url": url, "strategy": strategy, "category": "performance"}
    if settings.PAGESPEED_API_KEY:
        params["key"] = settings.PAGESPEED_API_KEY

    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        resp = await client.get(PSI_ENDPOINT, params=params)

    if resp.status_code != 200:
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            detail = resp.text
        raise PageSpeedError(f"PageSpeed Insights returned {resp.status_code}: {detail}")

    data = resp.json()
    lighthouse = data.get("lighthouseResult", {})
    audits = lighthouse.get("audits", {})
    categories = lighthouse.get("categories", {})

    def _metric_ms(audit_id: str) -> Optional[float]:
        val = audits.get(audit_id, {}).get("numericValue")
        return round(val, 1) if val is not None else None

    performance_score = categories.get("performance", {}).get("score")

    return {
        "performance_score": round(performance_score * 100) if performance_score is not None else None,
        "lcp_ms": _metric_ms("largest-contentful-paint"),
        "cls": audits.get("cumulative-layout-shift", {}).get("numericValue"),
        "tbt_ms": _metric_ms("total-blocking-time"),
        "fcp_ms": _metric_ms("first-contentful-paint"),
    }
