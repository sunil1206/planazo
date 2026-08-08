"""
SQLAdmin ModelView registrations.

Main admin    → all models
Vendor admin  → vendor-specific models
Gift admin    → gift/marketplace models
"""
import logging

from sqladmin import ModelView
from starlette.requests import Request

from app.models.admin_permissions import AdminRole
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.invitation import (
    CoupleWebsite, BrideGroom, BrideGroomStory, BrideGroomEvent,
    WeddingCountdown, InvitationRSVP, Makeyourwish, WeddingGalleryPhoto,
    WeddingVendor,
)
from app.models.vendor import (
    VendorCategory, VendorThemePreset, VendorWebsite, PortfolioCategory,
    VendorPackage, VendorPortfolioImage, VendorEnquiry, VendorReview,
    SubscriptionPlan, VendorSubscription, VendorFavorite,
)
from app.models.gallery import (
    GalleryCategory, GalleryAlbum, GalleryImage,
    GalleryMediaLike, GalleryMediaComment, GuestSelfieMatch,
)
from app.models.permissions import EventPermission, PhotographerProfile, PhotographerAssignment
from app.models.gift import (
    GiftSeller, GiftCategory, GiftProduct, ProductImage, ProductVariant,
    ProductReview, Cart, CartItem, GiftOrder, MarketplaceOrder,
    MarketplaceOrderItem, ScheduledDelivery,
)
from app.models.birthday import (
    BirthdayPage, BirthdayEvent, BirthdayStory, BirthdayWish,
    BirthdayRSVP, BirthdayCountdown,
)
from app.models.payment import UserSubscription, Transaction
from app.seo.models import (
    SeoMetaOverride, SeoRobotsRule, SeoRedirect,
    SeoPerformanceSnapshot, BlogPost,
)

logger = logging.getLogger("planazo")


def _json_safe(value):
    """Coerce a single form/column value into something the audit_logs.changes
    JSON column can store (datetimes, Decimals, etc. aren't JSON-serializable)."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return str(value)


async def _write_audit_log(request: Request, action: str, model, data: dict | None) -> None:
    """Best-effort audit write — a logging failure must never block an admin
    action, so errors are caught and logged rather than raised."""
    from app.database.base import AsyncSessionLocal

    try:
        actor_id = request.session.get("admin_user")
        snapshot = {k: _json_safe(v) for k, v in data.items()} if data else None
        async with AsyncSessionLocal() as session:
            session.add(AuditLog(
                actor_id=actor_id,
                actor_email=request.session.get("admin_email"),
                action=action,
                resource_type=type(model).__name__,
                resource_id=str(getattr(model, "id", "")) or None,
                changes=snapshot,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            ))
            await session.commit()
    except Exception:
        logger.exception("Failed to write audit log entry for %s %s", action, type(model).__name__)


class AuditedModelView(ModelView):
    """Base for every admin ModelView: gates visibility/access by the acting
    admin's capability (see app/models/admin_permissions.py::AdminRole), and
    auto-logs every create/update/delete to audit_logs. Subclasses set
    `required_capability` — default "*" (SUPER_ADMIN/ADMIN only) is a safe
    fallback for any view that forgets to set one.
    """
    required_capability: str = "*"

    def _has_access(self, request: Request) -> bool:
        if request.session.get("is_superuser"):
            return True
        return AdminRole.has_capability(request.session.get("admin_role"), self.required_capability)

    def is_accessible(self, request: Request) -> bool:
        return self._has_access(request)

    def is_visible(self, request: Request) -> bool:
        return self._has_access(request)

    async def on_model_change(self, data: dict, model, is_created: bool, request: Request) -> None:
        await super().on_model_change(data, model, is_created, request)
        await _write_audit_log(request, "CREATE" if is_created else "UPDATE", model, data)

    async def on_model_delete(self, model, request: Request) -> None:
        await _write_audit_log(request, "DELETE", model, None)
        await super().on_model_delete(model, request)


# ── Main admin views ──────────────────────────────────────────────────────────

class UserAdmin(AuditedModelView, model=User):
    required_capability = "users:manage"
    column_list = [User.id, User.email, User.full_name, User.role,
                   User.is_active, User.is_staff, User.is_superuser]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.role, User.created_at]
    column_filters = [User.role, User.is_active, User.is_staff]
    can_delete = False  # Protect user data


class CoupleWebsiteAdmin(AuditedModelView, model=CoupleWebsite):
    required_capability = "content:manage"
    column_list = [CoupleWebsite.id, CoupleWebsite.couple, CoupleWebsite.slug,
                   CoupleWebsite.is_published, CoupleWebsite.views, CoupleWebsite.created_at]
    column_searchable_list = [CoupleWebsite.couple, CoupleWebsite.slug]
    column_sortable_list = [CoupleWebsite.id, CoupleWebsite.created_at, CoupleWebsite.views]


class InvitationRSVPAdmin(AuditedModelView, model=InvitationRSVP):
    required_capability = "content:manage"
    column_list = [InvitationRSVP.id, InvitationRSVP.website_id, InvitationRSVP.name,
                   InvitationRSVP.attendance, InvitationRSVP.guests, InvitationRSVP.created_at]
    column_filters = [InvitationRSVP.attendance]


class GalleryCategoryAdmin(AuditedModelView, model=GalleryCategory):
    required_capability = "content:manage"
    column_list = [GalleryCategory.id, GalleryCategory.name]


class GalleryImageAdmin(AuditedModelView, model=GalleryImage):
    required_capability = "content:manage"
    column_list = [GalleryImage.id, GalleryImage.website_id, GalleryImage.gallery_type,
                   GalleryImage.title, GalleryImage.created_at]
    column_searchable_list = [GalleryImage.title, GalleryImage.slug]
    column_filters = [GalleryImage.gallery_type]


class GuestSelfieMatchAdmin(AuditedModelView, model=GuestSelfieMatch):
    required_capability = "content:manage"
    column_list = [GuestSelfieMatch.id, GuestSelfieMatch.website_id,
                   GuestSelfieMatch.status, GuestSelfieMatch.created_at]
    column_filters = [GuestSelfieMatch.status]


class GalleryAlbumAdmin(AuditedModelView, model=GalleryAlbum):
    required_capability = "content:manage"
    column_list = [GalleryAlbum.id, GalleryAlbum.website_id, GalleryAlbum.name,
                   GalleryAlbum.privacy, GalleryAlbum.is_published, GalleryAlbum.order]
    column_filters = [GalleryAlbum.privacy, GalleryAlbum.is_published]


class GalleryMediaCommentAdmin(AuditedModelView, model=GalleryMediaComment):
    required_capability = "content:manage"
    column_list = [GalleryMediaComment.id, GalleryMediaComment.image_id,
                   GalleryMediaComment.guest_name, GalleryMediaComment.is_approved,
                   GalleryMediaComment.created_at]
    column_filters = [GalleryMediaComment.is_approved]


class EventPermissionAdmin(AuditedModelView, model=EventPermission):
    required_capability = "support:manage"
    column_list = [EventPermission.id, EventPermission.event_type, EventPermission.event_id,
                   EventPermission.user_id, EventPermission.role, EventPermission.created_at]
    column_filters = [EventPermission.event_type, EventPermission.role]
    can_delete = False


class PhotographerProfileAdmin(AuditedModelView, model=PhotographerProfile):
    required_capability = "support:manage"
    column_list = [PhotographerProfile.id, PhotographerProfile.display_name,
                   PhotographerProfile.base_city, PhotographerProfile.is_verified,
                   PhotographerProfile.is_available, PhotographerProfile.rating]
    column_filters = [PhotographerProfile.is_verified, PhotographerProfile.is_available]
    column_searchable_list = [PhotographerProfile.display_name, PhotographerProfile.base_city]


class PhotographerAssignmentAdmin(AuditedModelView, model=PhotographerAssignment):
    required_capability = "support:manage"
    column_list = [PhotographerAssignment.id, PhotographerAssignment.photographer_id,
                   PhotographerAssignment.event_type, PhotographerAssignment.event_id,
                   PhotographerAssignment.status, PhotographerAssignment.shoot_date]
    column_filters = [PhotographerAssignment.status, PhotographerAssignment.event_type]


class UserSubscriptionAdmin(AuditedModelView, model=UserSubscription):
    required_capability = "orders:manage"
    column_list = [UserSubscription.id, UserSubscription.account_id,
                   UserSubscription.plan, UserSubscription.status,
                   UserSubscription.current_period_end]
    column_filters = [UserSubscription.plan, UserSubscription.status]


class TransactionAdmin(AuditedModelView, model=Transaction):
    required_capability = "orders:manage"
    column_list = [Transaction.id, Transaction.account_id, Transaction.amount,
                   Transaction.status, Transaction.description, Transaction.created_at]
    column_filters = [Transaction.status]
    can_delete = False


class BirthdayPageAdmin(AuditedModelView, model=BirthdayPage):
    required_capability = "content:manage"
    column_list = [BirthdayPage.id, BirthdayPage.honoree_name, BirthdayPage.slug,
                   BirthdayPage.is_published, BirthdayPage.views]
    column_searchable_list = [BirthdayPage.honoree_name, BirthdayPage.slug]


# ── Vendor admin views ────────────────────────────────────────────────────────

class VendorCategoryAdmin(AuditedModelView, model=VendorCategory):
    required_capability = "vendors:manage"
    column_list = [VendorCategory.id, VendorCategory.key, VendorCategory.name,
                   VendorCategory.url_slug, VendorCategory.is_active, VendorCategory.order]
    column_sortable_list = [VendorCategory.order]
    form_columns = [VendorCategory.key, VendorCategory.name, VendorCategory.url_slug,
                    VendorCategory.icon_image, VendorCategory.description,
                    VendorCategory.order, VendorCategory.is_active]


class VendorWebsiteAdmin(AuditedModelView, model=VendorWebsite):
    required_capability = "vendors:manage"
    column_list = [VendorWebsite.id, VendorWebsite.title, VendorWebsite.slug,
                   VendorWebsite.category, VendorWebsite.city,
                   VendorWebsite.is_active, VendorWebsite.is_verified]
    column_searchable_list = [VendorWebsite.title, VendorWebsite.slug, VendorWebsite.city]
    column_filters = [VendorWebsite.is_active, VendorWebsite.is_verified, VendorWebsite.category]


class VendorEnquiryAdmin(AuditedModelView, model=VendorEnquiry):
    required_capability = "vendors:manage"
    column_list = [VendorEnquiry.id, VendorEnquiry.vendor_id, VendorEnquiry.name,
                   VendorEnquiry.email, VendorEnquiry.status, VendorEnquiry.created_at]
    column_filters = [VendorEnquiry.status]
    can_delete = False


class VendorReviewAdmin(AuditedModelView, model=VendorReview):
    required_capability = "vendors:manage"
    column_list = [VendorReview.id, VendorReview.vendor_id, VendorReview.rating,
                   VendorReview.is_approved, VendorReview.created_at]
    column_filters = [VendorReview.is_approved]


class SubscriptionPlanAdmin(AuditedModelView, model=SubscriptionPlan):
    required_capability = "vendors:manage"
    column_list = [SubscriptionPlan.id, SubscriptionPlan.tier, SubscriptionPlan.name,
                   SubscriptionPlan.price_monthly, SubscriptionPlan.price_yearly]


class VendorSubscriptionAdmin(AuditedModelView, model=VendorSubscription):
    required_capability = "orders:manage"
    column_list = [VendorSubscription.id, VendorSubscription.vendor_id,
                   VendorSubscription.plan_id, VendorSubscription.status,
                   VendorSubscription.current_period_end]
    column_filters = [VendorSubscription.status]


# ── Gift admin views ──────────────────────────────────────────────────────────

class GiftCategoryAdmin(AuditedModelView, model=GiftCategory):
    required_capability = "content:manage"
    column_list = [GiftCategory.id, GiftCategory.name, GiftCategory.emoji, GiftCategory.order]


class GiftProductAdmin(AuditedModelView, model=GiftProduct):
    required_capability = "content:manage"
    column_list = [GiftProduct.id, GiftProduct.name, GiftProduct.slug, GiftProduct.price,
                   GiftProduct.stock, GiftProduct.is_available, GiftProduct.is_featured]
    column_searchable_list = [GiftProduct.name, GiftProduct.slug]
    column_filters = [GiftProduct.is_available, GiftProduct.is_featured, GiftProduct.category_id]
    column_sortable_list = [GiftProduct.price, GiftProduct.stock, GiftProduct.created_at]


class GiftOrderAdmin(AuditedModelView, model=GiftOrder):
    required_capability = "orders:manage"
    column_list = [GiftOrder.id, GiftOrder.product_id, GiftOrder.sender_name,
                   GiftOrder.amount, GiftOrder.status, GiftOrder.created_at]
    column_filters = [GiftOrder.status, GiftOrder.delivery_type]
    can_delete = False


class MarketplaceOrderAdmin(AuditedModelView, model=MarketplaceOrder):
    required_capability = "orders:manage"
    column_list = [MarketplaceOrder.id, MarketplaceOrder.order_number,
                   MarketplaceOrder.buyer_name, MarketplaceOrder.total_amount,
                   MarketplaceOrder.status, MarketplaceOrder.created_at]
    column_searchable_list = [MarketplaceOrder.order_number, MarketplaceOrder.buyer_email]
    column_filters = [MarketplaceOrder.status]
    can_delete = False


class ScheduledDeliveryAdmin(AuditedModelView, model=ScheduledDelivery):
    required_capability = "orders:manage"
    column_list = [ScheduledDelivery.id, ScheduledDelivery.sender_name,
                   ScheduledDelivery.recipient_name, ScheduledDelivery.scheduled_date,
                   ScheduledDelivery.fulfilment_status, ScheduledDelivery.payment_status]
    column_filters = [ScheduledDelivery.fulfilment_status, ScheduledDelivery.payment_status]
    can_delete = False


class GiftSellerAdmin(AuditedModelView, model=GiftSeller):
    required_capability = "vendors:manage"
    column_list = [GiftSeller.id, GiftSeller.business_name, GiftSeller.status,
                   GiftSeller.commission_pct]
    column_filters = [GiftSeller.status]


# ── SEO admin views ────────────────────────────────────────────────────────────
# Usable today with zero frontend work — edit these directly at /admin until a
# dedicated SEO dashboard page exists (see SEO_ROADMAP.md).

class SeoMetaOverrideAdmin(AuditedModelView, model=SeoMetaOverride):
    required_capability = "seo:manage"
    column_list = [SeoMetaOverride.id, SeoMetaOverride.path, SeoMetaOverride.title,
                   SeoMetaOverride.robots, SeoMetaOverride.updated_at]
    column_searchable_list = [SeoMetaOverride.path, SeoMetaOverride.title]
    form_columns = [SeoMetaOverride.path, SeoMetaOverride.title, SeoMetaOverride.meta_description,
                    SeoMetaOverride.og_image, SeoMetaOverride.robots, SeoMetaOverride.notes]


class SeoRobotsRuleAdmin(AuditedModelView, model=SeoRobotsRule):
    required_capability = "seo:manage"
    column_list = [SeoRobotsRule.id, SeoRobotsRule.user_agent,
                   SeoRobotsRule.is_active, SeoRobotsRule.updated_at]
    column_filters = [SeoRobotsRule.is_active]


class SeoRedirectAdmin(AuditedModelView, model=SeoRedirect):
    required_capability = "seo:manage"
    column_list = [SeoRedirect.id, SeoRedirect.source_path, SeoRedirect.target_path,
                   SeoRedirect.status_code, SeoRedirect.is_active, SeoRedirect.hit_count]
    column_searchable_list = [SeoRedirect.source_path, SeoRedirect.target_path]
    column_filters = [SeoRedirect.is_active]
    form_columns = [SeoRedirect.source_path, SeoRedirect.target_path,
                    SeoRedirect.status_code, SeoRedirect.is_active]


class SeoPerformanceSnapshotAdmin(AuditedModelView, model=SeoPerformanceSnapshot):
    """Read-only history — snapshots are only ever created via the real
    PageSpeed Insights API call (POST /api/seo/admin/performance/check),
    never hand-edited."""
    required_capability = "seo:manage"
    column_list = [SeoPerformanceSnapshot.id, SeoPerformanceSnapshot.path, SeoPerformanceSnapshot.strategy,
                   SeoPerformanceSnapshot.performance_score, SeoPerformanceSnapshot.lcp_ms,
                   SeoPerformanceSnapshot.cls, SeoPerformanceSnapshot.fetched_at]
    column_filters = [SeoPerformanceSnapshot.path, SeoPerformanceSnapshot.strategy]
    can_create = False
    can_edit = False


class BlogPostAdmin(AuditedModelView, model=BlogPost):
    required_capability = "content:manage"
    column_list = [BlogPost.id, BlogPost.title, BlogPost.slug, BlogPost.status,
                   BlogPost.author_name, BlogPost.published_at]
    column_searchable_list = [BlogPost.title, BlogPost.slug]
    column_filters = [BlogPost.status]
    form_columns = [BlogPost.slug, BlogPost.title, BlogPost.excerpt, BlogPost.content,
                    BlogPost.cover_image, BlogPost.author_name, BlogPost.tags, BlogPost.status]


# ── Audit log (read-only) ───────────────────────────────────────────────────────

class AuditLogAdmin(AuditedModelView, model=AuditLog):
    """Read-only — rows are only ever written by AuditedModelView's own
    on_model_change/on_model_delete hooks, never hand-edited."""
    required_capability = "audit:manage"
    column_list = [AuditLog.id, AuditLog.actor_email, AuditLog.action,
                   AuditLog.resource_type, AuditLog.resource_id, AuditLog.created_at]
    column_searchable_list = [AuditLog.actor_email, AuditLog.resource_type]
    column_filters = [AuditLog.action, AuditLog.resource_type]
    column_default_sort = [(AuditLog.created_at, True)]
    can_create = False
    can_edit = False
    can_delete = False


# ── Registration function ─────────────────────────────────────────────────────

def register_views(admin_app, vendor_admin_app, gift_admin_app):
    """Register all ModelViews into the correct Admin instance."""

    # Main admin — everything
    for view in [
        UserAdmin, CoupleWebsiteAdmin, InvitationRSVPAdmin,
        GalleryCategoryAdmin, GalleryAlbumAdmin, GalleryImageAdmin,
        GalleryMediaCommentAdmin, GuestSelfieMatchAdmin,
        EventPermissionAdmin, PhotographerProfileAdmin, PhotographerAssignmentAdmin,
        UserSubscriptionAdmin, TransactionAdmin, BirthdayPageAdmin,
        VendorCategoryAdmin, VendorWebsiteAdmin, VendorEnquiryAdmin,
        VendorReviewAdmin, SubscriptionPlanAdmin, VendorSubscriptionAdmin,
        GiftCategoryAdmin, GiftProductAdmin, GiftOrderAdmin,
        MarketplaceOrderAdmin, ScheduledDeliveryAdmin, GiftSellerAdmin,
        SeoMetaOverrideAdmin, SeoRobotsRuleAdmin, SeoRedirectAdmin,
        SeoPerformanceSnapshotAdmin, BlogPostAdmin,
        AuditLogAdmin,
    ]:
        admin_app.add_view(view)

    # Vendor admin — vendor subset
    for view in [
        VendorCategoryAdmin, VendorWebsiteAdmin, VendorEnquiryAdmin,
        VendorReviewAdmin, SubscriptionPlanAdmin, VendorSubscriptionAdmin,
    ]:
        vendor_admin_app.add_view(view)

    # Gift admin — gift subset
    for view in [
        GiftCategoryAdmin, GiftProductAdmin, GiftOrderAdmin,
        MarketplaceOrderAdmin, ScheduledDeliveryAdmin, GiftSellerAdmin,
    ]:
        gift_admin_app.add_view(view)
