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
```

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
  `BirthdayPage` rows. Deliberately does **not** include vendor or product
  pages yet (see below) — a sitemap entry that 404s is worse than not
  listing it.
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

### What's built but not wired in yet

`build_vendor_meta()` and `build_product_meta()` in `app/seo/generator.py`
are fully implemented (LocalBusiness / Product JSON-LD, title/description
generation from real vendor & product fields) but not called from any
router — **because there is no public vendor-profile or product-detail page
in the frontend yet** (`VendorWebsite` and `GiftProduct` both have working
public backend endpoints — `GET /api/vendors/{slug}/`,
`GET /api/gifts/products/{slug}/` — but nothing in `frontend/src/pages`
renders them). Wiring these in is a two-line change per router once those
pages exist, following the exact pattern already used in
`app/routers/invitations.py` / `app/routers/birthday.py`.

### Explicitly out of scope for "SEO plugin," in scope for actual page-building

Building the vendor-profile and product-detail frontend pages themselves is
frontend feature work, not an SEO task — but it's the actual blocker for
Planazo's vendor marketplace being indexable at all. Worth prioritizing
independent of anything else in this document.

## Part 2 — What a full Semrush/Ahrefs-style system needs (and why it's phased separately)

The original spec asked for rank tracking, competitor analysis, backlink
monitoring, domain authority, and Core Web Vitals reporting. These are
real, valuable features — but unlike everything in Part 1, **they can't be
honestly built from data Planazo already has**. Faking them (hardcoded
numbers, a "Domain Authority: 42" that isn't backed by a real crawl) would
be worse than not having them, since a merchant/vendor dashboard showing
fabricated metrics erodes trust the moment someone checks Google Search
Console directly and sees different numbers.

| Feature | What it actually requires |
|---|---|
| Keyword rank tracking | A paid SERP API (e.g. DataForSEO, SerpApi, Zenserp) — Google has no free API for "what position does my page rank at for X keyword." Budget: typically $0.001–0.01 per keyword check; daily tracking of 100 keywords ≈ $3–30/month depending on provider. |
| Organic traffic / Search Console data | Google Search Console API — free, but requires the domain to be verified in GSC and the integration to request read access via OAuth. This one's genuinely free and should be the first Part 2 item built. |
| Core Web Vitals | Google PageSpeed Insights API / CrUX API — free, rate-limited. Also genuinely buildable without a paid subscription. |
| Backlinks / Domain Authority | Proprietary crawl indexes owned by Ahrefs, Semrush, or Moz. There is no free or self-hostable equivalent — this data literally does not exist anywhere except behind those companies' paid APIs (Moz's is the cheapest starting point, ~$99+/month for API access). |
| Competitor analysis (Vistaprint, Zola, WeddingWire, Etsy, Canva) | Same backlink/traffic-estimate data sources as above, applied to a domain you don't control. Same cost floor. |
| AI content assistant (blog outlines, full articles) | An LLM API call (Claude/GPT) plus a review workflow — genuinely buildable today with no blocker, but there's no blog/article model in the database yet (`app/models/` has none), so this needs a `BlogPost` model + admin editorial workflow before "AI writes it" is useful. |

### Suggested build order for Part 2

1. **Google Search Console integration** (free) — real indexed-page counts,
   real click/impression data, real average position. This alone covers
   "keyword ranking" and "organic traffic" from the original dashboard spec
   honestly.
2. **Core Web Vitals via PageSpeed Insights API** (free) — real performance
   scores per page, refreshed on a schedule.
3. **Blog model + AI drafting workflow** — new `BlogPost` table, admin
   create/edit/publish flow, LLM-assisted first-draft generation with a
   human review step before publish (never auto-publish AI content
   unreviewed).
4. **Rank tracking** (paid, ~$3–30/month depending on keyword volume) — once
   there's an actual budget line for it.
5. **Backlinks / competitor analysis / domain authority** (paid,
   $99+/month) — last, since it's the most expensive and the least
   actionable day-to-day (it's monitoring, not something you act on weekly).

## Verification

Backend: `pytest tests/` passes; `app/seo/*.py` syntax-checked;
`Base.metadata` mapper configuration verified with the new tables included.
Frontend: `Seo.jsx` uses React 19's native `<title>`/`<meta>`/`<link>`
head-hoisting (already the installed React version — no new dependency
added).
