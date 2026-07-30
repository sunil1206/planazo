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
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.seo.models import SeoMetaOverride, SeoRobotsRule, SeoRedirect
from app.seo.schemas import (
    SeoMetaOverrideCreate, SeoMetaOverrideUpdate, SeoMetaOverrideRead,
    SeoRobotsRuleCreate, SeoRobotsRuleUpdate, SeoRobotsRuleRead,
    SeoRedirectCreate, SeoRedirectUpdate, SeoRedirectRead,
    SeoAnalysisRequest, SeoAnalysisResult,
    SitemapSummary,
)
from app.seo.sitemap import collect_sitemap_urls, render_sitemap_xml
from app.seo.robots import build_robots_txt
from app.seo.analysis import analyze_seo

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
