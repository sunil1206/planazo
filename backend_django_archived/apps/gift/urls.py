from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GiftCategoryViewSet, GiftProductViewSet, GiftOrderViewSet,
    GiftSellerViewSet, SellerProductViewSet, SellerOrderViewSet,
    CartViewSet, MarketplaceOrderViewSet, SellerMarketplaceOrderViewSet,
    ScheduledDeliveryViewSet,
)

router = DefaultRouter()
router.register(r"categories",              GiftCategoryViewSet,          basename="gift-category")
router.register(r"products",               GiftProductViewSet,           basename="gift-product")
router.register(r"orders",                 GiftOrderViewSet,             basename="gift-order")
router.register(r"cart",                   CartViewSet,                  basename="gift-cart")
router.register(r"marketplace/orders",     MarketplaceOrderViewSet,      basename="marketplace-order")
router.register(r"seller/profile",         GiftSellerViewSet,            basename="gift-seller")
router.register(r"seller/products",        SellerProductViewSet,         basename="seller-product")
router.register(r"seller/orders",          SellerOrderViewSet,           basename="seller-order")
router.register(r"seller/marketplace",     SellerMarketplaceOrderViewSet, basename="seller-marketplace")
router.register(r"scheduled",              ScheduledDeliveryViewSet,     basename="scheduled-delivery")

urlpatterns = [path("", include(router.urls))]
