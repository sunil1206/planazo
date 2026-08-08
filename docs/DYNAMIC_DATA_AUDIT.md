# Planazo Frontend — Dynamic Data Audit

Scope: `frontend/src` (React SPA). Goal: inventory everything that is currently
hardcoded in the frontend vs. already API-driven, as input to a future "make
all business/content data backend-driven" effort. Read-only audit — no
application code was changed.

---

## 1. Architecture overview

**Stack** (`frontend/package.json`):
- React 19.2 + `react-dom` 19.2, built with **Vite 8** (`@vitejs/plugin-react`).
- **Not TypeScript.** Despite `@types/react`/`@types/react-dom` in
  `devDependencies`, there is no `tsconfig.json`, no `.ts`/`.tsx` file
  anywhere under `frontend/src`, and `eslint.config.js` only lints
  `**/*.{js,jsx}`. The `@types/*` packages exist purely so editors can
  type-check JS via inference — this is a plain JavaScript + JSX codebase.
- **Routing**: `react-router-dom` v7 (`BrowserRouter`/`Routes`/`Route`),
  wired in `frontend/src/App.jsx`. Two top-level route trees: public routes
  (Landing, RoleSelect, Login, public invitation/birthday sites) and
  `ProtectedRoute`-gated routes (Home, editors, Planning Suite).
- **State management**: no Redux/Zustand/MobX. Two React Context providers:
  - `frontend/src/context/AuthContext.jsx` — session/user, backed by
    `localStorage` (`planazo_user`) + JWT access/refresh tokens
    (`frontend/src/lib/tokenStorage.js`).
  - `frontend/src/context/PlanningEventContext.jsx` — "which event is
    Planning Suite currently managing," backed by `sessionStorage`.
  Everything else is local `useState`/`useEffect` per page.
- **API layer**: `axios` (not `fetch`), centralized in
  `frontend/src/lib/api.js` — one configured instance with a request
  interceptor (attaches bearer token) and a response interceptor
  (single-flight refresh-token retry on 401, dispatches
  `planazo:auth-expired` on refresh failure). Domain-specific modules wrap
  it: `lib/eventsApi.js` (weddings/birthdays), `lib/customEventsApi.js`,
  `lib/planningApi.js`. This is a clean, consistent services-layer pattern —
  no component calls `axios`/`fetch` directly.
- **Styling**: Tailwind v4 (`@tailwindcss/vite`) plus a lot of inline
  `style={{}}` objects for gradients/animations that Tailwind utility
  classes can't express cleanly. This is presentation/technical, not content.
- **Build/tooling**: `npm run dev|build|lint|preview`; ESLint 10 flat config
  with `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. No test
  runner configured (no Vitest/Jest in `package.json`, no test files found).

**No admin frontend exists.** `App.jsx` defines every route in the app —
there is no `/admin` path, no admin layout component, no CRUD screens for
users/events/vendors/orders/pages/navigation/homepage/media/SEO/settings/
analytics/monitoring/logs. Anything like that would be built from scratch.

---

## 2. Hardcoded business-content inventory

### 2a. Marketing / homepage content — `frontend/src/pages/Landing.jsx`

This is the single largest concentration of hardcoded business content in
the app — an entire marketing homepage baked into JSX/JS.

| Snippet | What it hardcodes | Verdict |
|---|---|---|
| `SERVICES` array (lines 36-41): `{ title: 'Wedding Planning', desc: 'Manage every detail...' }` ×4 | "Everything you need" feature-tile copy (titles + descriptions + colors) | **Should become API-driven** — this is homepage marketing content, exactly the kind of thing the project wants centrally managed |
| `VENDORS` array (lines 43-50): `{ label: 'Photographers' }, { label: 'Venues' }...` | Vendor-category showcase tiles | **Should become API-driven** — should reflect real vendor categories from the backend, not a static list that can drift from actual data |
| `GIFT_FEATURES` array (lines 52-57): `'Curated gifts from verified sellers'`, etc. | Gifts section bullet copy | **Should become API-driven** |
| Hero copy (lines 220-249): `"India's AI-Powered Wedding Platform"`, `"Plan Your Perfect Wedding Journey"`, the subhead paragraph | Homepage hero marketing copy | **Should become API-driven** |
| Stats block (lines 275-280): `{ val: '1,240+', label: 'Couples Served' }, { val: '87+', label: 'Verified Vendors' }, { val: '42K+', label: 'AI Photos Shared' }` | **Fabricated/static trust-metric numbers** — not fetched from any real counter | **Should become API-driven** — and flagged as a correctness issue: these look like real live stats to a visitor but are frozen constants that will never update and may already be inaccurate |
| "Services", "Vendors", "Gifts" section headings/body copy throughout (lines ~300-520) | All section headings, taglines, and body paragraphs | **Should become API-driven** — this is the classic "homepage sections" the brief calls out |
| Photo-count badge "42K+ photos" (line 666) inside the decorative AI gallery mockup | Another instance of the fabricated stat | **Should become API-driven** (or removed if purely decorative) |
| Footer (lines 734-747): `"© 2026 Planazo · Made with ♥ in Kerala, India"`, nav links (Sign In / Vendors / Gifts) | Footer copyright text + footer nav | **Should become API-driven** — footer content/social links/contact info is explicitly called out in the brief |
| Nav items "Vendors" / "Gifts" (desktop nav lines 174-182, mobile nav lines 205-212) | Top navbar menu items | **Should become API-driven** — hardcoded navigation menu, not derived from any route/content config |

### 2b. Role/event-type pickers

| File | Snippet | What it hardcodes | Verdict |
|---|---|---|---|
| `pages/RoleSelect.jsx` (lines 6-47) | `ROLES` array: User / Vendor / Gift Seller, each with `desc`, `tags` (e.g. `['Digital Invitations', 'Photo Gallery']`), colors | Onboarding role copy — descriptions and feature-tag marketing blurbs per role | **Should become API-driven** for the copy/tags (business-facing marketing text); the `value`/route mapping is a technical constant tied to backend `role` enum and can stay |
| `pages/Login.jsx` (lines 114-118, 120-124) | `USER_TYPES` (label/desc per role), `ROLE_CHIP` (emoji/label/colors per role) | Same account-type copy, duplicated a second time | **Should become API-driven** — also flagged as a duplication risk: this list must be kept in sync with `RoleSelect.jsx`'s `ROLES` and `AuthContext.jsx`'s `USER_TYPE_LABEL` by hand today (three separate hardcoded copies of the same three role names) |
| `pages/CreateEvent.jsx` (lines 5-58) | `EVENT_TYPES`: Wedding / Birthday / Custom Events / Gallery & AI, each with `desc`, `tags` (`['Invitations','Guest List','Vendors']`) | "What are you planning?" picker copy | **Should become API-driven** for descriptions/tags; the four `route` values are tied 1:1 to real React Router routes and are a legitimate technical constant |

### 2c. Navigation — `frontend/src/components/Sidebar.jsx`

| Snippet | What it hardcodes | Verdict |
|---|---|---|
| `NAV_GROUPS` (lines 54-88): "My Events" / "Planning Suite" / "Gifts & Shop" groups, each with child items and labels | The entire authenticated-app left-nav menu | **Should become API-driven** — this is the exact "hardcoded navigation items" case called out in the brief. A comment above it (lines 47-53) already documents that some items are deliberately left off because they have no working backend — a sign the nav and backend capability are already drifting apart and would benefit from being served together |
| `BOTTOM_NAV` (lines 90-94): "Seller Dashboard", "Vendor Hub", "Upgrade Plan" | Bottom nav items | **Correctness issue, not just hardcoding**: none of these three have a `route` — clicking them just closes the mobile nav drawer (`onClick={() => onNavigate?.()}`) and goes nowhere. These are non-functional placeholder links shipped in the sidebar today |
| Fallback user (line 247): `const user = authUser ?? { name: 'Sunil Ma', email: 'sunilma94@gmail.com' }` | **A hardcoded fake person's name and email**, shown in the sidebar user card whenever `authUser` is null (e.g. before auth resolves) | **Should be removed / replaced with a proper loading/skeleton state**, not just "become API-driven" — showing a stranger's fabricated name and email as a fallback is a real UX bug, not a content-modeling choice |

### 2d. Wedding/Birthday theme catalogs

| File | Snippet | What it hardcodes | Verdict |
|---|---|---|---|
| `pages/Weddings.jsx` `THEMES` (6 themes), `pages/BirthdayEditor.jsx`/`Birthdays.jsx` `THEMES` (5 themes), `pages/InvitationEditor.jsx` `THEME_PALETTE`, `pages/InvitationSite.jsx` `SITE_THEMES`, `pages/BirthdaySite.jsx` `BDAY_SITE_THEMES` | Full design-system definitions per theme: id, emoji, display name, description, CSS gradients, accent colors, photo filters, taglines (`'A Royal Union'`, `'A Sacred Union'`, etc.) | **Gray area, lean "fine as technical constant" today, but worth flagging**: these are CSS/rendering configuration (colors, gradients, `filter` strings) that the frontend must interpret regardless of source, so they can't move to the backend without the frontend still hardcoding *how* to render each theme id. However, the theme *names* and *taglines* are product/business decisions (which themes exist, how they're marketed) that a business team may want to change without a frontend deploy — if the goal becomes "add a new theme without shipping code," this whole catalog (5 near-identical definitions, redundant across 5 files) would need to move server-side. Flagging the duplication regardless of the API decision: the same theme ids/colors are defined independently in 5 different files and must be kept in sync by hand |

### 2e. Demo/fallback content

| File | Snippet | What it hardcodes | Verdict |
|---|---|---|---|
| `pages/InvitationSite.jsx` `DEMO` (lines 38-65) | A full fake wedding: `'Priya & Arjun'`, bios, Instagram handles, 4 fabricated events, 4 fabricated story moments | Fallback shown when `weddingApi.get(id)` fails | **Fine as a technical/demo fallback** for an unknown or errored slug, but it silently masquerades as real content (no "demo" banner) — worth a UX note even if not urgent for the API-migration effort |
| `pages/BirthdaySite.jsx` `DEMO` (lines 37-63) | Same pattern — fake birthday person "Rohan", bio, events, memories | Same as above | Same verdict |
| Floating nav section labels `['The Couple','Our Story','Events','RSVP','Gallery','Guestbook']` (`InvitationSite.jsx` ~line 791) | In-page anchor nav labels | **Fine as technical constant** — tied 1:1 to fixed page sections that are part of the site-builder's structure, not variable business content |

### 2f. Custom Events / Planning Suite constants

| File | Snippet | What it hardcodes | Verdict |
|---|---|---|---|
| `lib/customEventsApi.js` `EVENT_TYPES` (26 suggested types: `'Travel', 'Vacation', 'Festival'...`) | Suggested values for a free-text "event type" field | **Fine as technical constant** — the comment explicitly says the field is free text and this is just a suggestion list, not an enforced taxonomy; low priority to move server-side, though it's exactly the kind of picklist a future admin "categories" screen would want to manage |
| `lib/customEventsApi.js` `STATUSES`, `VISIBILITIES`; `lib/planningApi.js` `EVENT_TYPES`, `CHECKLIST_STATUSES`, `CHECKLIST_PRIORITIES`, `RSVP_STATUSES`, `VENDOR_BOOKING_STATUSES` | Enum values that mirror backend model choices (e.g. Django/DRF `choices=`) | **Fine as technical constant** — these must match backend enum values exactly; hardcoding them here is normal (many apps do fetch `OPTIONS`-derived choices instead, but that's a larger architectural choice, not a content problem) |
| `pages/CustomEvents.jsx` `THEME_COLORS` (8 hex swatches) | Color picker swatches for event branding | **Fine as technical constant** — a UI color palette, not business content |

### 2g. index.html static SEO baseline

| Snippet | What it hardcodes | Verdict |
|---|---|---|
| `frontend/index.html` `<title>`, meta description, OG tags, and two JSON-LD blocks (`Organization`, `WebSite`) with `"name":"Planazo"`, `"url":"https://planazo.in"` | Static homepage title/description/site identity schema | **Fine as fallback, but the copy itself should ultimately be API-driven** — the file's own comment explains this is intentionally a baseline that `<Seo>` overrides per-route via React 19's native title/meta hoisting, so the *mechanism* is sound. The literal marketing copy ("Planazo is an all-in-one platform for wedding invitations...") is still hardcoded business copy and should come from the same source of truth as the rest of the homepage content once that's centralized |

---

## 3. What's already dynamic / API-driven today (don't rebuild this)

This app is **not** a mostly-static site with a thin API veneer — most
*functional* screens are properly wired:

- **Auth** (`context/AuthContext.jsx`) — real `/api/auth/login`,
  `/api/auth/register`, `/api/auth/google`, `/api/auth/token/refresh`
  endpoints, JWT stored via `lib/tokenStorage.js`, automatic refresh-and-retry
  on 401 in `lib/api.js`.
- **Weddings** (`pages/Weddings.jsx`, `pages/InvitationEditor.jsx`,
  `pages/InvitationSite.jsx`) and **Birthdays** (`pages/Birthdays.jsx`,
  `pages/BirthdayEditor.jsx`, `pages/BirthdaySite.jsx`) — full CRUD against
  real backend resources via `lib/eventsApi.js` (`weddingApi`/`birthdayApi`):
  create/update/delete/publish, events, stories, countdown, vendors, photos,
  RSVPs, wishes, visit tracking, and per-page SEO settings. This is a solid
  reference pattern for what "properly API-driven" looks like in this
  codebase.
- **Custom Events** (`pages/CustomEvents.jsx`, `pages/CustomEventDashboard.jsx`)
  — full CRUD plus checklist/budget/notes/gallery/files/members sub-resources,
  all via `lib/customEventsApi.js`.
- **Planning Suite** (`pages/planning/*.jsx`) — dashboard, checklist, budget,
  guests, vendor bookings, and vendor search all via `lib/planningApi.js`,
  reading from a real unified `/api/events/` listing endpoint.
- **File/image uploads** (`lib/eventsApi.js` `uploadImage`/`uploadIfLocal`) —
  real S3/R2 presign flow in production with a local-upload fallback in dev;
  not a mock.
- **Vendor search/booking** — real `/api/vendors/search/`,
  `/api/vendors/` endpoints, not a static list.
- **SEO per-page** — `components/Seo.jsx` renders title/description/OG/
  Twitter/canonical/JSON-LD straight from a `seo` object the backend
  computes and returns (`app/seo/generator.py` per the code comment), and
  `components/SeoAnalysisPanel.jsx` + `lib/seoAnalysis.js` provide a
  Yoast-style live SEO/readability checklist that reads/writes real
  `seo-settings` endpoints (`getSeoSettings`/`updateSeoSettings` in
  `lib/eventsApi.js`). This is a genuinely well-built, non-trivial feature —
  nothing here needs rebuilding.
- **Payment/subscription** — `pages/Home.jsx` fetches
  `/api/payment/subscription/` for the membership stat tile rather than
  hardcoding a plan name.

---

## 4. Gap: `pages/Gallery.jsx` is entirely mocked, not backend-driven

This deserves separate, prominent mention because it contradicts the
otherwise-solid API integration elsewhere and is easy to miss if only
grepping for hardcoded arrays.

`frontend/src/pages/Gallery.jsx` does **not** call `weddingApi`/`birthdayApi`
or any real gallery endpoint at all:

- `getWeddings()`/`getBirthdays()` (lines 7-8) read event lists straight out
  of `localStorage` (`planazo_invitations`, `planazo_birthdays`) — a
  leftover from an earlier mock-API era, now out of sync with the real
  backend-driven lists used by `Weddings.jsx`/`Birthdays.jsx`.
- `apiUploadPhoto`, `apiDeletePhoto`, `apiFindByFace` (lines 44-65) are
  literally commented `// TODO: POST ${API_BASE}/gallery/...` /
  `// TODO: DELETE ...` — each just `await new Promise(r => setTimeout(r, ...))`
  and returns a fake success or, for face-matching, **`Math.random()`-selects
  half the photos as "AI matches"** (line 63: `meta.filter(() => Math.random() > 0.4)`).
- Photo binary data is stored as base64 data URLs directly in `localStorage`
  (`photoKey`/`getPhotoData`), not uploaded anywhere.

This is not a hardcoded-content issue in the audit's literal sense, but it
is the single biggest "not actually backend-driven" gap in the app, and
should be prioritized alongside the content work — a user's photos and AI
match results on this page currently never leave their browser and reset
per-device. (`InvitationSite.jsx`'s and `BirthdaySite.jsx`'s own in-page
"AI Selfie Match" widgets have the same `Math.random()`-based fake matching,
see `SelfieMatchSection`/`BdaySelfieMatch` — same caveat applies there, scoped
to the public site's own gallery instead of the dashboard's.)

---

## 5. Admin frontend surface

**There is none.** Confirmed by:
- `App.jsx` — every route is enumerated there; no `/admin/*` prefix.
- No admin layout/shell component anywhere under `frontend/src/components`
  or `frontend/src/pages`.
- No screens for: user management, vendor/order management, page/content
  management, navigation management, homepage-section management, media
  library, SEO management (beyond the per-page `SeoAnalysisPanel` end-users
  already have), site settings, analytics dashboards, monitoring, or logs.

Everything the brief lists as needed for a full `/admin` dashboard (users,
events, products, vendors, orders, pages, navigation, homepage, media, seo,
settings, analytics, monitoring, logs) would be **new build**, not
retrofit. The one thing that *can* be reused: `components/Select.jsx` (a
themed, portal-based dropdown) and the general `glass-card`/`glass-input`
Tailwind style vocabulary already used everywhere — an admin UI could adopt
the same visual language cheaply, but there is no CRUD scaffolding,
table/grid component, form-builder, or pagination component to reuse today
(pagination in `core/pagination.py` is backend-only per the root
`CLAUDE.md`; nothing corresponding exists in the frontend).

---

## 6. SEO / meta-tag handling — what exists and the gaps

**What exists (and is solid):**
- `components/Seo.jsx` — per-page `<title>`/meta description/robots/
  canonical/Open Graph/Twitter card/JSON-LD, using **React 19's native
  `<title>`/`<meta>`/`<link>` hoisting** (no `react-helmet` dependency; the
  component's own header comment explains this choice and links the React
  docs). Confirmed no `react-helmet` anywhere in `package.json` or `src/`.
  Used today on `InvitationSite.jsx` and `BirthdaySite.jsx`, fed from the
  backend's computed `seo` object.
- `components/SeoAnalysisPanel.jsx` + `lib/seoAnalysis.js` — a full client-side
  Yoast/RankMath-style SEO+readability checklist (title/meta length,
  keyword density, Flesch reading ease, etc.) with a Google-snippet preview,
  wired to real `seo-settings` GET/PUT endpoints per page. The analysis
  logic runs client-side by design (documented as an intentional,
  synced duplicate of `app/seo/analysis.py`'s rules, to avoid a network
  round-trip on every keystroke) — not a gap, a deliberate tradeoff.
- `index.html` — static baseline title/description/OG/JSON-LD
  (`Organization`, `WebSite` schema) for the document shell and any route
  that doesn't render its own `<Seo>`; de-duplicated by React 19 when a page
  does override it.

**Gaps:**
- **No SSR/prerendering on the frontend side.** This is a pure client-rendered
  Vite SPA (`index.html` → `#root` → `main.jsx`). The task description
  mentions an `app/ssr/` on the backend — nothing in `frontend/src` consumes
  or coordinates with it (no hydration entry point, no `data-*` SSR markers,
  no conditional client/server render path). If that backend SSR path is
  meant to pre-render these same routes, the frontend currently has no
  wiring to it at all; this would need to be designed, not just found.
- **SEO tooling only covers Wedding/Birthday public pages.** No `<Seo>` usage
  found on `Landing.jsx` (relies solely on `index.html`'s static tags) or on
  `CustomEvents`/`CustomEventDashboard` public-facing surfaces (custom
  events don't appear to have a public site route at all — only
  `/custom-events/:id` behind `ProtectedRoute`, unlike weddings/birthdays
  which have separate public `/invite/:id` and `/birthday/:id` routes).
- **No sitemap/robots.txt generation visible in the frontend** (out of scope
  for a SPA, but worth noting if the backend's SSR/SEO app is expected to
  own it — nothing here integrates with it).

---

## Summary of verdicts (quick reference)

**Should become API-driven** (business/marketing content):
Landing page hero/services/vendors/gifts copy, homepage trust-stat numbers,
footer copy/links, top nav items, RoleSelect/Login/CreateEvent role & event
descriptions and feature tags, Sidebar `NAV_GROUPS` menu.

**Bugs to fix regardless of the API question:**
Sidebar's hardcoded fake fallback user (`'Sunil Ma'` / `sunilma94@gmail.com`),
Sidebar `BOTTOM_NAV` dead links (Seller Dashboard / Vendor Hub / Upgrade
Plan go nowhere), `Gallery.jsx`'s entirely mock localStorage-based backend
(events list, uploads, delete, and `Math.random()` "AI" face matching), and
the same random-match mock inside `InvitationSite.jsx`/`BirthdaySite.jsx`'s
selfie-match widgets.

**Fine as technical constants:** theme/color palettes (though duplicated
5× and worth consolidating regardless), status/visibility/priority enums
that mirror backend model choices, event-type route mappings, UI color
swatches, in-page anchor-nav labels, demo/fallback content for unknown
slugs (functionally fine, cosmetically should be labeled as a demo).
