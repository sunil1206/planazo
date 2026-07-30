"""SEO module — Pydantic schemas."""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ── Resolved meta (auto-generated defaults merged with any admin override) ────
# This is what app/seo/generator.py returns, and what gets embedded into
# public detail responses (e.g. CoupleWebsiteDetail.seo) for the frontend to
# render directly — no extra API round-trip needed per page.

class SeoMetaOut(BaseModel):
    title: str
    description: str
    canonical_url: str
    og_title: str
    og_description: str
    og_image: Optional[str] = None
    og_type: str = "website"
    twitter_card: str = "summary_large_image"
    robots: str = "index,follow"
    json_ld: List[Dict[str, Any]] = Field(default_factory=list)


# ── Admin CRUD for overrides ───────────────────────────────────────────────────

class SeoMetaOverrideCreate(BaseModel):
    path: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    focus_keyword: Optional[str] = None
    notes: Optional[str] = None


class SeoMetaOverrideUpdate(BaseModel):
    title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    focus_keyword: Optional[str] = None
    notes: Optional[str] = None


class SeoMetaOverrideRead(BaseModel):
    id: int
    path: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    focus_keyword: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Owner-scoped SEO settings (a couple/birthday-page owner editing their
# own page's SEO — same data as SeoMetaOverride, minus admin-only fields) ──────

class SeoSettingsIn(BaseModel):
    title: Optional[str] = None
    meta_description: Optional[str] = None
    focus_keyword: Optional[str] = None
    og_image: Optional[str] = None


class SeoSettingsOut(BaseModel):
    title: Optional[str] = None
    meta_description: Optional[str] = None
    focus_keyword: Optional[str] = None
    og_image: Optional[str] = None


# ── On-page SEO analysis (Yoast/RankMath-style checklist) ──────────────────────

class SeoAnalysisRequest(BaseModel):
    title: str = ""
    meta_description: str = ""
    slug: str = ""
    content: str = ""
    focus_keyword: str = ""


class SeoCheck(BaseModel):
    id: str
    category: str  # "seo" | "readability"
    status: str    # "good" | "ok" | "bad"
    message: str


class SeoAnalysisResult(BaseModel):
    seo_score: int          # 0-100
    readability_score: int  # 0-100
    seo_rating: str         # "good" | "ok" | "bad"
    readability_rating: str
    checks: List[SeoCheck]


# ── Admin CRUD for robots.txt rules ────────────────────────────────────────────

class SeoRobotsRuleCreate(BaseModel):
    user_agent: str = "*"
    allow_paths: List[str] = Field(default_factory=list)
    disallow_paths: List[str] = Field(default_factory=list)
    is_active: bool = True


class SeoRobotsRuleUpdate(BaseModel):
    user_agent: Optional[str] = None
    allow_paths: Optional[List[str]] = None
    disallow_paths: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SeoRobotsRuleRead(BaseModel):
    id: int
    user_agent: str
    allow_paths: List[str]
    disallow_paths: List[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Sitemap admin visibility (read-only summary, not stored) ──────────────────

class SitemapSummary(BaseModel):
    total_urls: int
    by_source: Dict[str, int]


# ── Admin CRUD for redirects ───────────────────────────────────────────────────

class SeoRedirectCreate(BaseModel):
    source_path: str
    target_path: str
    status_code: int = 301
    is_active: bool = True


class SeoRedirectUpdate(BaseModel):
    source_path: Optional[str] = None
    target_path: Optional[str] = None
    status_code: Optional[int] = None
    is_active: Optional[bool] = None


class SeoRedirectRead(BaseModel):
    id: int
    source_path: str
    target_path: str
    status_code: int
    is_active: bool
    hit_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class SeoRedirectResponse(BaseModel):
    """Returned by GET .../{slug}/ in place of the normal detail payload when
    the slug matches an active SeoRedirect instead of a real page."""
    redirect: bool = True
    target_path: str
    status_code: int = 301


# ── Core Web Vitals (real PageSpeed Insights data) ──────────────────────────────

class PerformanceCheckRequest(BaseModel):
    path: str  # site-relative, e.g. "/" or "/vendors/wedding-planners/paris"
    strategy: str = "mobile"


class SeoPerformanceSnapshotRead(BaseModel):
    id: int
    path: str
    strategy: str
    performance_score: Optional[int] = None
    lcp_ms: Optional[float] = None
    cls: Optional[float] = None
    tbt_ms: Optional[float] = None
    fcp_ms: Optional[float] = None
    fetched_at: datetime
    model_config = {"from_attributes": True}


# ── Blog ─────────────────────────────────────────────────────────────────────

class BlogPostCreate(BaseModel):
    slug: str
    title: str
    excerpt: str = ""
    content: str = ""
    cover_image: Optional[str] = None
    author_name: str = "Planazo Team"
    tags: List[str] = Field(default_factory=list)
    status: str = "draft"


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    author_name: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class BlogPostRead(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: Optional[str] = None
    author_name: str
    tags: List[str]
    status: str
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Google Search Console ───────────────────────────────────────────────────────

class GscStatus(BaseModel):
    connected: bool
    site_url: Optional[str] = None
    connected_at: Optional[datetime] = None
    connected_by: Optional[str] = None


class GscReportRow(BaseModel):
    keys: List[str]     # the query text and/or page URL, per requested dimensions
    clicks: int
    impressions: int
    ctr: float
    position: float


class GscReport(BaseModel):
    start_date: str
    end_date: str
    dimensions: List[str]
    rows: List[GscReportRow]
