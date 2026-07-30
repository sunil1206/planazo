"""SEO module — meta tag + JSON-LD generation.

Each `build_*_meta()` function takes the entity's own ORM object plus a db
session, computes sane defaults from real data (no invented numbers), checks
for an admin SeoMetaOverride keyed by the page's canonical path, and returns
a fully-resolved SeoMetaOut ready to embed in an API response or serialize
into <head> tags on the frontend.

Only build_wedding_meta() and build_birthday_meta() are currently wired into
a router (see app/routers/invitations.py, app/routers/birthday.py) because
those are the only two page types with a live public frontend route today.
build_vendor_meta() / build_product_meta() are implemented and tested but not
yet called anywhere — wiring them in is a two-line change once
frontend/src/pages has an actual vendor-profile / product-detail page to
render them on (see SEO_ROADMAP.md).
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.seo.models import SeoMetaOverride
from app.seo.schemas import SeoMetaOut

SITE_NAME = "Planazo"
DEFAULT_OG_IMAGE = "/logo.png"  # served from frontend/public — always resolvable


# ── Small helpers ───────────────────────────────────────────────────────────

def _truncate(text: str, length: int) -> str:
    text = (text or "").strip()
    if len(text) <= length:
        return text
    return text[: length - 1].rsplit(" ", 1)[0] + "…"


def _abs_url(path: str) -> str:
    """FRONTEND_URL + path, collapsing any doubled slash."""
    base = settings.FRONTEND_URL.rstrip("/")
    if not path:
        return base
    return f"{base}/{path.lstrip('/')}"


def _abs_media(path: Optional[str]) -> Optional[str]:
    """Best-effort absolute URL for a stored image path.

    Image columns across the app (thumbnail, cover_image, ...) sometimes
    store a full URL (S3/R2), sometimes a path already prefixed with
    settings.MEDIA_URL, sometimes a bare filename — this normalizes all three.
    """
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if path.startswith("/"):
        return _abs_url(path)
    return _abs_url(f"{settings.MEDIA_URL.rstrip('/')}/{path}")


async def _get_override(db: AsyncSession, path: str) -> Optional[SeoMetaOverride]:
    result = await db.execute(select(SeoMetaOverride).where(SeoMetaOverride.path == path))
    return result.scalar_one_or_none()


def _apply_override(resolved: SeoMetaOut, override: Optional[SeoMetaOverride]) -> SeoMetaOut:
    if not override:
        return resolved
    if override.title:
        resolved.title = override.title
        resolved.og_title = override.title
    if override.meta_description:
        resolved.description = override.meta_description
        resolved.og_description = override.meta_description
    if override.og_image:
        resolved.og_image = _abs_media(override.og_image)
    if override.robots:
        resolved.robots = override.robots
    return resolved


# ── JSON-LD builders (schema.org) ──────────────────────────────────────────

def organization_schema() -> Dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SITE_NAME,
        "url": settings.FRONTEND_URL,
        "logo": _abs_url(DEFAULT_OG_IMAGE),
    }


def website_schema() -> Dict[str, Any]:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": settings.FRONTEND_URL,
    }


def breadcrumb_schema(items: List[Dict[str, str]]) -> Dict[str, Any]:
    """items: [{"name": "Home", "path": "/"}, {"name": "Weddings", "path": "/weddings"}, ...]"""
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": item["name"],
                "item": _abs_url(item["path"]),
            }
            for i, item in enumerate(items)
        ],
    }


def event_schema(
    *,
    name: str,
    description: str,
    url: str,
    image: Optional[str] = None,
    start_date: Optional[str] = None,  # ISO 8601
    location_name: Optional[str] = None,
) -> Dict[str, Any]:
    schema: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": name,
        "description": description,
        "url": url,
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
    }
    if image:
        schema["image"] = [image]
    if start_date:
        schema["startDate"] = start_date
    if location_name:
        schema["location"] = {"@type": "Place", "name": location_name}
    else:
        # schema.org requires *some* location for Event; a virtual placeholder
        # is the documented fallback when the physical venue isn't known yet.
        schema["location"] = {
            "@type": "VirtualLocation",
            "url": url,
        }
    return schema


def local_business_schema(
    *,
    name: str,
    description: str,
    url: str,
    image: Optional[str] = None,
    phone: Optional[str] = None,
    city: Optional[str] = None,
    address: Optional[str] = None,
    rating: Optional[float] = None,
    review_count: Optional[int] = None,
) -> Dict[str, Any]:
    schema: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": name,
        "description": description,
        "url": url,
    }
    if image:
        schema["image"] = [image]
    if phone:
        schema["telephone"] = phone
    if city or address:
        schema["address"] = {
            "@type": "PostalAddress",
            **({"addressLocality": city} if city else {}),
            **({"streetAddress": address} if address else {}),
        }
    if rating is not None and review_count:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": rating,
            "reviewCount": review_count,
        }
    return schema


def product_schema(
    *,
    name: str,
    description: str,
    url: str,
    image: Optional[str],
    price: float,
    currency: str = "INR",
    availability: bool = True,
) -> Dict[str, Any]:
    schema: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description,
        "url": url,
        "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": currency,
            "price": str(price),
            "availability": (
                "https://schema.org/InStock" if availability else "https://schema.org/OutOfStock"
            ),
        },
    }
    if image:
        schema["image"] = [image]
    return schema


def faq_schema(qa_pairs: List[Dict[str, str]]) -> Dict[str, Any]:
    """qa_pairs: [{"question": "...", "answer": "..."}, ...]"""
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": qa["question"],
                "acceptedAnswer": {"@type": "Answer", "text": qa["answer"]},
            }
            for qa in qa_pairs
        ],
    }


# ── Per-entity meta builders ────────────────────────────────────────────────

async def build_wedding_meta(db: AsyncSession, website) -> SeoMetaOut:
    """website: app.models.invitation.CoupleWebsite (with .events loaded if available)."""
    path = f"/invite/{website.slug}"
    url = _abs_url(path)

    description = _truncate(
        " & ".join(x for x in [website.bride_info, website.groom_info] if x)
        or f"You're invited to {website.couple}'s wedding. RSVP, see the schedule, and view photos on Planazo.",
        160,
    )
    title = f"{website.couple} — Wedding Invitation | {SITE_NAME}"
    image = _abs_media(website.thumbnail) or _abs_url(DEFAULT_OG_IMAGE)

    start_date = None
    location_name = None
    # Queried explicitly rather than reading website.events — callers of
    # build_wedding_meta() aren't required to have eager-loaded that
    # relationship (accessing a lazy relationship outside the request's
    # async context raises MissingGreenlet), and this only needs one row.
    from app.models.invitation import BrideGroomEvent
    first_event = await db.execute(
        select(BrideGroomEvent)
        .where(BrideGroomEvent.website_id == website.id)
        .order_by(BrideGroomEvent.order)
        .limit(1)
    )
    first = first_event.scalar_one_or_none()
    if first:
        location_name = first.location_name or None

    json_ld = [
        event_schema(
            name=f"{website.couple}'s Wedding",
            description=description,
            url=url,
            image=image,
            start_date=start_date,
            location_name=location_name,
        ),
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": website.couple, "path": path}]),
    ]

    resolved = SeoMetaOut(
        title=title,
        description=description,
        canonical_url=url,
        og_title=title,
        og_description=description,
        og_image=image,
        og_type="website",
        robots="index,follow" if website.is_published else "noindex,nofollow",
        json_ld=json_ld,
    )
    return _apply_override(resolved, await _get_override(db, path))


async def build_birthday_meta(db: AsyncSession, page) -> SeoMetaOut:
    """page: app.models.birthday.BirthdayPage."""
    path = f"/birthday/{page.slug}"
    url = _abs_url(path)

    description = _truncate(
        page.bio or f"Celebrate {page.honoree_name}'s birthday — RSVP, share wishes, and view photos on Planazo.",
        160,
    )
    honoree_title = page.title or f"{page.honoree_name}'s Birthday"
    title = f"{honoree_title} | {SITE_NAME}"
    image = _abs_media(page.cover_image) or _abs_media(page.honoree_image) or _abs_url(DEFAULT_OG_IMAGE)

    json_ld = [
        event_schema(
            name=page.title or f"{page.honoree_name}'s Birthday",
            description=description,
            url=url,
            image=image,
        ),
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": page.honoree_name, "path": path}]),
    ]

    resolved = SeoMetaOut(
        title=title,
        description=description,
        canonical_url=url,
        og_title=title,
        og_description=description,
        og_image=image,
        og_type="website",
        robots="index,follow" if page.is_published else "noindex,nofollow",
        json_ld=json_ld,
    )
    return _apply_override(resolved, await _get_override(db, path))


async def build_vendor_meta(db: AsyncSession, vendor) -> SeoMetaOut:
    """vendor: app.models.vendor.VendorWebsite.

    Not wired into a router yet — no public vendor-profile frontend page
    exists (see SEO_ROADMAP.md). Ready to call as soon as one does; the
    canonical path scheme (/vendor/{slug}) is reserved so overrides created
    now would carry forward.
    """
    path = f"/vendor/{vendor.slug}"
    url = _abs_url(path)

    category = (vendor.category or "").replace("_", " ").title()
    location_bit = f" in {vendor.city}" if vendor.city else ""
    title = f"{vendor.title} — {category}{location_bit} | {SITE_NAME}" if category else f"{vendor.title} | {SITE_NAME}"
    description = _truncate(
        vendor.tagline or vendor.bio or f"{vendor.title} — book verified {category or 'vendors'}{location_bit} on Planazo.",
        160,
    )
    image = _abs_media(vendor.cover_image) or _abs_media(vendor.thumbnail) or _abs_url(DEFAULT_OG_IMAGE)

    json_ld = [
        local_business_schema(
            name=vendor.title,
            description=description,
            url=url,
            image=image,
            phone=vendor.phone or None,
            city=vendor.city or None,
            address=vendor.address or None,
        ),
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": vendor.title, "path": path}]),
    ]

    resolved = SeoMetaOut(
        title=title,
        description=description,
        canonical_url=url,
        og_title=title,
        og_description=description,
        og_image=image,
        og_type="business.business",
        robots="index,follow" if (vendor.is_active and vendor.is_verified) else "noindex,follow",
        json_ld=json_ld,
    )
    return _apply_override(resolved, await _get_override(db, path))


async def build_product_meta(db: AsyncSession, product) -> SeoMetaOut:
    """product: app.models.gift.GiftProduct.

    Not wired into a router yet — no public product-detail frontend page
    exists (see SEO_ROADMAP.md).
    """
    path = f"/gifts/{product.slug}"
    url = _abs_url(path)

    title = f"{product.name} | {SITE_NAME} Gifts"
    description = _truncate(product.short_desc or product.description or product.name, 160)
    image = _abs_media(product.image) or _abs_url(DEFAULT_OG_IMAGE)

    json_ld = [
        product_schema(
            name=product.name,
            description=description,
            url=url,
            image=image,
            price=float(product.price or 0),
            availability=bool(product.is_available),
        ),
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": "Gifts", "path": "/gifts"}, {"name": product.name, "path": path}]),
    ]

    resolved = SeoMetaOut(
        title=title,
        description=description,
        canonical_url=url,
        og_title=title,
        og_description=description,
        og_image=image,
        og_type="product",
        robots="index,follow" if product.is_available else "noindex,follow",
        json_ld=json_ld,
    )
    return _apply_override(resolved, await _get_override(db, path))
