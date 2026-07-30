"""SSR module — routes for the server-rendered vendor SEO landing pages.

URL structure:
  /vendors/{category-slug}                       — category index (choose a city)
  /vendors/{category-slug}/{city-slug}            — vendor listing for that city
  /vendors/{category-slug}/{city-slug}/{slug}      — vendor detail page

Namespaced under /vendors/ (rather than a bare-root pattern like
/wedding-planners/paris) so nginx can route these three path shapes to this
FastAPI router deterministically, without any risk of colliding with the
SPA's own top-level routes (/weddings, /birthdays, /gifts, /invite/:slug,
...). See nginx/planazo.conf and SEO_ROADMAP.md.

Every page here is real server-rendered HTML built from the same Postgres
data the SPA/API uses — no separate content store, no fabricated stats.
"""
from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.base import get_db
from app.seo.slugs import slugify, unslugify_title
from app.seo.generator import (
    _abs_media, _abs_url, _truncate, SITE_NAME,
    breadcrumb_schema, item_list_schema, faq_schema, build_vendor_meta, build_blog_meta,
)
from app.ssr import queries as q

router = APIRouter(tags=["ssr-seo-pages"])
templates = Jinja2Templates(directory="app/ssr/templates")


def _render(request: Request, template: str, **context):
    context.setdefault("site_url", settings.FRONTEND_URL.rstrip("/"))
    context.setdefault("year", datetime.now(timezone.utc).year)
    return templates.TemplateResponse(request, template, context)


def _not_found(request: Request) -> HTMLResponse:
    html = templates.get_template("not_found.html").render(
        site_url=settings.FRONTEND_URL.rstrip("/")
    )
    return HTMLResponse(html, status_code=404)


# ── Category index: /vendors/{category_slug} ───────────────────────────────

@router.get("/vendors/{category_slug}", response_class=HTMLResponse, include_in_schema=False)
async def category_index(category_slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    category = await q.get_category_by_url_slug(db, category_slug)
    if not category:
        return _not_found(request)

    vendors = await q.list_vendors_for_category(db, category.key)
    seen: dict[str, str] = {}
    for v in vendors:
        cs = slugify(v.city)
        if cs and cs not in seen:
            seen[cs] = v.city
    cities = [{"slug": cs, "name": name} for cs, name in seen.items()]

    path = f"/vendors/{category.url_slug}"
    url = _abs_url(path)
    title = f"{category.name} Directory — Find Verified Vendors | {SITE_NAME}"
    description = _truncate(
        category.description or f"Browse verified {category.name.lower()} across {len(cities)} cities on Planazo.",
        160,
    )
    meta = {
        "title": title, "description": description, "canonical_url": url,
        "og_title": title, "og_description": description, "og_type": "website",
        "twitter_card": "summary_large_image", "robots": "index,follow" if cities else "noindex,follow",
    }
    json_ld = [
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": category.name, "path": path}]),
        item_list_schema(
            [{"name": f"{category.name} in {c['name']}", "url": _abs_url(f"{path}/{c['slug']}")} for c in cities],
            name=f"{category.name} by City",
        ),
    ]
    return _render(request, "category_index.html", meta=meta, json_ld=json_ld, category=category, cities=cities)


# ── Listing: /vendors/{category_slug}/{city_slug} ──────────────────────────

@router.get("/vendors/{category_slug}/{city_slug}", response_class=HTMLResponse, include_in_schema=False)
async def vendor_listing(category_slug: str, city_slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    category = await q.get_category_by_url_slug(db, category_slug)
    if not category:
        return _not_found(request)

    vendors = await q.list_vendors_for_category_and_city(db, category.key, city_slug)
    city = vendors[0].city if vendors else unslugify_title(city_slug)
    ratings = await q.get_ratings_for_vendors(db, [v.id for v in vendors])

    path = f"/vendors/{category.url_slug}/{city_slug}"
    url = _abs_url(path)
    vendor_cards = []
    for v in vendors:
        r = ratings.get(v.id)
        vendor_cards.append({
            "title": v.title,
            "tagline": v.tagline,
            "thumbnail_url": _abs_media(v.thumbnail),
            "is_verified": v.is_verified,
            "rating": r.average if r else None,
            "review_count": r.count if r else 0,
            "detail_url": f"{path}/{v.slug}",
        })

    related_cities_raw = await q.list_related_cities(db, category.key, city_slug)
    related_cities = [{"slug": slugify(c), "name": c} for c in related_cities_raw]
    related_categories = await q.list_related_categories_in_city(db, city_slug, category.key)

    title = f"{category.name} in {city} | {SITE_NAME}"
    description = _truncate(
        f"Find {len(vendors)} verified {category.name.lower()} in {city}. "
        f"Compare portfolios, reviews and pricing, and book directly on Planazo.",
        160,
    )
    faqs = [
        {"question": f"Are the {category.name.lower()} in {city} verified?",
         "answer": f"Vendors marked “Verified on Planazo” have had their business details reviewed by our team before being listed."},
        {"question": f"How do I contact a {category.name.lower().rstrip('s')} in {city}?",
         "answer": "Each vendor's profile page has a direct phone number and email — no account required to reach out."},
        {"question": "Is it free to browse vendors on Planazo?",
         "answer": "Yes, browsing and contacting vendors is free. Creating an event page to manage your RSVPs, guest list, and bookings requires a free Planazo account."},
    ]

    meta = {
        "title": title, "description": description, "canonical_url": url,
        "og_title": title, "og_description": description, "og_type": "website",
        "twitter_card": "summary_large_image", "robots": "index,follow" if vendors else "noindex,follow",
    }
    json_ld = [
        breadcrumb_schema([
            {"name": "Home", "path": "/"},
            {"name": category.name, "path": f"/vendors/{category.url_slug}"},
            {"name": city, "path": path},
        ]),
        item_list_schema(
            [{"name": v.title, "url": _abs_url(vc["detail_url"])} for v, vc in zip(vendors, vendor_cards)],
            name=f"{category.name} in {city}",
        ),
        faq_schema(faqs),
    ]

    return _render(
        request, "listing.html", meta=meta, json_ld=json_ld,
        category=category, city=city, city_slug=city_slug, vendors=vendor_cards,
        related_cities=related_cities, related_categories=related_categories, faqs=faqs,
    )


# ── Detail: /vendors/{category_slug}/{city_slug}/{slug} ────────────────────

@router.get("/vendors/{category_slug}/{city_slug}/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def vendor_detail(category_slug: str, city_slug: str, slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    category = await q.get_category_by_url_slug(db, category_slug)
    if not category:
        return _not_found(request)

    vendor = await q.get_vendor_detail(db, category.key, city_slug, slug)
    if not vendor:
        return _not_found(request)

    seo = await build_vendor_meta(db, vendor)
    reviews = await q.get_approved_reviews(db, vendor.id)
    ratings = await q.get_ratings_for_vendors(db, [vendor.id])
    rating = ratings.get(vendor.id)
    portfolio_rows = await q.get_portfolio_images(db, vendor.id)
    portfolio = [{"url": _abs_media(p.picture), "title": p.title} for p in portfolio_rows]

    all_in_city = await q.list_vendors_for_category_and_city(db, category.key, city_slug)
    related_vendors = [
        {"title": v.title, "detail_url": f"/vendors/{category.url_slug}/{city_slug}/{v.slug}"}
        for v in all_in_city if v.id != vendor.id
    ][:4]

    meta = {
        "title": seo.title, "description": seo.description, "canonical_url": seo.canonical_url,
        "og_title": seo.og_title, "og_description": seo.og_description, "og_image": seo.og_image,
        "og_type": seo.og_type, "twitter_card": seo.twitter_card, "robots": seo.robots,
    }

    return _render(
        request, "detail.html", meta=meta, json_ld=seo.json_ld,
        category=category, city_slug=city_slug, rating=rating,
        vendor={
            "title": vendor.title, "bio": vendor.bio, "tagline": vendor.tagline,
            "city": vendor.city, "phone": vendor.phone, "email": vendor.email,
            "address": vendor.address, "is_verified": vendor.is_verified,
            "cover_image_url": _abs_media(vendor.cover_image),
        },
        packages=[{"name": p.name, "price": p.price, "description": p.description} for p in vendor.packages if p.is_available],
        portfolio=portfolio, reviews=reviews, related_vendors=related_vendors,
    )


# ── Blog: /blog, /blog/{slug} ────────────────────────────────────────────────

@router.get("/blog", response_class=HTMLResponse, include_in_schema=False)
async def blog_index(request: Request, db: AsyncSession = Depends(get_db)):
    posts = await q.list_published_blog_posts(db)
    path = "/blog"
    url = _abs_url(path)
    title = f"Blog | {SITE_NAME}"
    description = "Wedding planning guides, vendor spotlights, and celebration ideas from Planazo."
    meta = {
        "title": title, "description": description, "canonical_url": url,
        "og_title": title, "og_description": description, "og_type": "website",
        "twitter_card": "summary_large_image", "robots": "index,follow" if posts else "noindex,follow",
    }
    json_ld = [
        breadcrumb_schema([{"name": "Home", "path": "/"}, {"name": "Blog", "path": path}]),
        item_list_schema(
            [{"name": p.title, "url": _abs_url(f"/blog/{p.slug}")} for p in posts], name="Planazo Blog",
        ),
    ]
    return _render(request, "blog_index.html", meta=meta, json_ld=json_ld, posts=[
        {"slug": p.slug, "title": p.title, "excerpt": p.excerpt,
         "cover_image_url": _abs_media(p.cover_image),
         "published_at": p.published_at.date().isoformat() if p.published_at else ""}
        for p in posts
    ])


@router.get("/blog/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def blog_detail(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    post = await q.get_published_blog_post(db, slug)
    if not post:
        return _not_found(request)

    seo = await build_blog_meta(db, post)
    meta = {
        "title": seo.title, "description": seo.description, "canonical_url": seo.canonical_url,
        "og_title": seo.og_title, "og_description": seo.og_description, "og_image": seo.og_image,
        "og_type": seo.og_type, "twitter_card": seo.twitter_card, "robots": seo.robots,
    }
    return _render(
        request, "blog_detail.html", meta=meta, json_ld=seo.json_ld,
        post={
            "title": post.title, "content": post.content, "author_name": post.author_name,
            "tags": post.tags or [], "cover_image_url": _abs_media(post.cover_image),
            "published_at": post.published_at.date().isoformat() if post.published_at else "",
        },
    )
