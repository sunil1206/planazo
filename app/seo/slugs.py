"""SEO module — slug helpers shared by the SSR landing pages (app/ssr/) and
meta generation (app/seo/generator.py).

Cities are stored as free-text (VendorWebsite.city, e.g. "New Delhi"), not a
separate slugged column, so URL <-> city matching is done by slugifying both
sides and comparing — see app/ssr/queries.py.
"""
import re


def slugify(text: str) -> str:
    text = (text or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def unslugify_title(slug: str) -> str:
    """Best-effort human-readable form of a slug, e.g. "new-delhi" -> "New Delhi".

    Only used as a display fallback when no real city string with correct
    capitalization is available (e.g. a category-index page listing cities
    before any specific vendor record is loaded).
    """
    return " ".join(w.capitalize() for w in (slug or "").split("-") if w)
