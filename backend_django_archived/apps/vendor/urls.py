from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorWebsiteViewSet, VendorEnquiryViewSet, PlannerView, SubscriptionViewSet, VendorFavoriteViewSet

router = DefaultRouter()
router.register(r"",              VendorWebsiteViewSet, basename="vendor")
router.register(r"enquiries",     VendorEnquiryViewSet, basename="vendor-enquiry")
router.register(r"planner",       PlannerView,          basename="planner")
router.register(r"subscriptions", SubscriptionViewSet,  basename="vendor-subscription")
router.register(r"favorites",     VendorFavoriteViewSet, basename="vendor-favorite")

urlpatterns = [path("", include(router.urls))]
