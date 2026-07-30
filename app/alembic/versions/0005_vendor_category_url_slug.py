"""Add url_slug to vendor_categories (backing the new SEO landing page URLs)

vendor_categories.key is a short machine key (e.g. "wedding_planner") not
meant for URLs. The new server-rendered vendor landing pages (see app/ssr/)
need a proper SEO-friendly slug ("wedding-planners") per category. This
migration adds the column and backfills it from `key` (underscores ->
hyphens) so every existing category is immediately usable — an admin can
still edit it to something more natural (e.g. pluralized) via /admin.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "vendor_categories",
        sa.Column("url_slug", sa.String(50), nullable=True),
    )
    op.execute(
        "UPDATE vendor_categories SET url_slug = replace(lower(key), '_', '-') WHERE url_slug IS NULL"
    )
    op.create_unique_constraint(
        "uq_vendor_categories_url_slug", "vendor_categories", ["url_slug"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_vendor_categories_url_slug", "vendor_categories", type_="unique")
    op.drop_column("vendor_categories", "url_slug")
