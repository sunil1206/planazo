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

- SeoRedirect: path-to-path 301/302 rules (old slug -> new slug, or any old
  path -> new path), the same job Yoast Premium's / the Redirection plugin's
  redirect manager does. Looked up by exact `source_path`.

All three are brand-new tables — no ALTER on an existing table — so
Base.metadata.create_all() (run at every app startup, see app/main.py's
lifespan hook) creates them automatically. The Alembic migrations in
app/alembic/versions/000{3,4}_*.py exist for deployment discipline/parity
with prior migrations, not because they're strictly required.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database.base import Base


class SeoMetaOverride(Base):
    """Admin/owner-authored override for a single page's SEO metadata.

    Looked up by exact `path` (e.g. "/invite/priya-arjun", "/birthday/my-page").
    Any field left null falls back to the auto-generated default computed by
    app/seo/generator.py — the admin (or, via the owner-scoped endpoints in
    app/routers/invitations.py / birthday.py, the page's own owner) only
    needs to fill in what they want to change.
    """
    __tablename__ = "seo_meta_overrides"

    id               = Column(Integer, primary_key=True, index=True)
    path             = Column(String(500), unique=True, nullable=False, index=True)
    title            = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    og_image         = Column(String(500), nullable=True)
    # Comma-separated robots directive, e.g. "noindex,nofollow". Null = auto (index,follow).
    robots           = Column(String(50), nullable=True)
    # What the owner is optimizing this page for — drives the on-page SEO
    # analysis checklist (app/seo/analysis.py) but isn't used in rendered
    # meta tags itself, exactly like Yoast's "Focus keyphrase" field.
    focus_keyword    = Column(String(100), nullable=True)
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


class SeoRedirect(Base):
    """A single 301/302 redirect rule: source_path -> target_path.

    Checked (see app/seo/redirects.py) before a wedding/birthday slug lookup
    resolves — so renaming a published page's slug, or retiring a page
    entirely, doesn't have to cost its indexed URL. hit_count is incremented
    every time the rule actually fires, purely for the admin's own visibility
    into which redirects are still being hit by real traffic.
    """
    __tablename__ = "seo_redirects"

    id           = Column(Integer, primary_key=True, index=True)
    source_path  = Column(String(500), unique=True, nullable=False, index=True)
    target_path  = Column(String(500), nullable=False)
    status_code  = Column(Integer, nullable=False, default=301)
    is_active    = Column(Boolean, default=True)
    hit_count    = Column(Integer, nullable=False, default=0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<SeoRedirect {self.source_path!r} -> {self.target_path!r}>"
