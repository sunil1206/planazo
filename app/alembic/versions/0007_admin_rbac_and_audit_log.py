"""Add account_user.admin_role, create audit_logs table

admin_role is a new platform-admin RBAC level (app/models/admin_permissions.py
::AdminRole), separate from the existing account-type `role` column
(USER/VENDOR/PHOTOGRAPHER) that the old flat "role == ADMIN" admin-panel
check piggybacked on. The data migration below preserves access for anyone
who is an admin under that old check.

audit_logs is a brand-new table (no ALTER on an existing table), so
create_all() would also produce this schema on a fresh DB — this migration
exists so `alembic upgrade head` is the one command that brings any
environment up to date, matching the discipline of prior migrations.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_user",
        sa.Column("admin_role", sa.String(30), nullable=True),
    )
    op.execute(
        "UPDATE account_user SET admin_role = 'ADMIN' WHERE role = 'ADMIN'"
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(),
                  sa.ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("actor_email", sa.String(254), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False, index=True),
        sa.Column("resource_id", sa.String(50), nullable=True, index=True),
        sa.Column("changes", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_column("account_user", "admin_role")
