"""
SQLAdmin ModelView registrations.

Main admin    → all models
Vendor admin  → vendor-specific models
Gift admin    → gift/marketplace models
"""
from sqladmin import ModelView

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
from app.seo.models import SeoMetaOverride, SeoRobotsRule, SeoRedirect


# ── Main admin views ──────────────────────────────────────────────────────────

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.full_name, User.role,
                   User.is_active, User.is_staff, User.is_superuser]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.role, User.created_at]
    column_filters = [User.role, User.is_active, User.is_staff]
    can_delete = False  # Protect user data


class CoupleWebsiteAdmin(ModelView, model=CoupleWebsite):
    column_list = [CoupleWebsite.id, CoupleWebsite.couple, CoupleWebsite.slug,
                   CoupleWebsite.is_published, CoupleWebsite.views, CoupleWebsite.created_at]
    column_searchable_list = [CoupleWebsite.couple, CoupleWebsite.slug]
    column_sortable_list = [CoupleWebsite.id, CoupleWebsite.created_at, CoupleWebsite.views]


class InvitationRSVPAdmin(ModelView, model=InvitationRSVP):
    column_list = [InvitationRSVP.id, InvitationRSVP.website_id, InvitationRSVP.name,
                   InvitationRSVP.attendance, InvitationRSVP.guests, InvitationRSVP.created_at]
    column_filters = [InvitationRSVP.attendance]


class GalleryCategoryAdmin(ModelView, model=GalleryCategory):
    column_list = [GalleryCategory.id, GalleryCategory.name]


class GalleryImageAdmin(ModelView, model=GalleryImage):
    column_list = [GalleryImage.id, GalleryImage.website_id, GalleryImage.gallery_type,
                   GalleryImage.title, GalleryImage.created_at]
    column_searchable_list = [GalleryImage.title, GalleryImage.slug]
    column_filters = [GalleryImage.gallery_type]


class GuestSelfieMatchAdmin(ModelView, model=GuestSelfieMatch):
    column_list = [GuestSelfieMatch.id, GuestSelfieMatch.website_id,
                   GuestSelfieMatch.status, GuestSelfieMatch.created_at]
    column_filters = [GuestSelfieMatch.status]


class GalleryAlbumAdmin(ModelView, model=GalleryAlbum):
    column_list = [GalleryAlbum.id, GalleryAlbum.website_id, GalleryAlbum.name,
                   GalleryAlbum.privacy, GalleryAlbum.is_published, GalleryAlbum.order]
    column_filters = [GalleryAlbum.privacy, GalleryAlbum.is_published]


class GalleryMediaCommentAdmin(ModelView, model=GalleryMediaComment):
    column_list = [GalleryMediaComment.id, GalleryMediaComment.image_id,
                   GalleryMediaComment.guest_name, GalleryMediaComment.is_approved,
                   GalleryMediaComment.created_at]
    column_filters = [GalleryMediaComment.is_approved]


class EventPermissionAdmin(ModelView, model=EventPermission):
    column_list = [EventPermission.id, EventPermission.event_type, EventPermission.event_id,
                   EventPermission.user_id, EventPermission.role, EventPermission.created_at]
    column_filters = [EventPermission.event_type, EventPermission.role]
    can_delete = False


class PhotographerProfileAdmin(ModelView, model=PhotographerProfile):
    column_list = [PhotographerProfile.id, PhotographerProfile.display_name,
                   PhotographerProfile.base_city, PhotographerProfile.is_verified,
                   PhotographerProfile.is_available, PhotographerProfile.rating]
    column_filters = [PhotographerProfile.is_verified, PhotographerProfile.is_available]
    column_searchable_list = [PhotographerProfile.display_name, PhotographerProfile.base_city]


class PhotographerAssignmentAdmin(ModelView, model=PhotographerAssignment):
    column_list = [PhotographerAssignment.id, PhotographerAssignment.photographer_id,
                   PhotographerAssignment.event_type, PhotographerAssignment.event_id,
                   PhotographerAssignment.status, PhotographerAssignment.shoot_date]
    column_filters = [PhotographerAssignment.status, PhotographerAssignment.event_type]


class UserSubscriptionAdmin(ModelView, model=UserSubscription):
    column_list = [UserSubscription.id, UserSubscription.account_id,
                   UserSubscription.plan, UserSubscription.status,
                   UserSubscription.current_period_end]
    column_filters = [UserSubscription.plan, UserSubscription.status]


class TransactionAdmin(ModelView, model=Transaction):
    column_list = [Transaction.id, Transaction.account_id, Transaction.amount,
                   Transaction.status, Transaction.description, Transaction.created_at]
    column_filters = [Transaction.status]
    can_delete = False


class BirthdayPageAdmin(ModelView, model=BirthdayPage):
    column_list = [BirthdayPage.id, BirthdayPage.honoree_name, BirthdayPage.slug,
                   BirthdayPage.is_published, BirthdayPage.views]
    column_searchable_list = [BirthdayPage.honoree_name, BirthdayPage.slug]


# ── Vendor admin views ────────────────────────────────────────────────────────

class VendorCategoryAdmin(ModelView, model=VendorCategory):
    column_list = [VendorCategory.id, VendorCategory.key, VendorCategory.name,
                   VendorCategory.is_active, VendorCategory.order]
    column_sortable_list = [VendorCategory.order]


class VendorWebsiteAdmin(ModelView, model=VendorWebsite):
    column_list = [VendorWebsite.id, VendorWebsite.title, VendorWebsite.slug,
                   VendorWebsite.category, VendorWebsite.city,
                   VendorWebsite.is_active, VendorWebsite.is_verified]
    column_searchable_list = [VendorWebsite.title, VendorWebsite.slug, VendorWebsite.city]
    column_filters = [VendorWebsite.is_active, VendorWebsite.is_verified, VendorWebsite.category]


class VendorEnquiryAdmin(ModelView, model=VendorEnquiry):
    column_list = [VendorEnquiry.id, VendorEnquiry.vendor_id, VendorEnquiry.name,
                   VendorEnquiry.email, VendorEnquiry.status, VendorEnquiry.created_at]
    column_filters = [VendorEnquiry.status]
    can_delete = False


class VendorReviewAdmin(ModelView, model=VendorReview):
    column_list = [VendorReview.id, VendorReview.vendor_id, VendorReview.rating,
                   VendorReview.is_approved, VendorReview.created_at]
    column_filters = [VendorReview.is_approved]


class SubscriptionPlanAdmin(ModelView, model=SubscriptionPlan):
    column_list = [SubscriptionPlan.id, SubscriptionPlan.tier, SubscriptionPlan.name,
                   SubscriptionPlan.price_monthly, SubscriptionPlan.price_yearly]


class VendorSubscriptionAdmin(ModelView, model=VendorSubscription):
    column_list = [VendorSubscription.id, VendorSubscription.vendor_id,
                   VendorSubscription.plan_id, VendorSubscription.status,
                   VendorSubscription.current_period_end]
    column_filters = [VendorSubscription.status]


# ── Gift admin views ──────────────────────────────────────────────────────────

class GiftCategoryAdmin(ModelView, model=GiftCategory):
    column_list = [GiftCategory.id, GiftCategory.name, GiftCategory.emoji, GiftCategory.order]


class GiftProductAdmin(ModelView, model=GiftProduct):
    column_list = [GiftProduct.id, GiftProduct.name, GiftProduct.slug, GiftProduct.price,
                   GiftProduct.stock, GiftProduct.is_available, GiftProduct.is_featured]
    column_searchable_list = [GiftProduct.name, GiftProduct.slug]
    column_filters = [GiftProduct.is_available, GiftProduct.is_featured, GiftProduct.category_id]
    column_sortable_list = [GiftProduct.price, GiftProduct.stock, GiftProduct.created_at]


class GiftOrderAdmin(ModelView, model=GiftOrder):
    column_list = [GiftOrder.id, GiftOrder.product_id, GiftOrder.sender_name,
                   GiftOrder.amount, GiftOrder.status, GiftOrder.created_at]
    column_filters = [GiftOrder.status, GiftOrder.delivery_type]
    can_delete = False


class MarketplaceOrderAdmin(ModelView, model=MarketplaceOrder):
    column_list = [MarketplaceOrder.id, MarketplaceOrder.order_number,
                   MarketplaceOrder.buyer_name, MarketplaceOrder.total_amount,
                   MarketplaceOrder.status, MarketplaceOrder.created_at]
    column_searchable_list = [MarketplaceOrder.order_number, MarketplaceOrder.buyer_email]
    column_filters = [MarketplaceOrder.status]
    can_delete = False


class ScheduledDeliveryAdmin(ModelView, model=ScheduledDelivery):
    column_list = [ScheduledDelivery.id, ScheduledDelivery.sender_name,
                   ScheduledDelivery.recipient_name, ScheduledDelivery.scheduled_date,
                   ScheduledDelivery.fulfilment_status, ScheduledDelivery.payment_status]
    column_filters = [ScheduledDelivery.fulfilment_status, ScheduledDelivery.payment_status]
    can_delete = False


class GiftSellerAdmin(ModelView, model=GiftSeller):
    column_list = [GiftSeller.id, GiftSeller.business_name, GiftSeller.status,
                   GiftSeller.commission_pct]
    column_filters = [GiftSeller.status]


# ── SEO admin views ────────────────────────────────────────────────────────────
# Usable today with zero frontend work — edit these directly at /admin until a
# dedicated SEO dashboard page exists (see SEO_ROADMAP.md).

class SeoMetaOverrideAdmin(ModelView, model=SeoMetaOverride):
    column_list = [SeoMetaOverride.id, SeoMetaOverride.path, SeoMetaOverride.title,
                   SeoMetaOverride.robots, SeoMetaOverride.updated_at]
    column_searchable_list = [SeoMetaOverride.path, SeoMetaOverride.title]
    form_columns = [SeoMetaOverride.path, SeoMetaOverride.title, SeoMetaOverride.meta_description,
                    SeoMetaOverride.og_image, SeoMetaOverride.robots, SeoMetaOverride.notes]


class SeoRobotsRuleAdmin(ModelView, model=SeoRobotsRule):
    column_list = [SeoRobotsRule.id, SeoRobotsRule.user_agent,
                   SeoRobotsRule.is_active, SeoRobotsRule.updated_at]
    column_filters = [SeoRobotsRule.is_active]


class SeoRedirectAdmin(ModelView, model=SeoRedirect):
    column_list = [SeoRedirect.id, SeoRedirect.source_path, SeoRedirect.target_path,
                   SeoRedirect.status_code, SeoRedirect.is_active, SeoRedirect.hit_count]
    column_searchable_list = [SeoRedirect.source_path, SeoRedirect.target_path]
    column_filters = [SeoRedirect.is_active]
    form_columns = [SeoRedirect.source_path, SeoRedirect.target_path,
                    SeoRedirect.status_code, SeoRedirect.is_active]


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
