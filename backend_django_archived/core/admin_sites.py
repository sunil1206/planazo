"""
Three custom Django admin sites — each with its own login and model scope.

  /vendor-admin/   → VendorAdminSite  (manages vendor categories, profiles, packages, subscriptions)
  /gift-admin/     → GiftAdminSite    (manages gift products, orders, scheduled deliveries)
  /wedding-admin/  → WeddingAdminSite (manages invitations, RSVPs, gallery, events)

Staff log in via the respective URL. Models registered here are NOT visible
on the default /admin/ site (to avoid double-registration errors we keep
default admin registrations in each app's admin.py and only register
the staff-scoped subsets below).
"""
from django.contrib.admin import AdminSite


# ── Vendor Admin ──────────────────────────────────────────────────────────────

class VendorAdminSite(AdminSite):
    site_header = "Planazo — Vendor Management"
    site_title  = "Vendor Admin"
    index_title = "Vendor Staff Panel"
    site_url    = "/vendors"


vendor_admin_site = VendorAdminSite(name="vendor_admin")


# ── Gift Admin ────────────────────────────────────────────────────────────────

class GiftAdminSite(AdminSite):
    site_header = "Planazo — Gift & Delivery Management"
    site_title  = "Gift Admin"
    index_title = "Gift & Postcard Staff Panel"
    site_url    = "/shop"


gift_admin_site = GiftAdminSite(name="gift_admin")


# ── Wedding Admin ─────────────────────────────────────────────────────────────

class WeddingAdminSite(AdminSite):
    site_header = "Planazo — Wedding & Event Management"
    site_title  = "Wedding Admin"
    index_title = "Wedding Staff Panel"
    site_url    = "/"


wedding_admin_site = WeddingAdminSite(name="wedding_admin")
