# Import all models so SQLAlchemy mapper is aware of every table.
# Order matters — Base.metadata is populated on import.
from app.models.user import User
from app.models.invitation import (
    CoupleWebsite, BrideGroom, BrideGroomStory, BrideGroomEvent,
    WeddingCountdown, InvitationRSVP, Makeyourwish, PageVisit,
    WeddingGalleryPhoto, WeddingVendor,
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
from app.models.permissions import (
    EventPermission, PhotographerProfile, PhotographerAssignment,
)
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
from app.models.custom_event import (
    CustomEvent, ChecklistItem, BudgetItem, EventNote, EventGallery, EventFile, EventMember,
)
from app.models.planning import (
    PlanningChecklistItem, PlanningBudgetItem,
    Guest as PlanningGuest,
    VendorBooking as PlanningVendorBooking,
)

__all__ = [
    "User",
    "CoupleWebsite", "BrideGroom", "BrideGroomStory", "BrideGroomEvent",
    "WeddingCountdown", "InvitationRSVP", "Makeyourwish", "PageVisit",
    "WeddingGalleryPhoto", "WeddingVendor",
    "VendorCategory", "VendorThemePreset", "VendorWebsite", "PortfolioCategory",
    "VendorPackage", "VendorPortfolioImage", "VendorEnquiry", "VendorReview",
    "SubscriptionPlan", "VendorSubscription", "VendorFavorite",
    "GalleryCategory", "GalleryAlbum", "GalleryImage",
    "GalleryMediaLike", "GalleryMediaComment", "GuestSelfieMatch",
    "EventPermission", "PhotographerProfile", "PhotographerAssignment",
    "GiftSeller", "GiftCategory", "GiftProduct", "ProductImage", "ProductVariant",
    "ProductReview", "Cart", "CartItem", "GiftOrder", "MarketplaceOrder",
    "MarketplaceOrderItem", "ScheduledDelivery",
    "BirthdayPage", "BirthdayEvent", "BirthdayStory", "BirthdayWish",
    "BirthdayRSVP", "BirthdayCountdown",
    "UserSubscription", "Transaction",
    "CustomEvent", "ChecklistItem", "BudgetItem", "EventNote", "EventGallery", "EventFile", "EventMember",
    "PlanningChecklistItem", "PlanningBudgetItem", "PlanningGuest", "PlanningVendorBooking",
]
