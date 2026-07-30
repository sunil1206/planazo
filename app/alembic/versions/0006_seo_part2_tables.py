"""Add seo_performance_snapshots, blog_posts, seo_search_console_token tables

All three are brand-new tables (no ALTER on an existing table), so
create_all() would also produce this schema on a fresh DB — this migration
exists so `alembic upgrade head` is the one command that brings any
environment up to date, matching the discipline of prior migrations.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seo_performance_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("path", sa.String(500), nullable=False, index=True),
        sa.Column("strategy", sa.String(10), nullable=False, server_default="mobile"),
        sa.Column("performance_score", sa.Integer(), nullable=True),
        sa.Column("lcp_ms", sa.Float(), nullable=True),
        sa.Column("cls", sa.Float(), nullable=True),
        sa.Column("tbt_ms", sa.Float(), nullable=True),
        sa.Column("fcp_ms", sa.Float(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "blog_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False, unique=True, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("excerpt", sa.String(300), server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("cover_image", sa.String(500), nullable=True),
        sa.Column("author_name", sa.String(100), server_default="Planazo Team"),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(10), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "seo_search_console_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_url", sa.String(255), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=False),
        sa.Column("connected_by", sa.String(254), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("seo_search_console_token")
    op.drop_table("blog_posts")
    op.drop_table("seo_performance_snapshots")
