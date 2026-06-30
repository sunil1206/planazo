"""
SQLAdmin configuration replacing Django Jazzmin + 3 custom admin sites.

Original sites:
  /admin/         → wedding_admin_site  (superuser — all models)
  /vendor-admin/  → vendor_admin_site   (VendorWebsite, enquiries, reviews …)
  /gift-admin/    → gift_admin_site     (GiftProduct, GiftOrder, MarketplaceOrder …)

New: single SQLAdmin app, three AdminAuth-protected mount points.
"""
from app.admin.main import create_admin_instances
from app.admin.views import register_views

__all__ = ["create_admin_instances", "register_views"]
