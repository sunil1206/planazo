# Marketplace Foundation — Wiring Instructions

After running the generator, you need to do four things to plug everything in.

## 1. Add the new apps to INSTALLED_APPS

Open `backend/core/settings/base.py` (or wherever your INSTALLED_APPS lives)
and add the three apps:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    "apps.products.apps.ProductsConfig",
    "apps.vendors.apps.VendorsConfig",
    "apps.marketplace.apps.MarketplaceConfig",
]
```

Order matters because models cross-reference: products defines `TimestampedModel`
which vendors and marketplace import; vendors is FK'd from products; marketplace
FKs into products.Category. Listing them in this order is safest.

## 2. Wire the URL routes

In `backend/core/urls.py`, add:

```python
from django.urls import include, path

urlpatterns = [
    # ... existing routes ...
    path("api/marketplace/", include("apps.marketplace.urls")),
    path("api/marketplace/", include("apps.products.urls")),
    path("api/marketplace/", include("apps.vendors.urls")),
]
```

All three under the same `/api/marketplace/` prefix — feels natural for clients.

## 3. Install dependencies (if missing)

The viewsets use django-filter for filtering. Confirm it is in
`backend/requirements.txt`:

```
django-filter>=23.0
```

If not, add it and rebuild the django + celery images.

## 4. Generate and run migrations

```bash
docker compose -f docker-compose.prod.yml exec django   python manage.py makemigrations products vendors marketplace
docker compose -f docker-compose.prod.yml exec django   python manage.py migrate
```

## 5. Create seed data via admin

Visit `/admin/`:

1. Marketplace Vendors → Add Vendor → fill business name, city, etc.
2. Marketplace Products → Categories → Add a few (Jewellery, Decor, Stationery)
3. Marketplace Products → Products → create one referencing the vendor + category
   - Add at least one ProductImage inline
4. Marketplace → Banners → add a HOME_HERO banner

Visit `https://planazo.in/marketplace` — you should see the home page populate.

## API endpoints summary

| Method | Path | Returns |
|---|---|---|
| GET | /api/marketplace/summary/ | totals + featured everything |
| GET | /api/marketplace/categories/ | list categories |
| GET | /api/marketplace/categories/<slug>/ | single category |
| GET | /api/marketplace/products/ | paginated, filterable |
| GET | /api/marketplace/products/<slug>/ | full product detail |
| GET | /api/marketplace/products/featured/ | top featured products |
| GET | /api/marketplace/products/related/?slug=X | related to X |
| GET | /api/marketplace/vendors/ | list vendors |
| GET | /api/marketplace/vendors/<slug>/ | single vendor |
| GET | /api/marketplace/banners/?placement=HOME_HERO | scheduled banners |

## Frontend integration

The Next.js code uses `process.env.NEXT_PUBLIC_API_URL` which must point at
the Django backend (e.g., `https://api.planazo.in`).

Routes added:

- `/marketplace` — home
- `/marketplace/products` — listing (filters via query string)
- `/marketplace/products/<slug>` — product detail
- `/marketplace/vendors/<slug>` — vendor profile

The marketplace has its own `layout.tsx` so it renders a marketplace-specific
navbar without affecting other parts of the app.

## What is NOT in Phase 1 (deliberate)

These come in later phases — the foundation is structured to accept them
without breaking changes:

- Cart + Checkout (Phase 2)
- Product personalization upload + live preview (Phase 3)
- Reviews + ratings UI (Phase 3)
- Promo codes (Phase 4)
- Pincode-based delivery zones (Phase 4)
- Vendor signup/onboarding flow (Phase 4)

The data model is already friendly to all of these — `Product.is_customizable`,
`Vendor.commission_percent`, `Banner` placements include `GIFT_HOME` /
`VENDOR_HOME` for future banner-only categories.
