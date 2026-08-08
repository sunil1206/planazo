# Planazo Architecture Audit

Read-only audit of the FastAPI backend at `D:\startup\planazo\planazo-v3\planazo`, done ahead of
turning Planazo into a fully dynamic, database-driven, admin-controlled platform (CMS +
marketplace + event platform). This document is the **backend** section only — a frontend
section will be merged in separately by another pass.

A prior audit already exists at the repo root, `BACKEND_AUDIT.md` (dated ~Jul 30). Several of its
findings have since been fixed in the current code (Celery tasks are now called via `.delay()`
from `invitations.py`/`vendors.py`/`gallery.py`; the three Razorpay signature checks now all use
`hmac.compare_digest`; a global exception handler, structured logging, and rate limiting now
exist). This document reflects the **current** state as read directly from the code, not that
older report.

---

## Backend Architecture

### 1. Structure of `app/`

```
app/
  main.py            App factory: FastAPI instance, all middleware, all router registration,
                      SQLAdmin wiring, Prometheus, /health. ~200 lines, single create_app().
  admin/              SQLAdmin panels — main.py (auth backend + 3 Admin instances), views.py
                      (ModelView registrations for most models).
  api/                Empty skeleton. app/api/__init__.py and app/api/v1/__init__.py contain
                      nothing else — no routers, no versioning logic lives here today.
  routers/            15 route modules, all mounted directly on the app in main.py. Every
                      router declares its own `APIRouter(prefix="/api/...")` — see §3.
  models/             9 SQLAlchemy model modules (birthday, custom_event, gallery, gift,
                      invitation, payment, permissions, planning, user, vendor) + app/seo/models.py
                      as a 10th, de facto domain. 67 declared tables total (see DATABASE_CHANGES.md).
  schemas/            Pydantic request/response models, one file per router-ish domain.
  repositories/        BaseRepository (generic async CRUD scoped by event_type/event_id) +
                      EventRepository + PlanningRepository. Only the Planning Suite
                      (checklist/budget/guests/vendor bookings) uses this pattern — every other
                      router talks to SQLAlchemy directly via `db.execute(select(...))`.
  services/           event_service.py, planning_service.py, vendor_search_service.py. Same
                      story as repositories/ — only the Planning Suite and vendor search go
                      through a service layer; the older routers (auth, gallery, gifts, vendors,
                      invitations, birthday, payment) have business logic written inline in the
                      route handler functions.
  dependencies/       planning_deps.py — resolves/validates the Planning Suite's polymorphic
                      (event_type, event_id) reference against the real owning table on every
                      request.
  middleware/         error_handling.py only — register_error_handlers(app), see §6. No
                      request-ID middleware, no custom logging middleware.
  core/               config.py (Settings, see §"Config surface"), security.py (JWT + password
                      hashing), dependencies.py (get_current_user / require_role), rate_limit.py
                      (shared slowapi Limiter).
  database/           base.py — async engine, AsyncSessionLocal, declarative Base, get_db().
  seo/                A substantial, mostly self-contained module: models.py, router.py (552
                      lines), generator.py (547 lines, meta-tag generation), analysis.py,
                      sitemap.py, robots.py, redirects.py, slugs.py, pagespeed.py,
                      search_console.py. Already implements a polymorphic
                      override-by-URL-path pattern (see §"Existing precedent" below) plus its own
                      `/api/seo/admin/*` namespace.
  ssr/                Server-rendered HTML landing pages for SEO
                      (`/vendors/{category}[/{city}[/{slug}]]`, `/blog`, `/blog/{slug}`), backed
                      by app/ssr/templates/. Not in the original inspection list but real and
                      wired into main.py.
  workers/             celery_app.py + workers/tasks/{email_tasks,image_tasks}.py. Tasks are
                      genuinely invoked from routers now (grep for `.delay(` hits
                      invitations.py, vendors.py, gallery.py, plus the task files themselves).
  utils/               validators.py (the ValidationError class caught by the middleware),
                      image.py (upload validation constants).
  alembic/             7 migrations, versions/0001–0006 (see §10).
```

Two directories from an apparently intended layered structure — `app/api/` and, largely,
`app/repositories/` / `app/services/` — are either empty or only partially adopted. The pattern
they establish (Planning Suite: router → service → repository → model) is the right shape to
generalize, but today it covers 1 of 15 route modules.

### 2. Domain models present today

All models live under `app/models/` except SEO, which is a sibling package (`app/seo/models.py`)
that behaves like an 11th domain module.

| Module | Tables | What it represents |
|---|---|---|
| `user.py` | `account_user` | The one user table for the whole platform. Flat `role` string column (`USER` / `VENDOR` / `ADMIN` in the registration enum, plus a de facto `PHOTOGRAPHER` role used elsewhere — see §5). No separate `is_admin`-style property; the DB migrated off Django (`token_version`, PBKDF2→bcrypt rehashing in `core/security.py` all exist for that reason). |
| `invitation.py` | `couple_websites`, `bride_groom`, `stories`, `events`, `wedding_countdown`, `invitation_rsvps`, `wishes`, `page_visits`, `wedding_gallery_photos`, `wedding_vendors` | The wedding-website product: one `CoupleWebsite` per couple, with timeline/story/countdown/RSVP/guest-gallery/vendor-booking children. |
| `birthday.py` | `birthday_birthdaypage`, `birthday_birthdayevent`, `birthday_birthdaystory`, `birthday_birthdaywish`, `birthday_birthdayrsvp`, `birthday_birthdaycountdown` | A near-duplicate of the wedding-website shape, retargeted at birthdays. Django-style table names (no `db_table` override, per a code comment). |
| `custom_event.py` | `custom_events` + 6 children (checklist/budget/notes/gallery/files/members) | A deliberately lighter-weight generic event planner (travel, festivals, meetups, etc.) — explicitly documented as simpler than the wedding module, all children cascade-delete with the parent. |
| `planning.py` | `planning_checklist_items`, `planning_budget_items`, `planning_guests`, `planning_vendor_bookings` | A **separate, cross-cutting** "Planning Suite" that is NOT tied to any single event table. Each row carries a polymorphic `(event_type, event_id)` pair (`"wedding" | "birthday" | "custom"`), re-validated against the real owning table on every request by `app/dependencies/planning_deps.py`. This coexists with, and is distinct from, `custom_event.py`'s own embedded checklist/budget tables — the module docstring calls this out explicitly. |
| `vendor.py` | `vendor_categories`, `vendor_theme_presets`, `vendor_websites`, `vendor_portfolio_categories`, `vendor_packages`, `vendor_portfolio`, `vendor_enquiries`, `vendor_reviews`, `vendor_subscription_plans`, `vendor_subscriptions`, `vendor_favorites` | Vendor marketplace: profile, category taxonomy (DB-backed, admin-editable — see §11), packages/pricing, portfolio, enquiries, reviews, and vendor-side subscription plans/billing. |
| `gift.py` | `gift_sellers`, `gift_categories`, `gift_products` + images/variants/reviews, `gift_carts`/`gift_cart_items`, `gift_orders`, `gift_marketplace_orders`/`items`, `gift_scheduled_deliveries` | A full gift/marketplace product catalog + cart + two distinct order flows (single-product `GiftOrder` tied to a wedding site, and a general `MarketplaceOrder` with line items) + scheduled/postcard delivery. |
| `gallery.py` | `gallery_categories`, `gallery_albums`, `gallery_images`, `gallery_media_likes`, `gallery_media_comments`, `guest_selfie_matches` | Media for events: albums, rich per-image metadata (AI tags/quality/duplicate flags, multiple thumbnail sizes, privacy level), likes/comments, and a selfie-matching feature (face embeddings, many-to-many with matched images). |
| `permissions.py` | `event_permissions`, `photographer_profiles`, `photographer_assignments` | A **per-event** RBAC layer — see §5, this is the platform's most granular permission system today, but it's scoped to individual events, not the platform as a whole. |
| `payment.py` | `subscriptions`, `transactions` | The **user-facing** (not vendor) subscription + payment ledger — `UserSubscription.plan` is a bare string (`FREE`/`BASIC`/`PRO`/`PREMIUM`), no FK to a plan table (contrast with `vendor.py`'s `SubscriptionPlan`/`VendorSubscription`, which do have a real plan table — see §11's pricing finding). |
| `seo/models.py` | `seo_meta_overrides`, `seo_robots_rules`, `seo_redirects`, `seo_performance_snapshots`, `blog_posts`, `seo_search_console_token` | Already-built SEO infrastructure — see "Existing precedent" below. |

**67 tables total** are declared across these modules (`grep __tablename__` count).

### 3. API routing structure today vs. target `/api/v1/public|auth|admin`

**No version prefix exists anywhere.** Every router declares its own flat prefix directly under
`/api/...`:

```
/api/auth        /api/birthday       /api/custom-events   /api/gallery
/api/gallery/v2  /api/gifts          /api/gifts/seller     /api/invitations
/api/payment     /api/permissions    /api/photographer     /api/planning (mounted at /api)
/api/webhooks    /api/storage        /api/vendors
/api/seo/*  (own package, not in app/routers/)
```

`gallery_v2.py` is the one place with any versioning gesture at all, and it's a version bump on
one feature (`/api/gallery/v2`), not a platform-wide API version.

There is **no `/api/v1/public`, `/api/v1/auth`, or `/api/v1/admin` split today**, and no
`app/api/v1/` code — that directory is a genuinely empty scaffold (`app/api/__init__.py` and
`app/api/v1/__init__.py` have no other content).

**Closest existing precedent for an admin namespace:** `app/seo/router.py` mounts its
admin-only endpoints under a literal path prefix, `/api/seo/admin/*` (e.g. `GET
/api/seo/admin/overrides`, `POST /api/seo/admin/blog`, `GET /api/seo/admin/gsc/status`), and
gates every one of them with a local `_require_admin(user)` helper (`app/seo/router.py:54-56`):

```python
def _require_admin(user: User) -> None:
    if user.role != "ADMIN" and not user.is_superuser:
        raise HTTPException(403, "Admin access required")
```

This is a hand-rolled, per-router duplicate of the exact check `core/dependencies.py`'s
`require_role("ADMIN")` already provides as a reusable dependency — worth consolidating when
building the real `/api/v1/admin/*` namespace, since right now the admin-check policy exists in
two independently-maintained places doing the same thing slightly differently (one as a
dependency, one as a manually-called function).

Everything else that's "admin" today is the **SQLAdmin UI panels** (see §"Admin UI" below), not a
JSON API namespace — those are HTML admin screens for direct DB editing, not something a future
admin frontend SPA could call as a REST API.

### 4. Auth mechanism

**JWT, stateless, with an opt-in revocation mechanism** — no server-side session table for API
auth (a *separate* cookie-based session exists only for the SQLAdmin panels, via Starlette's
`SessionMiddleware`, unrelated to the JWTs used by the JSON API).

- `app/core/security.py`: `create_access_token` / `create_refresh_token` (HS256, `jose.jwt`),
  15-minute access / 30-day refresh lifetimes (configurable via
  `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` / `JWT_REFRESH_TOKEN_LIFETIME_DAYS`). Payload carries
  `sub` (user id), `role`, `type` (`access`|`refresh`), and `tv` (token_version).
- Password hashing: `passlib` `CryptContext(schemes=["bcrypt", "django_pbkdf2_sha256"])` —
  explicitly built to transparently verify legacy Django PBKDF2 hashes and upgrade them to
  bcrypt on first login (`needs_rehash`), a deliberate migration-compat feature, not incidental
  debt.
- **Revocation**: `User.token_version` (int, bumped on `/api/auth/logout`,
  `/change-password`, `/reset-password`). `get_current_user` (`app/core/dependencies.py:12-36`)
  compares the token's `tv` claim against the user's current `token_version` and 401s on
  mismatch — so logout genuinely invalidates every previously-issued access + refresh token
  immediately, not just client-side.
- Enforcement point: `Depends(get_current_user)` (OAuth2PasswordBearer scheme, `tokenUrl` pointed
  at `/api/auth/login`) is applied **per-endpoint**, not globally via middleware. There is also
  `get_current_user_optional` (swallows the 401, returns `None`) for endpoints that behave
  differently authed vs. anonymous, and `require_role(*roles)` — a dependency factory for
  role-gating a whole endpoint.
- **Consistency**: applied endpoint-by-endpoint across all 15 routers; nothing suggests any
  router forgets it on a route that should be protected (e.g. every mutating endpoint reviewed
  during this audit — vendors, gifts, gallery, invitations, permissions, planning — takes
  `user: User = Depends(get_current_user)`). Public/anonymous endpoints (sitemap.xml, robots.txt,
  SSR vendor landing pages, public gallery/vendor GETs) correctly omit it. This audit did not
  exhaustively check every single endpoint in every router, but found no gaps in the routers
  sampled.
- Google OAuth (`POST /api/auth/google`, `google.oauth2.id_token.verify_oauth2_token`) and
  email OTP (Redis-backed, 5-minute TTL) are both implemented and wired to real endpoints.
  Twilio settings exist in `config.py` (`TWILIO_ACCOUNT_SID` etc.) but are not referenced
  anywhere else — SMS OTP is configured-but-unused.

### 5. RBAC / permissions today

**Two separate, non-overlapping permission systems exist — there is no unified RBAC.**

**(a) Global/platform role** — `User.role` is a bare string column, no roles table, no
permissions table, no join table. `ROLE_CHOICES = {"USER", "VENDOR", "ADMIN"}`
(`app/schemas/user.py:11`) is the only enum enforced at registration time. This is checked
ad hoc:
  - `require_role(*roles)` (`core/dependencies.py:52-58`) — generic dependency, but this audit
    did not find it actually used as `Depends(require_role(...))` anywhere in the routers
    sampled; most role checks are inline `if user.role != "ADMIN"` style checks instead (e.g.
    `app/seo/router.py`'s `_require_admin`, `admin/main.py`'s login check).
  - `User.is_superuser` (boolean) is a second, independent "is this an admin" signal, checked
    *alongside* `role == "ADMIN"` in some places (SQLAdmin auth, SEO admin) — so there are
    effectively two different admin flags that must be kept in sync by hand.
  - **`PHOTOGRAPHER` is a role in practice** (`User.is_photographer` property,
    `PhotographerProfile.user_id`, the whole `photographer.py` router) but is **not** in
    `ROLE_CHOICES`, so no user can actually acquire it through `/api/auth/register` or
    `/api/auth/google` — it can only be set by direct DB/admin-panel edit. This is a live gap,
    not a hypothetical one.
  - No `EDITOR`, `SEO_MANAGER`, `MARKETING_MANAGER`, `SUPPORT`, or granular admin sub-roles exist
    at all today — every admin-gated endpoint treats "ADMIN" as a single undifferentiated
    superuser tier.

**(b) Per-event RBAC** — `app/models/permissions.py`'s `EventPermission` model is genuinely
granular and is the most sophisticated permission system in the codebase:
  - 9 named roles (`OWNER`, `CO_OWNER`, `ORGANIZER`, `PHOTOGRAPHER`, `VIDEOGRAPHER`, `FAMILY`,
    `VENDOR`, `GUEST`, `VIEWER`), each with a `DEFAULTS` dict of 8 capability flags
    (`can_upload`/`can_edit`/`can_delete`/`can_download`/`can_approve`/`can_publish`/`can_share`/
    `can_manage_permissions`).
  - Per-row overrides: any capability can be set NULL (= use role default) or explicitly
    true/false per `(event_type, event_id, user_id)` triple — `EventPermission.effective(cap)`
    resolves override-or-default.
  - Invite-token based grant/accept flow (`app/routers/permissions.py`), full CRUD
    (`list/grant/update/revoke`), self-service "my events" listing.
  - Scoped to `event_type ∈ {WEDDING, BIRTHDAY, CORPORATE, TRIP}` — note `CORPORATE`/`TRIP` are
    declared as valid event types in the router's `VALID_EVENT_TYPES` set but have no
    corresponding owning table yet (only wedding and birthday tables actually exist; `CORPORATE`
    and `TRIP` are forward-declared for event types not yet built).

**Takeaway for the target platform:** the *pattern* needed for `SUPER_ADMIN`/`ADMIN`/`EDITOR`/
`SEO_MANAGER`/`MARKETING_MANAGER`/`SUPPORT` doesn't exist yet at the platform level, but
`EventPermission`'s capability-flag design is a solid model to generalize from — it already
proves out (role defaults + per-assignment overrides + `effective()` resolution) the exact shape
a platform-wide roles/permissions table would need. The global `role` column would need to
become a real `roles`/`user_roles`/`permissions` table structure; see DATABASE_CHANGES.md.

### 6. Error handling

**A consistent JSON envelope exists** — `app/middleware/error_handling.py`,
`register_error_handlers(app)`, called once from `main.py`. Every error path is normalized to:

```json
{"detail": "...", "error": "<short_machine_code>", "path": "<request.url.path>"}
```

Four handlers are registered:
  - `ValidationError` (custom, `app/utils/validators.py`) → 422, `error: "validation_error"`
  - `RequestValidationError` (Pydantic/FastAPI) → 422, same code, `detail` is the raw
    `exc.errors()` list
  - `StarletteHTTPException` → passes through `exc.status_code`, `error: "http_error"`
  - `Exception` (catch-all) → 500, `error: "internal_error"`, logs via `logger.error(...,
    exc_info=exc)`

Worth noting: the catch-all handler has a deliberate, well-documented CORS workaround (module
docstring explains it in detail) — Starlette pulls any handler registered for the base
`Exception` class out to the outermost `ServerErrorMiddleware`, which sits *outside*
`CORSMiddleware`, so a 500 response built there would normally ship with no
`Access-Control-Allow-Origin` header and get reported to the browser as an opaque CORS failure
rather than a 500. `_cors_headers_for()` manually replicates the CORS allowlist decision for that
one path.

**There is no `AurixError`-style domain exception base class** (base exception + subclasses like
`InsufficientFunds`, `WalletNotFound`, etc.). Domain errors today are raised as plain
`fastapi.HTTPException(status_code, detail)` calls inline in route handlers — there's no
equivalent of `app/core/exceptions.py` with a typed hierarchy. If one gets built, it would
naturally live at `app/core/exceptions.py`, with `error_handling.py` gaining one more
`@app.exception_handler` for the new base class, following the same registration pattern already
used for `ValidationError`.

### 7. Logging

**Basic but functional; not structured.** `app/main.py:29-33`:

```python
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("planazo").setLevel(logging.INFO)
```

This is a real fix over a formerly-missing `basicConfig()` call (the inline comment in `main.py`
explicitly documents that every `logging.getLogger(__name__)` call across the codebase was
silently swallowed below WARNING before this line was added). Output is plain-text, not JSON —
no structured/JSON logging, and **no request-ID middleware** (no `X-Request-ID` equivalent
anywhere in `app/middleware/`). Sentry (`sentry_sdk.init(..., environment=settings.ENVIRONMENT)`)
is wired conditionally on `SENTRY_DSN` being set, giving unhandled-exception reporting
independent of the log format.

### 8. Health check endpoints

Exactly one, in `app/main.py:198-200`:

```python
@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok", "version": app.version}
```

This checks **nothing** — no DB ping, no Redis ping, no Celery broker check. (There *is* a
Redis ping at app **startup**, in the `lifespan()` function — but that only runs once at process
boot and logs a warning on failure; it isn't re-exercised by `/health` on each call, so `/health`
can report `"ok"` even if Redis is currently down.) Prometheus metrics are separately exposed at
`/metrics` via `prometheus_fastapi_instrumentator`, which is a different concern (metrics, not
liveness/readiness).

### 9. Test coverage

`tests/` (top-level, `pytest-django` is not in play — this is `pytest` + `pytest-asyncio` +
`httpx.AsyncClient`, config in `pytest.ini`: `asyncio_mode = auto`, `testpaths = tests`).
No `test_*.py` files exist inside `app/` itself — everything lives in the top-level `tests/`.

| File | Covers |
|---|---|
| `conftest.py` | Shared fixtures: in-memory SQLite (`aiosqlite` + `StaticPool`) test DB built from real model metadata, a **minimal** test app (only mounts `planning` + `vendors` routers — deliberately does not import the real `app.main.app`, see its own docstring), user/wedding/birthday/custom-event/vendor factory fixtures, JWT `auth_headers()` helper. |
| `test_api_planning.py` | Planning Suite HTTP endpoints. |
| `test_error_handling.py` | The error envelope from §6. |
| `test_repositories.py` | `BaseRepository`/Planning repositories. |
| `test_seo.py`, `test_seo_part2.py` | SEO module — largest test files in the suite (295 + 176 lines combined), covering meta overrides, robots rules, redirects, sitemap, etc. |
| `test_services.py` | `event_service.py` / `planning_service.py`. |
| `test_ssr.py` | The SSR landing-page router. |
| `test_vendor_search.py` | `vendor_search_service.py`. |

**Gap:** there is no test coverage at all for auth (`routers/auth.py`), payment
(`routers/payment.py`), gifts/checkout (`routers/gifts.py`, `gifts_seller.py`), the Razorpay
webhook (`routers/razorpay_webhook.py`), gallery (`gallery.py`, `gallery_v2.py`), invitations,
birthday, custom_events, per-event permissions (`routers/permissions.py`), storage/presigned
uploads, photographer, or the SQLAdmin panels. In money/auth terms: **the two highest-risk
surfaces — login/JWT and Razorpay payments — have zero tests**, despite being flagged as
"genuinely well done" in the prior BACKEND_AUDIT.md. The Planning Suite and SEO module (both
newer, both built with repository/service layering) are, by contrast, the best-tested code in the
repo.

### 10. Migration / Alembic state

7 files under `app/alembic/versions/`, linear chain, `0001` → `0006` (`0002` has no
`op.create_table` — it's a column-add migration):

| Migration | Adds |
|---|---|
| `0001_phase1_permissions_gallery_photographer` | `event_permissions`, `photographer_profiles`, `photographer_assignments`, and the extended gallery tables (albums, likes, comments, etc.) — 6 `create_table` calls. |
| `0002_add_token_version_to_users` | `account_user.token_version` column only. |
| `0003_add_seo_tables` | `seo_meta_overrides`, `seo_robots_rules` — 2 `create_table` calls. |
| `0004_seo_focus_keyword_and_redirects` | `seo_redirects` + a column add — 1 `create_table` call. |
| `0005_vendor_category_url_slug` | Column add only (`vendor_categories.url_slug`). |
| `0006_seo_part2_tables` | `seo_performance_snapshots`, `blog_posts`, `seo_search_console_token` — 3 `create_table` calls. |

**Only ~12 of the 67 declared tables have ever been created via an Alembic `create_table`.** The
other ~55 (`account_user` itself, all of `invitation.py`, `vendor.py` minus the one column,
`gift.py`, `birthday.py`, `custom_event.py`, `planning.py`, `payment.py`) exist in the database
only because `app/main.py`'s `lifespan()` calls `Base.metadata.create_all()` — and **only when
`settings.DEBUG` is true** (there's an extensive inline comment in `main.py` explaining exactly
why this must never run in production: it silently creates any table Alembic hasn't gotten to
yet, then a later real Alembic migration for that same table fails with "already exists"). This
means: a fresh production database has no Alembic-driven path to recreate the base schema from
scratch — it depends on `create_all()` having run once (in DEBUG) or an `alembic stamp head`
workaround. Any future column change to one of those ~55 tables has no recorded migration
history to build on. This is the single biggest piece of technical debt standing between today's
schema and a clean, replayable migration history for the CMS/marketplace work ahead.

### 11. Hardcoded business-data scan (`app/` only)

Grepped `app/` for module-level constant dicts/lists/sets that hold business content rather than
technical config. Findings, roughly most → least significant:

- **Hardcoded subscription pricing**, `app/routers/payment.py:37-42`:
  ```python
  PLAN_PRICES_INR = {"FREE": 0, "BASIC": 49900, "PRO": 99900, "PREMIUM": 199900}
  ```
  This is real INR pricing (in paise) for the platform's own user-facing subscription plans,
  hardcoded in a router file, driving actual Razorpay order amounts
  (`create_subscription_order`). Notably **inconsistent with the vendor side of the same
  product**: `app/models/vendor.py`'s `SubscriptionPlan` table already has
  `price_monthly`/`price_yearly` DB columns and is admin-editable via SQLAdmin — vendor
  subscription pricing is already dynamic, user subscription pricing is not. This is the
  clearest, most concrete "needs a DB-backed `site_settings`/plans table" finding in the backend.
- **Hardcoded "suggested event type" picker list**, `app/schemas/custom_event.py:8-14`:
  ```python
  EVENT_TYPES = ["Travel", "Vacation", "Festival", "Road Trip", ..., "Other"]  # 26 entries
  ```
  Explicitly commented as "Suggested types shown in the New Event picker." Not strictly
  enforced (the `CustomEvent.event_type` column is free text — users can type their own), but
  it's UI copy content living in a schema file rather than being admin-editable.
  `app/models/planning.py` and `app/services/event_service.py` separately declare a *different*,
  smaller, structural `EVENT_TYPES = ("wedding", "birthday", "custom")` tuple — same name,
  different purpose (one is a picker's suggestion list, the other is the enum of real
  event-owning tables); worth not confusing the two when planning a CMS-driven replacement.
- **Hardcoded inline email copy**, `app/workers/tasks/email_tasks.py` — `send_rsvp_notification_task`
  and `send_enquiry_notification_task` both build their email HTML as raw f-strings inside the
  Celery task function body (e.g. `f"<p>A new RSVP has been submitted for your wedding website
  <b>{website_slug}</b>.</p>"`). No template table, no template IDs — every transactional email's
  copy is Python source. This maps directly to the requested `email_templates` gap.
- **Hardcoded robots.txt fallback**, `app/seo/robots.py:17-32` (`DEFAULT_DISALLOW` — a list of
  ~13 path prefixes). Lower severity than the above: this is explicitly a *fallback default* —
  `app/seo/models.py`'s `SeoRobotsRule` table already exists and takes priority when populated,
  per the module's own docstring ("If the table is empty, app/seo/robots.py falls back to
  sensible hardcoded defaults"). This one is arguably fine as-is (a safe default for an
  empty-table state), but is still business/config content sitting in Python.
- **Not flagged as problems**: `ALLOWED_IMAGE_TYPES`/`ALLOWED_VIDEO_TYPES`/`ALLOWED_DOCUMENT_TYPES`/
  `MAX_FILE_SIZE_MB` (in `routers/storage.py`, `routers/gallery.py`, `utils/image.py`) are
  technical upload-validation constants, not business content — reasonable to leave as code.
  Vendor categories (`VendorCategory`) and gift categories (`GiftCategory`) are **already
  DB-backed, admin-editable tables**, not hardcoded — this part of the "hardcoded category list"
  concern raised in the task brief turns out to already be solved for those two domains.

### Config surface / "site settings" today

`app/core/config.py` is a single flat `pydantic_settings.Settings(BaseSettings)` class reading
from `.env` — ~50 environment-variable-backed fields (DB, JWT, Google OAuth, Redis, CORS, media,
email, Razorpay, Sentry, Twilio, S3/R2, OpenAI, PageSpeed, WhatsApp). **There is no DB-backed
"site settings" concept at all** — no `SiteSetting` model, no admin-editable typed key/value
store, no feature-flag table. Everything configurable today is an env var requiring a
deploy/restart to change, not a live admin-panel toggle. `.env.example` itself is stale (still
references `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`, a
`snapshare`-named DB, and a Django/Next.js production checklist) — worth a cleanup pass
independent of this audit, since it will actively mislead anyone following it for a fresh setup
today.

### Admin UI today

`app/admin/main.py` + `app/admin/views.py`: three separate **SQLAdmin** (Python admin-panel
library) instances — `/admin` (everything), `/vendor-admin`, `/gift-admin` — sharing one
session-based `PlanazoAdminAuth` backend gated on `user.role == "ADMIN" or user.is_superuser`.
`views.py` registers `ModelView`s for most models (User, invitation/*, vendor/*, gallery/*,
permissions/*, gift/*, birthday/*, payment/*, seo/*) with reasonable `column_list`/
`column_searchable_list`/`column_filters` per model. This gives direct CRUD over almost every
table today — a real admin surface already exists, just not one with granular per-role
permissions (any `ADMIN` sees and can edit everything), no audit log of who changed what, and
it's server-rendered HTML rather than a JSON API a future custom admin SPA could drive.
