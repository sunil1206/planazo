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
from app.models.gallery import GalleryCategory, GalleryImage, GuestSelfieMatch
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

__all__ = [
    "User",
    "CoupleWebsite", "BrideGroom", "BrideGroomStory", "BrideGroomEvent",
    "WeddingCountdown", "InvitationRSVP", "Makeyourwish", "PageVisit",
    "WeddingGalleryPhoto", "WeddingVendor",
    "VendorCategory", "VendorThemePreset", "VendorWebsite", "PortfolioCategory",
    "VendorPackage", "VendorPortfolioImage", "VendorEnquiry", "VendorReview",
    "SubscriptionPlan", "VendorSubscription", "VendorFavorite",
    "GalleryCategory", "GalleryImage", "GuestSelfieMatch",
    "GiftSeller", "GiftCategory", "GiftProduct", "ProductImage", "ProductVariant",
    "ProductReview", "Cart", "CartItem", "GiftOrder", "MarketplaceOrder",
    "MarketplaceOrderItem", "ScheduledDelivery",
    "BirthdayPage", "BirthdayEvent", "BirthdayStory", "BirthdayWish",
    "BirthdayRSVP", "BirthdayCountdown",
    "UserSubscription", "Transaction",
]
