"""SEO module — SQLAlchemy models.

Two tables, deliberately generic rather than per-entity:

- SeoMetaOverride: admin edits keyed by URL PATH (e.g. "/invite/priya-arjun"),
  not by a foreign key to a specific entity table. This is how Yoast/RankMath
  actually work, and it means the same override mechanism works for every
  current and future page type (wedding invite, birthday page, vendor
  profile, product page, blog post...) without a schema change.

- SeoRobotsRule: admin-editable robots.txt directives, one row per
  User-agent block. If the table is empty, app/seo/robots.py falls back to
  sensible hardcoded defaults, so this works out of the box with zero setup.

Both are brand-new tables — no ALTER on an existing table — so
Base.metadata.create_all() (run at every app startup, see app/main.py's
lifespan hook) creates them automatically. The Alembic migration in
app/alembic/versions/0003_add_seo_tables.py exists for deployment
discipline/parity with prior migrations, not because it's strictly required.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database.base import Base


class SeoMetaOverride(Base):
    """Admin-authored override for a single page's SEO metadata.

    Looked up by exact `path` (e.g. "/invite/priya-arjun", "/birthday/my-page").
    Any field left null falls back to the auto-generated default computed by
    app/seo/generator.py — admin only needs to fill in what they want to change.
    """
    __tablename__ = "seo_meta_overrides"

    id               = Column(Integer, primary_key=True, index=True)
    path             = Column(String(500), unique=True, nullable=False, index=True)
    title            = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    og_image         = Column(String(500), nullable=True)
    # Comma-separated robots directive, e.g. "noindex,nofollow". Null = auto (index,follow).
    robots           = Column(String(50), nullable=True)
    notes            = Column(String(500), nullable=True)  # internal admin note, never rendered
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<SeoMetaOverride path={self.path!r}>"


class SeoRobotsRule(Base):
    """One User-agent block for the generated /robots.txt.

    allow_paths / disallow_paths are simple JSON lists of path prefixes,
    e.g. disallow_paths=["/api/", "/admin", "/dashboard"].
    """
    __tablename__ = "seo_robots_rules"

    id              = Column(Integer, primary_key=True, index=True)
    user_agent      = Column(String(100), nullable=False, default="*")
    allow_paths     = Column(JSON, nullable=False, default=list)
    disallow_paths  = Column(JSON, nullable=False, default=list)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<SeoRobotsRule user_agent={self.user_agent!r}>"
