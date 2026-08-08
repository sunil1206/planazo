# SEO System — Existing Implementation Inventory

Audit date: 2026-08-08. Scope: every file in `app/seo/`, its wiring into
`app/main.py`, its callers in `app/routers/invitations.py` /
`app/routers/birthday.py` / `app/ssr/`, and the pre-existing
`SEO_ROADMAP.md` at the repo root (which documents most of this already —
cross-referenced below, not duplicated blindly).

**Headline finding: this is a real, substantially-complete Yoast/RankMath-style
system, not a stub.** It is wired into the running app (confirmed below),
backed by real database tables and migrations, has 52 passing tests
(`tests/test_seo.py`, `tests/test_ssr.py`, `tests/test_seo_part2.py` per
`SEO_ROADMAP.md`), and even has a frontend editor panel
(`frontend/src/components/SeoAnalysisPanel.jsx`) already built. Planning
work here should start from "what's the gap," not "build this from
scratch."

## 1. Wiring — confirmed live, not dead code

`app/main.py:52` imports `from app.seo.router import router as seo_router`,
and `app/main.py:177` includes it in the app's router list inside
`create_app()`. This is unconditional — not behind a flag. Additionally:

- `app/routers/invitations.py:44-48` and `app/routers/birthday.py:38-41`
  import and actively call `build_wedding_meta`/`build_birthday_meta`,
  `find_active_redirect`/`record_hit` — confirmed at
  `invitations.py:120-126` and `birthday.py:110-116` — inside the real
  `GET /websites/{slug}/` and `GET /pages/{slug}/` detail endpoints.
- `app/admin/views.py:36-39,230-271` registers all 6 SEO models
  (`SeoMetaOverride`, `SeoRobotsRule`, `SeoRedirect`,
  `SeoPerformanceSnapshot`, `BlogPost`) as SQLAdmin views under `/admin`.
- Migrations exist and are numbered in sequence with the rest of the app's
  Alembic history: `0003_add_seo_tables.py`, `0004_seo_focus_keyword_and_redirects.py`,
  `0005_vendor_category_url_slug.py`, `0006_seo_part2_tables.py`
  (`app/alembic/versions/`).

Conclusion: **live and load-bearing**, not an unused module sitting next to
the real code path.

## 2. File-by-file inventory

### `app/seo/models.py` — SQLAlchemy models

Six tables, all new (no ALTERs on pre-existing tables):

- **`SeoMetaOverride`** (`models.py:30-57`) — `path` (unique, e.g.
  `/invite/priya-arjun`), `title`, `meta_description`, `og_image`,
  `robots`, `focus_keyword`, `notes`. **Keyed by URL path, not
  `entity_type`/`entity_id`.** This is a deliberate design choice
  documented in both the module docstring (`models.py:1-24`) and
  `SEO_ROADMAP.md` ("Design choice worth calling out") — it's how
  Yoast/RankMath actually work internally, and it means one override
  mechanism covers every current and future page type without a schema
  change. Functionally equivalent to a polymorphic entity table for the
  purpose of "one row of SEO metadata per page," just addressed by URL
  instead of by FK — worth knowing if the target spec insists on literal
  `entity_type`/`entity_id` columns, but there is no functional gap this
  causes today.
- **`SeoRobotsRule`** — one row per User-agent block (`allow_paths`,
  `disallow_paths` as JSON lists), `is_active`.
- **`SeoRedirect`** — `source_path` (unique) → `target_path`,
  `status_code` (default 301), `is_active`, `hit_count`.
- **`SeoPerformanceSnapshot`** — one real Core Web Vitals reading (path,
  strategy, performance_score, LCP/CLS/TBT/FCP) from a real PageSpeed
  Insights call. Read-only from the admin UI by design.
- **`BlogPost`** — slug, title, excerpt, content (HTML), cover_image,
  author_name, tags (JSON), `status` (`draft`/`published`), `published_at`.
- **`SeoSearchConsoleToken`** — single-row table holding the GSC OAuth
  refresh token, `site_url`, `connected_by` (admin email, audit-visibility
  only), `connected_at`.

No focus-keyword *database* (a reusable keyword list with search-volume/
difficulty data, or a lookup of which pages already target which keyword)
exists — `focus_keyword` is a free-text string field per page, nothing more.

### `app/seo/schemas.py` — Pydantic I/O shapes

Full request/response schemas for every model above (Create/Update/Read
triples), plus `SeoAnalysisRequest`/`SeoCheck`/`SeoAnalysisResult` for the
analyzer, `SitemapSummary`, `GscStatus`/`GscReport`/`GscReportRow` for
Search Console, and `SeoMetaOut` (the fully-resolved title/description/
canonical/OG/JSON-LD bundle embedded directly into public API responses).
Standard, complete, no gaps worth flagging.

### `app/seo/analysis.py` — real Yoast-style scoring engine

`analyze_seo()` (`analysis.py:78-231`) is a genuine rules engine, not a
placeholder:

- **Title length** check (40-60 chars ideal, 20-70 acceptable band).
- **Meta description length** (120-156 ideal).
- **Focus keyword checks**, all skipped gracefully if no keyword is set:
  in title, in meta description, in URL slug (via a real `slugify`
  comparison), **keyword density** (occurrence count / word count,
  0.5-2.5% "natural" band, flags both zero-usage and stuffing), and
  keyword presence in the opening ~10% of content.
- **Content length** (300+ words good, 200-300 ok, <200 flagged thin).
- **Readability**: average sentence length, and a real **Flesch Reading
  Ease** implementation (`flesch_reading_ease()`, `analysis.py:62-71`) with
  its own syllable-counting heuristic (`_syllables_in_word`,
  `analysis.py:53-59`) — not a fake/rounded number.
- Each check returns a `good`/`ok`/`bad` traffic-light status
  (`_SCORE_WEIGHT = {"good": 100, "ok": 55, "bad": 0}`), and overall
  `seo_score`/`readability_score` are the mean of their category's checks
  (`_rating_for_score` buckets ≥80/≥50/below into good/ok/bad).

This **is** the SEO-score-with-checks requirement, already built. The same
thresholds are deliberately re-implemented in
`frontend/src/lib/seoAnalysis.js` for instant client-side feedback with no
network round trip — the docstring (`analysis.py:1-19`) explicitly flags
that the two must be kept in lockstep if thresholds change.

**Missing from this file specifically**: no "duplicate primary keyword"
check — nothing here (or anywhere else in `app/seo/`) queries other pages'
`focus_keyword` values to warn "this keyword is already targeted by
`/invite/other-page`." Each page's analysis is fully local to its own
title/description/slug/content. This is the one concrete scoring-side gap
against the target spec.

### `app/seo/sitemap.py` — real, DB-driven, filtered

`collect_sitemap_urls()` (`sitemap.py:48-104`) builds the sitemap from
live queries, not a hardcoded list:

- Static root `/`.
- `CoupleWebsite` rows **filtered on `is_published.is_(True)`**
  (`sitemap.py:59`) and `BirthdayPage` rows filtered the same way
  (`sitemap.py:67`) — confirms the "only published/indexable content"
  requirement is already satisfied for these two entity types.
- Vendor category/listing/detail pages from `app/ssr/`, but **only** where
  at least one real verified vendor exists behind that category/city
  combination — an empty "0 results" page is deliberately excluded even
  though it still renders a 200 (thin-content reasoning documented in the
  module docstring, `sitemap.py:1-15`).
- Published blog posts (`vendor_queries.list_published_blog_posts`,
  `sitemap.py:96-102`).

`render_sitemap_xml()` emits standard `<urlset>`/`<url>` XML with
`loc`/`lastmod`/`changefreq`/`priority`. Served at `GET /sitemap.xml`
(`app/seo/router.py:61-64`), unauthenticated, at the domain root (not under
`/api`) — correct for crawler expectations.

**Gap**: `GiftProduct` pages are not included — no frontend/SSR page
renders individual products yet, so this is a correct exclusion today, not
an oversight, but it means the sitemap will need a fourth source wired in
once a product-detail page exists (already flagged in
`SEO_ROADMAP.md`).

### `app/seo/robots.py` — real, DB-driven, with a safe fallback

`build_robots_txt()` (`robots.py:35-56`) reads active `SeoRobotsRule` rows
and renders `User-agent`/`Allow`/`Disallow` blocks from them. If the table
is empty (fresh install), it falls back to `DEFAULT_DISALLOW`
(`robots.py:17-32`), which **already excludes admin and API paths** as
required: `/api/`, `/admin`, `/vendor-admin`, `/gift-admin`, plus
authenticated-dashboard SPA routes (`/home`, `/dashboard`, `/login`,
`/weddings`, `/birthdays`, `/gallery`, `/planning`, `/custom-events`,
`/create-event`). Always appends a `Sitemap:` directive pointing at
`/sitemap.xml`. Served at `GET /robots.txt`, unauthenticated, domain root.
Satisfies the requirement fully.

### `app/seo/redirects.py` — 301/302 support real; loop detection absent

`find_active_redirect()` looks up an active `SeoRedirect` by exact
`source_path`; `record_hit()` increments `hit_count` on every real fire.
`status_code` on the model defaults to 301 but is a free-form `Integer`
column with no CHECK constraint — the CRUD layer
(`SeoRedirectCreate`/`Update` in `schemas.py`) doesn't validate it against
`{301, 302, 307, 308}` either, so any integer could be stored, though in
practice only 301/302 are mentioned anywhere in the code/docs.

**Concrete gaps**:
1. **No loop detection.** Nothing prevents `A -> B` and `B -> A`, or a
   longer cycle, from being created — `create_redirect`/`update_redirect`
   in `app/seo/router.py:223-256` only check that `source_path` isn't
   already taken, never that `target_path` doesn't chain back to a source
   that eventually points at the original request.
2. **No chain resolution.** A redirect's `target_path` is never checked
   against the redirect table itself — if `A -> B` and `B -> C` both
   exist, a request to `A` returns `target_path: B` verbatim; the caller
   (frontend) would have to re-request `B` and hit a second redirect
   itself rather than the API resolving the full chain to `C` in one hop.
3. **Scope is narrow by design, not a bug**: redirects are only consulted
   from the two slug-lookup endpoints (`invitations.py`, `birthday.py`)
   when a slug 404s. There's no general "any path on the site" redirect
   middleware — a fully general redirect manager would need nginx or the
   SPA router to consult this table on every navigation, which the module
   docstring (`redirects.py:1-13`) and `SEO_ROADMAP.md` both call out
   explicitly as future scope.
4. `status_code` values 307/308 aren't validated/rejected but also aren't
   exercised anywhere — support for them is "the column would hold it,"
   not "the system actively handles it" (e.g. no logic differentiates
   permanent vs. temporary redirect *behavior*, since this is just a
   lookup-and-return-the-code endpoint, not an HTTP-level redirect
   response itself — the actual 30x response is issued client-side by
   the SPA reacting to `SeoRedirectResponse`, not by this backend).

### `app/seo/generator.py` — meta tags + JSON-LD, real, entity-driven

`build_wedding_meta()`, `build_birthday_meta()`, `build_vendor_meta()`,
`build_product_meta()`, `build_blog_meta()` — each computes title,
description (truncated to 160 chars at a word boundary,
`_truncate()`), canonical URL, Open Graph title/description/image/type,
Twitter card, `robots` directive (correctly conditioned on the entity's own
publish/verification flags — e.g. `"index,follow" if website.is_published
else "noindex,nofollow"`, `generator.py:350`), and a JSON-LD array — then
merges in any matching `SeoMetaOverride` (`_apply_override()`,
`generator.py:68-81`).

JSON-LD builder library (`generator.py:86-296`) covers `Organization`,
`WebSite`, `BreadcrumbList`, `Event`, `LocalBusiness` (with
`aggregateRating` and embedded real `review` array — explicitly documented
as "only ever pass real, admin-approved reviews here, never fabricated",
`generator.py:169-170`), `ItemList`, `Product`, `Article`, `FAQPage`. This
is a genuinely broad schema.org coverage — more than a minimal Yoast clone
typically ships with.

**Wiring status per entity** (from the module docstring,
`generator.py:1-16`, confirmed against router code):
- `build_wedding_meta` / `build_birthday_meta` — **wired live** into
  `invitations.py` / `birthday.py` detail endpoints.
- `build_vendor_meta` — **wired live** into `app/ssr/router.py`'s
  server-rendered vendor detail page.
- `build_blog_meta` — **wired live** into `app/ssr/router.py`'s
  `/blog/{slug}` page.
- `build_product_meta` — **implemented but not called anywhere**; no
  product-detail page (SPA or SSR) exists yet to call it. This is the one
  generator function that's dead code today, by the module's own
  admission, purely because there's no page to attach it to.

### `app/seo/pagespeed.py` — real Google PageSpeed Insights API client

`fetch_core_web_vitals()` makes a real HTTP call to Google's
`pagespeedonline/v5/runPagespeed` endpoint, parses the Lighthouse
`lighthouseResult` payload for `performance_score`, LCP, CLS, TBT, FCP, and
raises `PageSpeedError` (never fabricates or falls back to fake numbers) on
any non-200 response. Works unauthenticated at a lower rate limit;
`PAGESPEED_API_KEY` raises the limit. Wired into
`POST /api/seo/admin/performance/check` (admin-only,
`app/seo/router.py:297-314`), which persists a `SeoPerformanceSnapshot`
row. **Real, not a stub.**

### `app/seo/search_console.py` — real OAuth2 + real Search Analytics API

Full Google OAuth2 authorization-code flow against the actual Search
Console / Webmasters API (`accounts.google.com/o/oauth2/v2/auth`,
`oauth2.googleapis.com/token`,
`googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query`) — reuses
the existing `GOOGLE_CLIENT_ID`/`SECRET` already configured for "Sign in
with Google." `build_authorization_url`, `exchange_code_for_tokens`,
`refresh_access_token`, `query_search_analytics` are all real `httpx`
calls, not mocks. Raises `SearchConsoleError` on failure rather than
returning fake data.

**This is not wired to return real data automatically** — not because the
code is fake, but because it genuinely requires two one-time manual steps
outside the codebase (per the module docstring, `search_console.py:1-20`,
and `SEO_ROADMAP.md`'s "manual steps" section): (1) verifying the property
in Google Search Console under an account with access, and (2) an admin
completing the OAuth consent flow via `GET /api/seo/admin/gsc/connect`
(there's no dashboard button for this yet — it has to be triggered via
`/api/docs` or curl). Until both happen, `GET /api/seo/admin/gsc/status`
correctly reports `connected: false` and `GET .../gsc/report` returns a
clean `409`, never fabricated numbers (`app/seo/router.py:490-543`).
**Correctly built to fail honestly, not yet activated in production.**

### `app/seo/slugs.py` — small helper module

`slugify()` / `unslugify_title()` — trivial, shared by `sitemap.py`,
`generator.py`, and `app/ssr/queries.py` for city/category URL segments.
Nothing notable.

### `app/seo/router.py` — the API surface

- **Public, unauthenticated**: `GET /sitemap.xml`, `GET /robots.txt`
  (`router.py:61-70`) — correct, these must be crawlable without auth.
- **Any authenticated user (not admin-gated)**: `POST /api/seo/analyze`
  (`router.py:281-292`) — intentional, per its own comment
  (`router.py:274-280`): this is the same live-scoring endpoint a
  couple/birthday-page *owner* uses in their own editor, not an
  admin-only tool. Worth flagging explicitly since the audit asked "could
  normal users hit these endpoints" — **yes, by design, for this one
  specific endpoint**, and it only echoes back an analysis of whatever
  text the caller submits — no data leakage risk.
- **Admin-only** (`_require_admin()`, `router.py:54-56` — checks
  `user.role != "ADMIN" and not user.is_superuser`, same flat check as the
  SQLAdmin auth backend): sitemap summary, full CRUD on meta overrides,
  robots rules, redirects, performance-snapshot trigger/list, blog CRUD,
  and the entire GSC connect/callback/status/disconnect/report flow. This
  is the correct majority of the surface and is consistently enforced —
  every admin route in this file calls `_require_admin(user)` as its first
  line.
- Owner-scoped SEO settings (`SeoSettingsIn`/`Out` schemas exist in
  `schemas.py`) are actually implemented in `invitations.py`/`birthday.py`
  (`GET/PUT .../seo-settings/`, per `SEO_ROADMAP.md`), not in this router
  file — worth knowing if searching for them here specifically.

**Note on the admin check itself**: `_require_admin` is duplicated
verbatim from the same flat `role == "ADMIN" or is_superuser` logic used
in `app/admin/main.py` and `app/core/dependencies.py`'s `require_role`.
There is no `SEO_MANAGER` role distinction anywhere — today, SEO admin
access is bundled into the single generic `ADMIN` role, not a separate
granular permission. This is the SEO-specific instance of the RBAC gap
described in `docs/ADMIN_SYSTEM.md`.

## 3. Requirement-by-requirement verdict

| Requirement | Status | Where |
|---|---|---|
| `seo_metadata`-style polymorphic model (focus keyword, meta title/description, canonical, robots, OG, schema) | **Satisfied**, path-keyed rather than entity_type/entity_id | `SeoMetaOverride` (`models.py:30-57`) + `SeoMetaOut`/`generator.py` for the computed/resolved side |
| SEO score / analysis with checks | **Fully satisfied** | `app/seo/analysis.py` — title/meta length, keyword-in-title/meta/slug/content/intro, density, content length, readability (sentence length + Flesch) |
| `sitemap.xml`, DB-driven, filtered by published/indexable | **Fully satisfied** | `app/seo/sitemap.py`, served live at `/sitemap.xml` |
| `robots.txt`, DB-driven, excludes admin/API | **Fully satisfied** | `app/seo/robots.py`, served live at `/robots.txt` |
| Redirect manager (301/302/307/308, loop detection) | **Partially satisfied** | 301/302 work and are live; 307/308 storable but unexercised; **no loop/chain detection at all** — the one clear functional gap in this file group |
| Open Graph | **Fully satisfied** | `og_title`/`og_description`/`og_image`/`og_type` on every `build_*_meta()` in `generator.py`, override-able via `SeoMetaOverride.og_image` |
| JSON-LD / schema.org | **Fully satisfied, broad coverage** | 8 schema types in `generator.py`, wired into 4 of 5 entity types (product pending a frontend page) |
| Google Search Console integration | **Real integration, not yet activated** | `app/seo/search_console.py` — genuine OAuth2 + Search Analytics API calls; blocked only on manual property-verification + one-time admin consent, not on missing code |
| Admin-only gating | **Correctly scoped, single flat role** | All mutating/admin endpoints gated; the one open endpoint (`/api/seo/analyze`) is intentionally open by design, not a leak; no `SEO_MANAGER`-level granularity yet (shares the platform-wide RBAC gap) |
| Core Web Vitals (bonus, not in the original ask but present) | **Fully satisfied, real data** | `app/seo/pagespeed.py`, real PageSpeed Insights API, persisted history |
| Blog / CMS content type (bonus) | **Present** | `BlogPost` model + admin CRUD + SSR pages, draft/published status |

## 4. Concrete gap list for a full Yoast-style admin editor

What's **already built** that a "build a Yoast-style system" plan would
otherwise duplicate: the scoring engine, the sitemap/robots generation, the
JSON-LD library, the override storage model, the redirect lookup, the real
PageSpeed and GSC integrations, and even a first-pass frontend panel
(`frontend/src/components/SeoAnalysisPanel.jsx`,
`frontend/src/components/Seo.jsx` render the `<head>` tags using React 19's
native head-hoisting). Do not rebuild any of these from scratch.

What's actually missing, in priority order:

1. **Dedicated admin SEO dashboard page** — today, admin interaction with
   `SeoMetaOverride`/`SeoRedirect`/`SeoRobotsRule` happens either via raw
   SQLAdmin grids (`/admin`) or by calling the JSON API directly through
   `/api/docs` — there is no purpose-built "SEO editor" screen with the
   snippet preview + live checklist UI for admin-authored content (blog
   posts, meta overrides) the way `SeoAnalysisPanel.jsx` already gives
   *page owners* for their own wedding/birthday page. This is a frontend
   task more than a backend one — the backend API (`/api/seo/analyze`,
   the override CRUD) already supports it.
2. **Redirect loop/chain detection** — the one real backend logic gap
   (see §2, `app/seo/redirects.py`). Needs: on create/update, walk the
   target chain (with a depth cap) checking for a cycle back to the new
   `source_path`, and reject with a 400 if found; optionally also resolve
   multi-hop chains server-side so callers get the final destination in
   one lookup instead of following redirects themselves.
3. **Duplicate-primary-keyword prevention** — `analyze_seo()` has no
   awareness of other pages' `focus_keyword`. Needs a query across
   `SeoMetaOverride.focus_keyword` (and `BlogPost` if it grows its own
   focus-keyword field — it doesn't have one today, only `SeoMetaOverride`
   does) to warn when a keyword is already claimed elsewhere, surfaced
   both in the analysis result and the editor UI.
4. **Keyword database** — no reusable keyword list with search volume/
   difficulty/tracked-pages exists. This is a genuinely new subsystem, not
   a gap in existing code — and per `SEO_ROADMAP.md`, real search-volume
   data is a paid third-party dependency (no free API), same caveat as
   rank tracking.
5. **`SEO_MANAGER`-level RBAC** — today SEO admin access is bundled into
   the single flat `ADMIN` role (see §2, "Note on the admin check
   itself"). Splitting this out depends on the platform-wide RBAC rebuild
   described in `docs/ADMIN_SYSTEM.md` §1.3/§2, not on anything specific
   to the SEO module itself.
6. **Wire `build_product_meta()`** — implemented, tested, just needs a
   product-detail page (frontend or SSR) to call it from, plus a fourth
   sitemap source once that page exists.
7. **Redirect scope widening** — extend beyond the two slug-lookup entry
   points to a general path-based redirect check (nginx-level or SPA
   router-level), if "redirect manager" needs to cover arbitrary URLs
   site-wide rather than just retired wedding/birthday slugs. Explicitly
   out of scope in the current design, called out in both
   `redirects.py`'s docstring and `SEO_ROADMAP.md`.

Everything else in the original ask — `seo_metadata` model, score/analysis,
sitemap, robots.txt, Open Graph, JSON-LD, admin gating — is **already done
and live**, not greenfield work.
