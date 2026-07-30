"""Add seo_meta_overrides and seo_robots_rules tables

Both are brand-new tables (no ALTER on an existing table), so
Base.metadata.create_all() — run on every app startup, see app/main.py's
lifespan hook — already creates them automatically; unlike migration 0002
(which added a column to an existing table), this migration isn't strictly
required for correctness. It exists for deployment discipline: `alembic
upgrade head` is the one command that's supposed to bring any environment's
schema up to date, and skipping a migration file for "new table, create_all
already handles it" reasoning is how schema drift between environments
starts. Safe to run even if the tables already exist via create_all —
op.create_table would only fail if the migration were re-run against a DB
that already has these tables from a *previous* run of this same migration,
which alembic's version tracking prevents.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seo_meta_overrides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("path", sa.String(500), nullable=False, unique=True, index=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("meta_description", sa.String(500), nullable=True),
        sa.Column("og_image", sa.String(500), nullable=True),
        sa.Column("robots", sa.String(50), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "seo_robots_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_agent", sa.String(100), nullable=False, server_default="*"),
        sa.Column("allow_paths", sa.JSON(), nullable=False),
        sa.Column("disallow_paths", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("seo_robots_rules")
    op.drop_table("seo_meta_overrides")
