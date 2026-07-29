"""Add token_version to account_user for real refresh-token revocation

account_user is one of the "Phase 0" tables that has never had a migration —
it only exists in production because main.py's lifespan hook runs
Base.metadata.create_all() on startup, and create_all() only creates missing
*tables*, never adds missing *columns* to a table that already exists. So
adding token_version straight to the SQLAlchemy model (app/models/user.py)
would work for a brand-new database but silently break auth on any database
that already has account_user — every login/register/get_current_user call
would fail with "column account_user.token_version does not exist". This
migration is what actually gets the column onto an existing production DB.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_user",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("account_user", "token_version")
