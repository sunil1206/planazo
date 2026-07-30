"""SEO module — router.

Two public, unauthenticated, root-level endpoints (not under /api — search
engines expect /sitemap.xml and /robots.txt at the domain root):

  GET /sitemap.xml
  GET /robots.txt

Plus an ADMIN-only CRUD surface for overrides and robots rules under
/api/seo/admin/*. There's also an SQLAdmin view registered in
app/admin/views.py for the same tables — that one's usable immediately with
zero frontend work; this JSON API is here for when a dedicated SEO dashboard
page gets built (see SEO_ROADMAP.md).
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Query
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.seo.models import (
    SeoMetaOverride, SeoRobotsRule, SeoRedirect,
    SeoPerformanceSnapshot, BlogPost, SeoSearchConsoleToken,
)
from app.seo.schemas import (
    SeoMetaOverrideCreate, SeoMetaOverrideUpdate, SeoMetaOverrideRead,
    SeoRobotsRuleCreate, SeoRobotsRuleUpdate, SeoRobotsRuleRead,
    SeoRedirectCreate, SeoRedirectUpdate, SeoRedirectRead,
    SeoAnalysisRequest, SeoAnalysisResult,
    SitemapSummary,
    PerformanceCheckRequest, SeoPerformanceSnapshotRead,
    BlogPostCreate, BlogPostUpdate, BlogPostRead,
    GscStatus, GscReport, GscReportRow,
)
from app.seo.sitemap import collect_sitemap_urls, render_sitemap_xml
from app.seo.robots import build_robots_txt
from app.seo.analysis import analyze_seo
from app.seo.pagespeed import fetch_core_web_vitals, PageSpeedError
from app.seo import search_console as gsc

logger = logging.getLogger("planazo")

router = APIRouter(tags=["seo"])


def _require_admin(user: User) -> None:
    if user.role != "ADMIN" and not user.is_superuser:
        raise HTTPException(403, "Admin access required")


# ── Public: sitemap.xml / robots.txt ───────────────────────────────────────────

@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml(db: AsyncSession = Depends(get_db)):
    urls = await collect_sitemap_urls(db)
    return Response(content=render_sitemap_xml(urls), media_type="application/xml")


@router.get("/robots.txt", include_in_schema=False)
async def robots_txt(db: AsyncSession = Depends(get_db)):
    content = await build_robots_txt(db)
    return Response(content=content, media_type="text/plain")


# ── Admin: sitemap summary ─────────────────────────────────────────────────────

@router.get("/api/seo/admin/sitemap-summary", response_model=SitemapSummary)
async def sitemap_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    urls = await collect_sitemap_urls(db)
    by_source: dict[str, int] = {}
    for u in urls:
        by_source[u.source] = by_source.get(u.source, 0) + 1
    return SitemapSummary(total_urls=len(urls), by_source=by_source)


# ── Admin: meta overrides CRUD ─────────────────────────────────────────────────

@router.get("/api/seo/admin/overrides", response_model=List[SeoMetaOverrideRead])
async def list_overrides(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoMetaOverride).order_by(SeoMetaOverride.updated_at.desc().nullslast()))
    return result.scalars().all()


@router.post("/api/seo/admin/overrides", response_model=SeoMetaOverrideRead, status_code=201)
async def create_override(
    body: SeoMetaOverrideCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    existing = await db.execute(select(SeoMetaOverride).where(SeoMetaOverride.path == body.path))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"An override for {body.path} already exists")
    override = SeoMetaOverride(**body.model_dump())
    db.add(override)
    await db.commit()
    await db.refresh(override)
    return override


@router.put("/api/seo/admin/overrides/{override_id}", response_model=SeoMetaOverrideRead)
async def update_override(
    override_id: int,
    body: SeoMetaOverrideUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoMetaOverride).where(SeoMetaOverride.id == override_id))
    override = result.scalar_one_or_none()
    if not override:
        raise HTTPException(404, "Override not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(override, field, val)
    await db.commit()
    await db.refresh(override)
    return override


@router.delete("/api/seo/admin/overrides/{override_id}", status_code=204)
async def delete_override(
    override_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoMetaOverride).where(SeoMetaOverride.id == override_id))
    override = result.scalar_one_or_none()
    if not override:
        raise HTTPException(404, "Override not found")
    await db.delete(override)
    await db.commit()


# ── Admin: robots.txt rules CRUD ───────────────────────────────────────────────

@router.get("/api/seo/admin/robots-rules", response_model=List[SeoRobotsRuleRead])
async def list_robots_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRobotsRule))
    return result.scalars().all()


@router.post("/api/seo/admin/robots-rules", response_model=SeoRobotsRuleRead, status_code=201)
async def create_robots_rule(
    body: SeoRobotsRuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    rule = SeoRobotsRule(**body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/api/seo/admin/robots-rules/{rule_id}", response_model=SeoRobotsRuleRead)
async def update_robots_rule(
    rule_id: int,
    body: SeoRobotsRuleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRobotsRule).where(SeoRobotsRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(rule, field, val)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/api/seo/admin/robots-rules/{rule_id}", status_code=204)
async def delete_robots_rule(
    rule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRobotsRule).where(SeoRobotsRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()


# ── Admin: redirects CRUD ──────────────────────────────────────────────────────

@router.get("/api/seo/admin/redirects", response_model=List[SeoRedirectRead])
async def list_redirects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRedirect).order_by(SeoRedirect.updated_at.desc().nullslast()))
    return result.scalars().all()


@router.post("/api/seo/admin/redirects", response_model=SeoRedirectRead, status_code=201)
async def create_redirect(
    body: SeoRedirectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    existing = await db.execute(select(SeoRedirect).where(SeoRedirect.source_path == body.source_path))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"A redirect for {body.source_path} already exists")
    redirect = SeoRedirect(**body.model_dump())
    db.add(redirect)
    await db.commit()
    await db.refresh(redirect)
    return redirect


@router.put("/api/seo/admin/redirects/{redirect_id}", response_model=SeoRedirectRead)
async def update_redirect(
    redirect_id: int,
    body: SeoRedirectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRedirect).where(SeoRedirect.id == redirect_id))
    redirect = result.scalar_one_or_none()
    if not redirect:
        raise HTTPException(404, "Redirect not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(redirect, field, val)
    await db.commit()
    await db.refresh(redirect)
    return redirect


@router.delete("/api/seo/admin/redirects/{redirect_id}", status_code=204)
async def delete_redirect(
    redirect_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoRedirect).where(SeoRedirect.id == redirect_id))
    redirect = result.scalar_one_or_none()
    if not redirect:
        raise HTTPException(404, "Redirect not found")
    await db.delete(redirect)
    await db.commit()


# ── On-page SEO analysis ────────────────────────────────────────────────────────
# Any authenticated user (not admin-only) — this is the same "traffic light"
# checklist a couple/birthday-page owner sees live in their own editor
# (frontend/src/lib/seoAnalysis.js runs the same rules client-side for
# instant feedback; this endpoint is for API consumers / tests / anywhere a
# server-side check is more convenient than duplicating the JS).

@router.post("/api/seo/analyze", response_model=SeoAnalysisResult)
async def analyze(
    body: SeoAnalysisRequest,
    user: User = Depends(get_current_user),
):
    return analyze_seo(
        title=body.title,
        meta_description=body.meta_description,
        slug=body.slug,
        content=body.content,
        focus_keyword=body.focus_keyword,
    )


# ── Core Web Vitals (real PageSpeed Insights data) ──────────────────────────────

@router.post("/api/seo/admin/performance/check", response_model=SeoPerformanceSnapshotRead, status_code=201)
async def run_performance_check(
    body: PerformanceCheckRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    url = f"{settings.FRONTEND_URL.rstrip('/')}/{body.path.lstrip('/')}"
    try:
        metrics = await fetch_core_web_vitals(url, strategy=body.strategy)
    except PageSpeedError as exc:
        raise HTTPException(502, f"PageSpeed Insights check failed: {exc}")

    snapshot = SeoPerformanceSnapshot(path=body.path, strategy=body.strategy, **metrics)
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


@router.get("/api/seo/admin/performance", response_model=List[SeoPerformanceSnapshotRead])
async def list_performance_snapshots(
    path: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    q = select(SeoPerformanceSnapshot).order_by(SeoPerformanceSnapshot.fetched_at.desc()).limit(limit)
    if path:
        q = q.where(SeoPerformanceSnapshot.path == path)
    result = await db.execute(q)
    return result.scalars().all()


# ── Blog admin CRUD ──────────────────────────────────────────────────────────────
# Public listing/detail pages are server-rendered — see app/ssr/router.py —
# for the same crawler-visibility reason as the vendor pages.

@router.get("/api/seo/admin/blog", response_model=List[BlogPostRead])
async def list_blog_posts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(BlogPost).order_by(BlogPost.created_at.desc()))
    return result.scalars().all()


@router.post("/api/seo/admin/blog", response_model=BlogPostRead, status_code=201)
async def create_blog_post(
    body: BlogPostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    existing = await db.execute(select(BlogPost).where(BlogPost.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"A post with slug {body.slug} already exists")
    post = BlogPost(**body.model_dump())
    if post.status == "published" and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


@router.put("/api/seo/admin/blog/{post_id}", response_model=BlogPostRead)
async def update_blog_post(
    post_id: int,
    body: BlogPostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    was_published = post.status == "published"
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(post, field, val)
    if post.status == "published" and not was_published and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    return post


@router.delete("/api/seo/admin/blog/{post_id}", status_code=204)
async def delete_blog_post(
    post_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    await db.delete(post)
    await db.commit()


# ── Google Search Console ────────────────────────────────────────────────────────
# See app/seo/search_console.py's module docstring for the two manual,
# outside-this-codebase steps required before /report returns real data.

_GSC_STATE_PURPOSE = "gsc_oauth_state"


@router.get("/api/seo/admin/gsc/connect")
async def gsc_connect(
    user: User = Depends(get_current_user),
):
    """Returns a Google OAuth consent URL for the admin to open in a browser
    tab. There's no dashboard button wired to this yet (see SEO_ROADMAP.md)
    — call this endpoint (e.g. via /api/docs while logged in as admin, or
    curl with your Bearer token) and open the returned URL yourself."""
    _require_admin(user)
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(500, "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured")
    state = jwt.encode(
        {"purpose": _GSC_STATE_PURPOSE, "admin_id": user.id,
         "exp": datetime.now(timezone.utc).timestamp() + 600},
        settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM,
    )
    return {"authorization_url": gsc.build_authorization_url(state),
            "note": f"Also add {gsc.redirect_uri()} as an Authorized redirect URI on this OAuth client in Google Cloud Console before opening this URL."}


@router.get("/api/seo/admin/gsc/callback", include_in_schema=False)
async def gsc_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Hit directly by Google's redirect — can't require a normal Bearer
    token here (the browser won't attach one), so the signed, short-lived
    `state` JWT (minted by /connect, only ever handed to an authenticated
    admin) is what proves this callback is legitimate instead."""
    if error:
        return Response(f"Google Search Console connection was not completed: {error}", status_code=400)
    if not code or not state:
        return Response("Missing code or state parameter.", status_code=400)
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != _GSC_STATE_PURPOSE:
            raise JWTError("wrong purpose")
        admin_id = payload["admin_id"]
    except JWTError:
        return Response("Invalid or expired state parameter — restart the connection from /api/seo/admin/gsc/connect.", status_code=400)

    admin_result = await db.execute(select(User).where(User.id == admin_id))
    admin = admin_result.scalar_one_or_none()

    try:
        tokens = await gsc.exchange_code_for_tokens(code)
    except gsc.SearchConsoleError as exc:
        logger.error("GSC token exchange failed: %s", exc)
        return Response(f"Could not complete Google Search Console connection: {exc}", status_code=502)

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        return Response(
            "Google did not return a refresh token. This usually means this Google account already "
            "granted consent before — revoke Planazo's access at https://myaccount.google.com/permissions "
            "and try connecting again.",
            status_code=400,
        )

    site_url = f"{settings.FRONTEND_URL.rstrip('/')}/"
    existing = await db.execute(select(SeoSearchConsoleToken))
    row = existing.scalar_one_or_none()
    if row:
        row.refresh_token = refresh_token
        row.site_url = site_url
        row.connected_by = admin.email if admin else None
    else:
        db.add(SeoSearchConsoleToken(
            site_url=site_url, refresh_token=refresh_token,
            connected_by=admin.email if admin else None,
        ))
    await db.commit()

    return Response(
        "Google Search Console connected. You can close this tab and return to Planazo.",
        media_type="text/plain",
    )


@router.get("/api/seo/admin/gsc/status", response_model=GscStatus)
async def gsc_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoSearchConsoleToken))
    row = result.scalar_one_or_none()
    if not row:
        return GscStatus(connected=False)
    return GscStatus(connected=True, site_url=row.site_url, connected_at=row.connected_at, connected_by=row.connected_by)


@router.delete("/api/seo/admin/gsc/disconnect", status_code=204)
async def gsc_disconnect(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoSearchConsoleToken))
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()


@router.get("/api/seo/admin/gsc/report", response_model=GscReport)
async def gsc_report(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    dimensions: str = Query("query", description="Comma-separated: query, page, device, country"),
    row_limit: int = Query(25, ge=1, le=1000),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(SeoSearchConsoleToken))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            409,
            "Search Console isn't connected yet — call GET /api/seo/admin/gsc/connect "
            "and complete the Google consent flow first.",
        )

    try:
        access_token = await gsc.refresh_access_token(row.refresh_token)
        data = await gsc.query_search_analytics(
            access_token, row.site_url, start_date, end_date,
            dimensions.split(","), row_limit,
        )
    except gsc.SearchConsoleError as exc:
        raise HTTPException(502, f"Search Console query failed: {exc}")

    return GscReport(
        start_date=start_date, end_date=end_date, dimensions=dimensions.split(","),
        rows=[
            GscReportRow(keys=r.get("keys", []), clicks=r.get("clicks", 0),
                         impressions=r.get("impressions", 0), ctr=r.get("ctr", 0.0),
                         position=r.get("position", 0.0))
            for r in data.get("rows", [])
        ],
    )
