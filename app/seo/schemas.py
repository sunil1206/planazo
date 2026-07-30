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
    notes: Optional[str] = None


class SeoMetaOverrideUpdate(BaseModel):
    title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    notes: Optional[str] = None


class SeoMetaOverrideRead(BaseModel):
    id: int
    path: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


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
