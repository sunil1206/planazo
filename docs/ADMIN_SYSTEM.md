# Admin System — Current State vs. Target

Audit date: 2026-08-08. Scope: `app/admin/`, `app/models/permissions.py`,
`app/routers/permissions.py`, plus a repo-wide search for audit logging,
RBAC, media handling, site settings, feature flags, and email templating.

## 1. What exists today, concretely

### 1.1 Admin surface: SQLAdmin, not a custom dashboard

`app/admin/main.py` and `app/admin/views.py` wire up **SQLAdmin**
(`sqladmin.Admin` / `sqladmin.ModelView`) — an auto-generated CRUD UI over
SQLAlchemy models, not a hand-built admin app. Three separate `Admin`
instances are mounted (`app/admin/main.py:58-83`), each with its own base
URL and its own set of registered models:

| Mount | Purpose | Models registered (`app/admin/views.py:276-307`) |
|---|---|---|
| `/admin` | "Main admin" — everything | All 31 views: `User`, wedding/invitation models, gallery models, `EventPermission`, `PhotographerProfile`/`Assignment`, `UserSubscription`, `Transaction`, `BirthdayPage`, vendor models, gift/marketplace models, and all 6 SEO models |
| `/vendor-admin` | Vendor subset | `VendorCategory`, `VendorWebsite`, `VendorEnquiry`, `VendorReview`, `SubscriptionPlan`, `VendorSubscription` |
| `/gift-admin` | Gift/marketplace subset | `GiftCategory`, `GiftProduct`, `GiftOrder`, `MarketplaceOrder`, `ScheduledDelivery`, `GiftSeller` |

This is confirmed **wired into the running app**: `app/main.py:186-187` calls
`create_admin_instances(app)` then `register_views(...)` inside
`create_app()`.

**Capabilities per model** are whatever SQLAdmin's `ModelView` gives out of
the box: list/search/sort/filter (declared per-view via `column_list`,
`column_searchable_list`, `column_sortable_list`, `column_filters`), plus
generic create/edit/delete forms auto-generated from the SQLAlchemy columns.
A handful of views disable delete (`can_delete = False`) for records that
represent financial/audit history (`UserAdmin`, `EventPermissionAdmin`,
`VendorEnquiryAdmin`, `VendorReviewAdmin`... — see e.g.
`app/admin/views.py:50,100,161,209,217`), and
`SeoPerformanceSnapshotAdmin` is read-only (`can_create = can_edit = False`,
`app/admin/views.py:261-262`) since it's meant to only be populated by the
real PageSpeed API call.

There is **no custom `/admin` dashboard page, no widgets, no global search
(Ctrl+K), no CMS-style draft/publish/schedule workflow, no homepage
builder, no navigation builder, no bulk actions beyond what SQLAdmin's grid
gives for free, and no version history.** What you get is a generic
per-table CRUD grid — functionally like the Django admin it replaced
(the module docstring literally says so: `app/admin/main.py:1-3` and
`app/admin/__init__.py:1-9` — "SQLAdmin configuration replacing Django
Jazzmin + 3 custom admin sites").

### 1.2 Admin authentication: separate session auth, but role check is trivial

`PlanazoAdminAuth` (`app/admin/main.py:16-53`) is a distinct authentication
path from the normal user-facing JWT flow:

- Login posts `username`/`password` to a Starlette **session** (cookie via
  `SessionMiddleware`, wired in `app/main.py:149-155`), not a JWT.
- It looks up the `User` row by email, verifies the password hash
  (`verify_password`), and gates on `user.is_superuser or user.role ==
  "ADMIN"` (`app/admin/main.py:42-43`).
- `authenticate()` just checks `"admin_user" in request.session` — no
  expiry, no re-verification against current DB state per request (a
  demoted/deactivated admin's session token stays valid until logout or
  session cookie expiry).

So: **one flat gate** — either you're `is_superuser` or `role == "ADMIN"`,
and you get all three admin sites with identical model-level access (there
is no way today to give someone `/vendor-admin` without also being able to
log into `/admin` and see everything, since it's the same auth backend and
the same "is this user ADMIN" check regardless of which site they hit).

### 1.3 RBAC model: flat role string, no permission granularity at the platform level

`app/models/user.py:16` — `User.role` is a single `String(20)` column,
default `"USER"`, with no `Enum`/CHECK constraint pinning it to a fixed set
(comment properties on the model reference `USER`, `VENDOR`, `PHOTOGRAPHER`
— `app/models/user.py:44-54` — and `PlanazoAdminAuth` checks for literal
string `"ADMIN"`). This is **not** a general-purpose admin RBAC system; it's
a coarse account-type flag (regular user vs. vendor vs. photographer vs.
admin), reused ad hoc as the admin gate.

Two `require_role`/gate mechanisms actually exist in the codebase, both
narrower than platform-wide admin RBAC:

- `app/core/dependencies.py:52-58` — `require_role(*roles)`, a FastAPI
  dependency factory that 403s unless `current_user.role` is in the given
  set. Generic, but keyed off the same flat `User.role` string.
- `app/models/permissions.py` — a genuinely well-built **per-event** RBAC
  system (`EventPermission`, `EventRole`), completely separate from admin
  access. Nine roles (`OWNER`, `CO_OWNER`, `ORGANIZER`, `PHOTOGRAPHER`,
  `VIDEOGRAPHER`, `FAMILY`, `VENDOR`, `GUEST`, `VIEWER`), each with a
  default capability preset (`can_upload`, `can_edit`, `can_delete`,
  `can_download`, `can_approve`, `can_publish`, `can_share`,
  `can_manage_permissions`) that can be overridden per-row
  (`EventPermission.effective()`, `app/models/permissions.py:93-98`). This
  is scoped to *wedding/birthday event* collaboration (who can upload
  photos, approve RSVPs, etc. for one specific event) — it has nothing to
  do with who can access `/admin` or manage site-wide content. `
  app/routers/permissions.py` exposes full CRUD + invite-token accept flow
  for it, and it is wired into `app/main.py:169` (`permissions_router`).

**Gap vs. target RBAC** (`SUPER_ADMIN, ADMIN, EDITOR, SEO_MANAGER,
MARKETING_MANAGER, SUPPORT` with granular permissions): none of this
exists today. There is no permission table for admin-side capabilities
(e.g. "can edit blog posts but not manage users"), no per-resource
permission checks in the admin UI (SQLAdmin's `ModelView` has no concept of
it without custom `is_visible`/`is_accessible` overrides, which aren't
used here), and no distinction between admin roles at all — it's binary
(`ADMIN`/`is_superuser` vs. everyone else). Building the target model means:
a new `admin_role` (or reusing `role` with a wider enum) + a permissions
table keyed by (role or user) × (resource or capability), enforced both in
SQLAdmin (via per-`ModelView` `is_accessible`/`is_visible` hooks, or
replacing SQLAdmin's authless-per-model model with real per-view checks)
and in any new custom dashboard/API routes.

### 1.4 Audit log: absent

Repo-wide search for `audit`/`AuditLog` (case-insensitive) turns up only
unrelated matches — the word "audits" as in Google Lighthouse's
`audits` dict inside `app/seo/pagespeed.py`, and a docstring in
`app/seo/models.py`. **There is no audit log model, table, or
middleware anywhere in the codebase.** No record of who changed what, when,
in the admin UI or anywhere else. SQLAdmin itself doesn't log changes by
default either. This needs to be built from scratch: a model (actor,
action, resource type/id, before/after diff or field-level change,
timestamp, IP/UA optionally), and either SQLAdmin event hooks or a
DB-level trigger/ORM event listener to populate it automatically so it
can't be bypassed by direct service-layer writes.

### 1.5 Media handling: centralized *storage* abstraction, but no media *library*

Two distinct things exist and it's worth being precise about which is which:

- **`services/storage.py`** (`StorageService`, singleton `storage`) —
  genuinely centralized. Abstracts local disk vs. S3/Cloudflare R2 behind
  one `upload()`/`presign_put()`/`delete()`/`make_thumbnail()` API, used by
  every upload path in the app. Local vs. S3 is a single settings flag
  (`STORAGE_BACKEND`). This is a solid foundation — it's the "where do
  bytes go" layer.
- **`app/routers/storage.py`** — a thin router (`/api/storage/presign/`,
  `/api/storage/local-upload/`) that hands out presigned upload URLs so the
  browser uploads directly to S3, bypassing the API server for the actual
  bytes. Validates content-type against an allow-list
  (`ALLOWED_IMAGE_TYPES`/`ALLOWED_VIDEO_TYPES`/`ALLOWED_DOCUMENT_TYPES`,
  `app/routers/storage.py:22-33`) and a 200MB size cap on the local-dev
  fallback path.

What's **missing** is a media *library*: there is no single table that
records "this file was uploaded, here's its key/URL, owner, mime type,
size, dimensions, alt text, which entity it's attached to, when." Instead,
every feature owns its own image rows scattered across the schema:
`GalleryImage`/`GalleryAlbum` (`app/routers/gallery.py`,
`app/routers/gallery_v2.py` — wedding/event photo galleries, each scoped to
a `website_id`), `VendorPortfolioImage`, `ProductImage`, plus assorted
single-image columns (`cover_image`, `thumbnail`, `avatar_url`, `og_image`,
etc.) directly on entity models. There's no cross-feature "browse all
uploaded media" view, no reuse-an-existing-image picker, no orphaned-file
cleanup, no alt-text/caption/tagging system independent of the owning
feature. Building a real media library means a new
`MediaAsset`/`MediaLibraryItem` model (owner, storage key, mime type, size,
width/height, alt text, tags, used-by references) that `services/storage.py`
writes a row to on every upload, plus an admin UI to browse/search/reuse/delete
across all features — today that's entirely absent.

### 1.6 Settings / site configuration: absent

No `Settings`/`SiteSettings` model, table, or admin-editable configuration
store exists in `app/models/`. All configuration is environment-variable
based via `app/core/config.py` (`pydantic-settings` `BaseSettings`) — e.g.
`FRONTEND_URL`, `STORAGE_BACKEND`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`,
`PAGESPEED_API_KEY`. Changing any of it requires a deploy/restart, not an
admin UI action. There is nothing an admin can edit at runtime (site name,
default OG image, contact email, maintenance mode, etc.) — a target
"settings" concept (single-row config table or key/value store, exposed in
the admin dashboard) doesn't exist yet.

### 1.7 Feature flags: absent

No feature-flag mechanism (no `FeatureFlag` model, no config-driven
toggle system, no third-party flag service integration) exists anywhere in
`app/`. Any conditional rollout today would have to be a hardcoded
`if settings.SOME_ENV_VAR` check — there's no admin-manageable on/off
switch for any feature.

### 1.8 Email: real sending via Resend, but templates are inline HTML strings, not a template system

`app/utils/email.py` — a thin wrapper (`send_email`/`send_email_async`)
around the **Resend** SDK (`resend.Emails.send`), not a stub — it makes a
real API call given `RESEND_API_KEY`. `app/workers/tasks/email_tasks.py`
wraps this in a Celery task (`send_email_task`) so callers can fire-and-forget
via `.delay(...)`.

There is **no template system** (no Jinja2/MJML template files for emails,
no `EmailTemplate` model, no template-name-plus-context-vars API). Every
call site is responsible for building its own `subject`/`html` strings
inline and passing them to `send_email_task.delay(...)` — confirmed by
`email_tasks.py:31-49` taking raw `subject`/`html` args straight through.
A target "email template system" would mean: a template model/store
(subject + HTML body with variable placeholders, ideally admin-editable)
and a `send_templated_email(template_name, to, context)` helper that both
transactional call sites and any future admin-triggered campaign email
would go through — none of that exists; it's 100% ad hoc per-call-site HTML
today.

## 2. Concrete gap list to reach the target admin system

Target: `/admin` dashboard with widgets, global search (Ctrl+K), CMS pages
with draft/publish/schedule, homepage builder, navigation builder, bulk
actions, version history, plus `SUPER_ADMIN/ADMIN/EDITOR/SEO_MANAGER/
MARKETING_MANAGER/SUPPORT` RBAC.

| Requirement | Status | Notes |
|---|---|---|
| Custom `/admin` dashboard w/ widgets | **Missing** | Today `/admin` is SQLAdmin's generic model-grid home, no widgets/metrics |
| Global search (Ctrl+K) | **Missing** | SQLAdmin has per-model search only, no cross-entity command palette |
| CMS pages w/ draft/publish/schedule | **Partially present for blog only** | `BlogPost.status` is `"draft"`/`"published"` (`app/seo/models.py:142`) with a `published_at` timestamp set on publish (`app/seo/router.py:357-358,380-381`) — but no "schedule for future" (no scheduled-publish worker/cron), and no generic CMS "page" concept beyond the blog — no static/landing page builder |
| Homepage builder | **Missing** | No block/section model or admin UI for composing the homepage |
| Navigation builder | **Missing** | No nav-menu model; navigation is presumably hardcoded in the frontend |
| Bulk actions | **Minimal** | Only `bulk_approve` exists, and it's gallery-specific (`app/routers/gallery_v2.py:199-216`), not an admin-dashboard bulk-action framework applicable across resources |
| Version history | **Missing** | No revision/versioning table anywhere; SQLAdmin edits overwrite in place with no history |
| RBAC (`SUPER_ADMIN`/`ADMIN`/`EDITOR`/`SEO_MANAGER`/`MARKETING_MANAGER`/`SUPPORT`) | **Missing** | Current model is binary (`is_superuser` or `role=="ADMIN"` vs. not); `EventPermission`'s 9-role system is unrelated (per-event, not per-admin-resource) |
| Audit log | **Missing** | Confirmed absent repo-wide (see §1.4) |
| Media library | **Missing** (storage abstraction exists, library doesn't) | See §1.5 — `services/storage.py` is a solid base to build on |
| Settings/config store | **Missing** | Env-vars only, no DB-backed admin-editable settings (see §1.6) |
| Feature flags | **Missing** | See §1.7 |
| Email templates | **Missing** (sending works) | Real Resend integration, but inline HTML per call site, no template system (see §1.8) |

## 3. What NOT to rebuild

- **Per-event permissions** (`app/models/permissions.py`,
  `app/routers/permissions.py`) are already a solid, tested, fine-grained
  RBAC system — just scoped to event collaboration, not admin access. Don't
  duplicate this pattern from scratch for admin RBAC; the capability-preset
  + per-row-override design (`EventRole.DEFAULTS` +
  `EventPermission.effective()`) is a reasonable template to reuse for the
  new admin permission model, even though the table itself is unrelated.
- **Storage abstraction** (`services/storage.py`) — don't rebuild
  local/S3 abstraction, presigned uploads, or thumbnailing; a media library
  should be a metadata layer on top of this, not a replacement for it.
- **Admin authentication** — the session-based `PlanazoAdminAuth` is a
  reasonable foundation for SQLAdmin's own session needs; a new RBAC layer
  should extend the role check inside `authenticate()`/`login()`
  (`app/admin/main.py:21-53`) rather than replace the session mechanism
  itself, unless the custom dashboard moves off SQLAdmin entirely.
- **Email sending plumbing** (`app/utils/email.py`,
  `app/workers/tasks/email_tasks.py`) — Resend + Celery wrapper is real and
  working; only the templating layer on top needs to be added.
