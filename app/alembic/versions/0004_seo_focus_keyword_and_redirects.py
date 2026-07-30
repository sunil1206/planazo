"""Add focus_keyword to seo_meta_overrides + new seo_redirects table

Both changes are additive (a nullable column on an existing table, plus a
brand-new table) so create_all() would also produce this schema on a fresh
DB — this migration exists so `alembic upgrade head` is the one command
that brings any environment up to date, matching the discipline established
in 0002/0003.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "seo_meta_overrides",
        sa.Column("focus_keyword", sa.String(100), nullable=True),
    )

    op.create_table(
        "seo_redirects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_path", sa.String(500), nullable=False, unique=True, index=True),
        sa.Column("target_path", sa.String(500), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False, server_default="301"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("seo_redirects")
    op.drop_column("seo_meta_overrides", "focus_keyword")
