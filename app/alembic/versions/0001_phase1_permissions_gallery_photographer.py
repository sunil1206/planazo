"""Phase 1: event_permissions, gallery albums/likes/comments, photographer tables

Revision ID: 0001
Revises:
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── gallery_albums ─────────────────────────────────────────────────────────
    op.create_table(
        "gallery_albums",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("website_id", sa.Integer(), sa.ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("privacy", sa.String(20), nullable=False, server_default="PUBLIC"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── Extend gallery_images with Phase 1 columns ────────────────────────────
    op.add_column("gallery_images", sa.Column("album_id", sa.Integer(), sa.ForeignKey("gallery_albums.id", ondelete="SET NULL"), nullable=True, index=True))
    op.add_column("gallery_images", sa.Column("media_type", sa.String(10), nullable=False, server_default="IMAGE"))
    op.add_column("gallery_images", sa.Column("storage_key", sa.Text(), nullable=True))
    op.add_column("gallery_images", sa.Column("cdn_url", sa.Text(), nullable=True))
    op.add_column("gallery_images", sa.Column("thumb_webp", sa.Text(), nullable=True))
    op.add_column("gallery_images", sa.Column("watermarked_url", sa.Text(), nullable=True))
    op.add_column("gallery_images", sa.Column("file_size_kb", sa.Integer(), nullable=True))
    op.add_column("gallery_images", sa.Column("width", sa.Integer(), nullable=True))
    op.add_column("gallery_images", sa.Column("height", sa.Integer(), nullable=True))
    op.add_column("gallery_images", sa.Column("duration_sec", sa.Integer(), nullable=True))
    op.add_column("gallery_images", sa.Column("ai_tags", JSONB(), nullable=True))
    op.add_column("gallery_images", sa.Column("ai_scene", sa.String(80), nullable=True))
    op.add_column("gallery_images", sa.Column("ai_quality_score", sa.Float(), nullable=True))
    op.add_column("gallery_images", sa.Column("ai_is_duplicate", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("ai_is_blurry", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("ai_processed", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("is_approved", sa.Boolean(), server_default="true"))
    op.add_column("gallery_images", sa.Column("is_featured", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("is_pinned", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("is_highlighted", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("is_hidden", sa.Boolean(), server_default="false"))
    op.add_column("gallery_images", sa.Column("privacy", sa.String(20), server_default="PUBLIC"))
    op.add_column("gallery_images", sa.Column("likes_count", sa.Integer(), server_default="0"))
    op.add_column("gallery_images", sa.Column("comments_count", sa.Integer(), server_default="0"))

    # ── gallery_media_likes ───────────────────────────────────────────────────
    op.create_table(
        "gallery_media_likes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("image_id", sa.Integer(), sa.ForeignKey("gallery_images.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("guest_name", sa.String(80), nullable=True),
        sa.Column("ip_hash", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── gallery_media_comments ────────────────────────────────────────────────
    op.create_table(
        "gallery_media_comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("image_id", sa.Integer(), sa.ForeignKey("gallery_images.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("guest_name", sa.String(80), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── event_permissions ─────────────────────────────────────────────────────
    op.create_table(
        "event_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(30), nullable=False, server_default="GUEST"),
        sa.Column("invited_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invite_token", sa.String(64), nullable=True, unique=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        # Capability overrides (NULL = use role default)
        sa.Column("can_upload", sa.Boolean(), nullable=True),
        sa.Column("can_edit", sa.Boolean(), nullable=True),
        sa.Column("can_delete", sa.Boolean(), nullable=True),
        sa.Column("can_download", sa.Boolean(), nullable=True),
        sa.Column("can_approve", sa.Boolean(), nullable=True),
        sa.Column("can_publish", sa.Boolean(), nullable=True),
        sa.Column("can_share", sa.Boolean(), nullable=True),
        sa.Column("can_manage_permissions", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("event_type", "event_id", "user_id", name="uq_event_permission"),
    )
    op.create_index("ix_event_permissions_event", "event_permissions", ["event_type", "event_id"])

    # ── photographer_profiles ─────────────────────────────────────────────────
    op.create_table(
        "photographer_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("base_city", sa.String(80), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("portfolio_url", sa.Text(), nullable=True),
        sa.Column("instagram_handle", sa.String(60), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=True),
        sa.Column("specialties", JSONB(), nullable=True),
        sa.Column("price_starting_inr", sa.Integer(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default="false"),
        sa.Column("is_available", sa.Boolean(), server_default="true"),
        sa.Column("rating", sa.Float(), server_default="0.0"),
        sa.Column("total_reviews", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── photographer_assignments ──────────────────────────────────────────────
    op.create_table(
        "photographer_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("photographer_id", sa.Integer(), sa.ForeignKey("photographer_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("shoot_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_photographer_assignments_event", "photographer_assignments", ["event_type", "event_id"])


def downgrade() -> None:
    op.drop_table("photographer_assignments")
    op.drop_table("photographer_profiles")
    op.drop_table("event_permissions")
    op.drop_table("gallery_media_comments")
    op.drop_table("gallery_media_likes")

    # Remove Phase 1 columns from gallery_images
    for col in [
        "album_id", "media_type", "storage_key", "cdn_url", "thumb_webp",
        "watermarked_url", "file_size_kb", "width", "height", "duration_sec",
        "ai_tags", "ai_scene", "ai_quality_score", "ai_is_duplicate", "ai_is_blurry",
        "ai_processed", "is_approved", "is_featured", "is_pinned", "is_highlighted",
        "is_hidden", "privacy", "likes_count", "comments_count",
    ]:
        op.drop_column("gallery_images", col)

    op.drop_table("gallery_albums")
