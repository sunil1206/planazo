# Planazo SEO — What's Built, What's Next

This covers the SEO system living in `app/seo/` (backend) and
`frontend/src/components/Seo.jsx` (frontend). It's written in two parts:
what's real and working today, and what a genuine Semrush/Ahrefs-style
system would need on top — including which parts require paid third-party
data and can't be faked.

## Part 1 — Built and working now

### Architecture

```
app/seo/
  models.py     — SeoMetaOverride, SeoRobotsRule, SeoRedirect (SQLAlchemy)
  schemas.py    — Pydantic request/response shapes
  generator.py  — meta tag + JSON-LD builders, per entity type
  analysis.py   — on-page SEO + readability analysis engine (Yoast-style checklist)
  redirects.py  — redirect lookup used by invitations.py / birthday.py
  sitemap.py    — sitemap.xml builder
  robots.py     — robots.txt builder
  router.py     — GET /sitemap.xml, GET /robots.txt, POST /api/seo/analyze,
                  /api/seo/admin/* CRUD (overrides, robots rules, redirects)

frontend/src/components/Seo.jsx            — renders <title>/<meta>/<link>/JSON-LD
                                              using React 19's native head-tag hoisting
                                              (no react-helmet dependency needed)
frontend/src/components/SeoAnalysisPanel.jsx — the Yoast/RankMath-style "SEO" tab:
                                              snippet preview, focus keyword input,
                                              live traffic-light scores, checklist
frontend/src/lib/seoAnalysis.js            — same analysis rules as analysis.py,
                                              reimplemented in JS so the panel above
                                              gets instant feedback with no network
                                              round-trip per keystroke

app/ssr/
  router.py     — GET /vendors/{category}[/{city}[/{slug}]] — real
                  server-rendered HTML (not the SPA)
  queries.py    — DB access for the pages above
  templates/    — Jinja2 templates (base, category_index, listing, detail)
```

**Why `app/ssr/` exists at all:** `frontend/` is a Vite + React SPA — every
route is client-rendered. Crawlers that don't execute JavaScript (Bing,
GPTBot, PerplexityBot, ClaudeBot, and others) never see a client-rendered
page's real content, only the empty shell in `index.html`. Migrating the
whole frontend to a framework with SSR/SSG (Next.js, etc.) would fix this
properly but is a large separate rewrite; `app/ssr/` is the pragmatic
middle path — real, crawler-visible HTML for the pages that most need to
rank (vendor listings/profiles), built directly from Postgres with FastAPI +
Jinja2, sitting alongside the SPA rather than replacing it. See "Vendor SEO
landing pages" below for exactly what it covers.

Design choice worth calling out: `SeoMetaOverride` is keyed by URL **path**
(e.g. `/invite/priya-arjun`), not by a foreign key to a specific table. This
is how Yoast/RankMath actually work internally, and it means the same
override mechanism works for every current and future page type without a
schema change.

### What it does today

- **Wedding invitations (`/invite/:slug`)** and **birthday pages
  (`/birthday/:slug`)** — the only two page types with both a real slug and
  a live public frontend route right now — get fully computed meta tags
  (title, description, Open Graph, Twitter card, canonical URL) and JSON-LD
  (`Event` + `BreadcrumbList`) generated from real data (couple/honoree name,
  bio text, cover photo, publish status), embedded directly in the existing
  `GET /api/invitations/websites/{slug}/` and `GET /api/birthday/pages/{slug}/`
  responses. No extra API round-trip.
- **Admin override**: any field (title, description, OG image, robots
  directive) can be overridden per-path via `SeoMetaOverride`, editable right
  now at `/admin` (SQLAdmin) with zero frontend work, or via
  `/api/seo/admin/overrides` once a dedicated dashboard page exists.
- **`/sitemap.xml`** — dynamically built from published `CoupleWebsite` and
  `BirthdayPage` rows, plus every vendor category/listing/detail page from
  `app/ssr/` that has at least one real verified vendor behind it (an empty
  "0 results" page isn't worth indexing even though it still renders a real
  200). Product pages still aren't included — no page renders them yet.
- **`/robots.txt`** — admin-configurable via `SeoRobotsRule`; falls back to
  sensible hardcoded defaults (block `/api/`, `/admin`, `/dashboard`, etc.)
  if the table is empty, so it's never accidentally wide open or fully
  blocked.
- Both are served at the domain root (not under `/api`) via new nginx
  `location =` blocks in `nginx/planazo.conf` and `nginx/nginx.conf`.
- **On-page SEO analysis** (Yoast/RankMath's signature "traffic light" box):
  every couple/birthday-page owner gets an "SEO" tab in their own editor
  (`InvitationEditor.jsx`, `BirthdayEditor.jsx`) showing a live Google
  snippet preview, a focus keyword field, and two 0-100 scores (SEO,
  Readability) with a checklist explaining each one — title/meta-description
  length, focus keyword presence in title/meta/slug/content, keyword
  density (0.5-2.5% is the "natural" band), content length (300+ words),
  sentence length, and Flesch reading ease. All computed client-side
  (`frontend/src/lib/seoAnalysis.js`) for instant feedback; the same rules
  exist server-side (`app/seo/analysis.py`, `POST /api/seo/analyze`) for API
  consumers and tests. Saving writes to the same `SeoMetaOverride` row the
  admin CRUD uses, scoped so an owner can only edit their own page
  (`GET/PUT /api/invitations/websites/{slug}/seo-settings/`,
  `GET/PUT /api/birthday/pages/{slug}/seo-settings/`).
- **Redirect manager** (like Yoast Premium's / the Redirection plugin's):
  admin-managed 301/302 rules (`SeoRedirect`, CRUD under
  `/api/seo/admin/redirects`, also editable at `/admin`). When a wedding
  invite or birthday page's slug lookup comes up empty, `app/seo/redirects.py`
  checks for an active rule before returning 404; if one matches, the API
  responds with `{"redirect": true, "target_path": ...}` and the frontend
  (`InvitationSite.jsx` / `BirthdaySite.jsx`) client-side-navigates there
  instead of showing a dead page. Scope note: this only covers the two
  page types with a real slug-based API lookup today — a fully general
  "redirect any URL on the site" manager would need nginx (or the SPA
  router itself) to consult this table on every navigation, not just these
  two detail routes.

### Vendor SEO landing pages (`app/ssr/`)

`build_vendor_meta()` is now wired in — but into a *new* server-rendered
page (`app/ssr/router.py`), not the SPA, for the crawler-visibility reason
explained above. URL structure:

```
/vendors/{category-slug}                          e.g. /vendors/wedding-planners
/vendors/{category-slug}/{city-slug}               e.g. /vendors/wedding-planners/paris
/vendors/{category-slug}/{city-slug}/{vendor-slug} e.g. /vendors/wedding-planners/paris/dream-events
```

(Namespaced under `/vendors/` rather than a bare-root pattern so nginx can
route these three shapes to FastAPI deterministically, with zero risk of
colliding with the SPA's own top-level routes — `/weddings`, `/birthdays`,
`/invite/:slug`, etc.)

What each page has, all from real data (nothing fabricated):
- **Category index** — every city with at least one verified vendor in that
  category, linked.
- **Listing page** — real verified vendor cards (name, tagline, real
  aggregate rating from approved `VendorReview` rows, verified badge),
  `ItemList` + `BreadcrumbList` + `FAQPage` JSON-LD, related-cities and
  related-categories internal links (only ones with real vendors behind
  them), a small honest FAQ section.
- **Vendor detail page** — bio, real packages/pricing, real portfolio
  images, real approved reviews, `LocalBusiness` JSON-LD with
  `aggregateRating` and embedded `review` array, direct `tel:`/`mailto:`
  contact links (no JS-dependent enquiry form — the SPA doesn't have one
  either yet), related-vendors-in-same-city links.
- Only `is_active` + `is_verified` vendors with both a category and a city
  filled in get a page — an incomplete profile doesn't get indexed yet.

`VendorCategory` gained a `url_slug` column (migration `0005`, backfilled
from `key` automatically) to back the pretty category URL segment.

`build_product_meta()` (for `GiftProduct`) is still unwired — no
server-rendered or SPA page exists for individual gift products yet. Same
two-line pattern once one does.

### Explicitly out of scope for "SEO plugin," in scope for actual page-building

An interactive JS enquiry/contact form, favoriting, and review submission
directly from the vendor SEO page (rather than plain `tel:`/`mailto:`
links) would need either a bit of vanilla JS on these pages or a link into
the SPA once it has its own vendor-profile view — frontend feature work,
not an SEO task. Worth prioritizing independent of anything else here.

## Part 2 — What a full Semrush/Ahrefs-style system needs (and why it's phased separately)

The original spec asked for rank tracking, competitor analysis, backlink
monitoring, domain authority, Core Web Vitals reporting, and search
performance data. These are real, valuable features — but unlike
everything in Part 1, most of them **can't be honestly built from data
Planazo already has**. Faking them (hardcoded numbers, a "Domain
Authority: 42" that isn't backed by a real crawl) would be worse than not
having them, since a dashboard showing fabricated metrics erodes trust the
moment someone checks Google Search Console directly and sees different
numbers. The free/automatable pieces are now built; the paid pieces are
still deliberately deferred.

| Feature | Status | What it actually requires |
|---|---|---|
| Core Web Vitals | **Built** — `app/seo/pagespeed.py`, `POST/GET /api/seo/admin/performance*` | Google PageSpeed Insights API v5. Free, unauthenticated at a lower rate limit; set `PAGESPEED_API_KEY` in `.env.production` to raise it. Every score/metric returned is a real Lighthouse run against the live URL — nothing estimated. Admin triggers a check per path from `/api/docs` today (no dashboard button yet); results persist in `seo_performance_snapshots` and are viewable/filterable at `/admin`. |
| Blog | **Built** — `BlogPost` model, admin CRUD, `app/ssr/` pages at `/blog` and `/blog/:slug` | Admin-authored only. No AI drafting was built — that needs an LLM API key (Claude/GPT) the user hasn't provided, plus a review step before publish. Posts are created/edited at `/admin` (SQLAdmin) or via `/api/seo/admin/blog`; publishing sets `Article` + `BreadcrumbList` JSON-LD and adds the post to `/sitemap.xml` automatically. |
| Organic traffic / Search Console data | **Code built, not yet connected** — `app/seo/search_console.py`, `/api/seo/admin/gsc/*` | Google Search Console API — free, but needs two one-time manual steps outside this codebase (see below) before any real data flows. Until then `/gsc/status` reports `connected: false` and `/gsc/report` returns 409 — never fabricated numbers. |
| Keyword rank tracking | Not built | A paid SERP API (e.g. DataForSEO, SerpApi, Zenserp) — Google has no free API for "what position does my page rank at for X keyword." Budget: typically $0.001–0.01 per keyword check; daily tracking of 100 keywords ≈ $3–30/month depending on provider. Needs a provider + API key from the user before it's worth building. |
| Backlinks / Domain Authority | Not built | Proprietary crawl indexes owned by Ahrefs, Semrush, or Moz. No free or self-hostable equivalent — this data literally does not exist anywhere except behind those companies' paid APIs (Moz's is the cheapest starting point, ~$99+/month for API access). |
| Competitor analysis (Vistaprint, Zola, WeddingWire, Etsy, Canva) | Not built | Same backlink/traffic-estimate data sources as above, applied to a domain you don't control. Same cost floor. |

### Google Search Console — manual steps required before it shows real data

The OAuth plumbing, token storage, and Search Analytics query code are all
done and tested. Three things only the account owner can do are still
outstanding:

1. Verify `https://planazo.in/` in [Google Search
   Console](https://search.google.com/search-console) under the Google
   account that should own this data.
2. In Google Cloud Console, on the existing OAuth client (same one used
   for "Sign in with Google"), add
   `https://planazo.in/api/seo/admin/gsc/callback` as an **Authorized
   redirect URI**.
3. While logged in as an admin, call `GET /api/seo/admin/gsc/connect`
   (via `/api/docs` or curl with a Bearer token — there's no frontend
   button yet) and visit the returned `authorization_url` to complete
   Google's consent screen. This stores a refresh token; after that,
   `GET /api/seo/admin/gsc/report?start_date=...&end_date=...` returns
   real query/click/impression/position data.

### Remaining build order for Part 2

1. ~~Google Search Console integration (free)~~ — code done, awaiting the
   three manual steps above.
2. ~~Core Web Vitals via PageSpeed Insights API (free)~~ — done.
3. ~~Blog model~~ — done (admin-authored). AI drafting is a separate,
   still-unbuilt step once an LLM key is provided.
4. **Rank tracking** (paid, ~$3–30/month depending on keyword volume) —
   once there's a provider + API key.
5. **Backlinks / competitor analysis / domain authority** (paid,
   $99+/month) — last, since it's the most expensive and the least
   actionable day-to-day (it's monitoring, not something you act on
   weekly).

## Verification

Backend: `pytest tests/test_seo.py tests/test_ssr.py tests/test_seo_part2.py`
— 29 + 13 + 10 = 52 tests, all passing (PageSpeed Insights and Search
Console's real Google HTTP calls are mocked at the `httpx` client boundary
so the parsing/plumbing code runs for real without network access).
`Base.metadata` mapper configuration verified with `seo_performance_snapshots`,
`blog_posts`, and `seo_search_console_token` included. Migration `0006`
creates all three tables. Frontend: `Seo.jsx` uses React 19's native
`<title>`/`<meta>`/`<link>` head-hoisting (already the installed React
version — no new dependency added).
