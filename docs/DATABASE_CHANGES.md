# Planazo Database Changes — Gap Analysis

Companion to `docs/ARCHITECTURE_AUDIT.md`. Read-only audit of the current schema (67 tables
across `app/models/*.py` + `app/seo/models.py`), followed by a gap list of what's needed to
support a fully dynamic, database-driven, admin-controlled platform (CMS + marketplace + event
platform + centralized settings + audit logging + granular RBAC).

---

## 1. Current schema summary

Grouped by domain module. FKs to `account_user.id` are omitted below where every child-of-child
table's ownership is already implied by its parent; only direct/notable FKs are called out.

### Users (`app/models/user.py`)
- **`account_user`** — the single user table. Key fields: `email` (unique), `password`
  (bcrypt/legacy PBKDF2), `role` (string: `USER`/`VENDOR`/`ADMIN`, plus de facto
  `PHOTOGRAPHER`), `google_id`, `phone`, `is_active`, `is_staff`, `is_superuser`,
  `token_version` (JWT revocation counter). Owns nearly every other table in the system via FK.

### Weddings / invitations (`app/models/invitation.py`)
- **`couple_websites`** — root entity, FK `account_id`. `theme`, `slug` (unique), `gallery_token`,
  `is_published`, `views`.
- **`bride_groom`** (1:1), **`stories`**, **`events`**, **`wedding_countdown`** (1:1),
  **`invitation_rsvps`**, **`wishes`**, **`page_visits`**, **`wedding_gallery_photos`**,
  **`wedding_vendors`** (join table to `vendor_websites`, unique on `(website_id, vendor_id)`) —
  all FK `website_id → couple_websites.id`.

### Birthdays (`app/models/birthday.py`)
- **`birthday_birthdaypage`** — root, FK `owner_id`. `slug` (unique), `theme`, `is_published`.
- **`birthday_birthdayevent`**, **`birthday_birthdaystory`**, **`birthday_birthdaywish`**,
  **`birthday_birthdayrsvp`**, **`birthday_birthdaycountdown`** — structurally near-identical to
  the wedding equivalents, FK `page_id`.

### Custom events (`app/models/custom_event.py`)
- **`custom_events`** — root, FK `owner_id`. `event_type` (free text), `visibility`, `status`.
- **`custom_event_checklist_items`**, **`custom_event_budget_items`**, **`custom_event_notes`**,
  **`custom_event_gallery`**, **`custom_event_files`**, **`custom_event_members`** — all FK
  `event_id`, all cascade-delete with the parent.

### Planning Suite (`app/models/planning.py`)
- **`planning_checklist_items`**, **`planning_budget_items`**, **`planning_guests`**,
  **`planning_vendor_bookings`** — cross-cutting, NOT FK'd to a single event table. Each carries
  `owner_id` (denormalized, fast-filter only) + polymorphic `(event_type, event_id)` with a
  `CHECK` constraint restricting `event_type` to `'wedding'|'birthday'|'custom'`, re-validated
  against the real owning row on every request.

### Vendors (`app/models/vendor.py`)
- **`vendor_categories`** — admin-editable taxonomy. `key` (unique), `name`, `url_slug` (unique,
  used by SSR landing pages), `order`, `is_active`.
- **`vendor_theme_presets`** — admin-editable color/preview presets.
- **`vendor_websites`** — root, FK `account_id` (unique — one per user), `category_obj_id →
  vendor_categories`, `theme_preset_id`. `slug` (unique), `is_verified`.
- **`vendor_portfolio_categories`**, **`vendor_packages`** (has `price` Numeric + `features` JSON),
  **`vendor_portfolio`**, **`vendor_enquiries`**, **`vendor_reviews`** — all FK `vendor_id`.
- **`vendor_subscription_plans`** — DB-backed plan/pricing table (`tier`, `price_monthly`,
  `price_yearly`, feature-flag columns, `razorpay_plan_id`).
- **`vendor_subscriptions`** — FK `vendor_id` (unique), `plan_id → vendor_subscription_plans`.
- **`vendor_favorites`** — join table, FK `user_id` + `vendor_id`, unique pair.

### Gifts / marketplace (`app/models/gift.py`)
- **`gift_sellers`** — FK `user_id` (unique). `status`, `commission_pct`.
- **`gift_categories`** — admin-editable taxonomy (name unique, emoji/icon, order).
- **`gift_products`** — FK `seller_id`, `category_id`. `slug` (unique), `price`/`compare_price`
  Numeric, `stock`, `tags` JSON.
- **`gift_product_images`**, **`gift_product_variants`**, **`gift_product_reviews`** — FK
  `product_id`.
- **`gift_carts`**/**`gift_cart_items`** — FK `user_id` / `cart_id`+`product_id`+`variant_id`
  (unique triple).
- **`gift_orders`** — single-product order, FK `product_id`, `website_id → couple_websites`
  (nullable).
- **`gift_marketplace_orders`**/**`gift_marketplace_order_items`** — general cart checkout, FK
  `user_id`, `order_number` unique; items FK `order_id`, `product_id`, `seller_id`.
- **`gift_scheduled_deliveries`** — postcard/gift scheduling, FK `product_id`, `website_id`.

### Gallery (`app/models/gallery.py`)
- **`gallery_categories`** — simple name-only taxonomy.
- **`gallery_albums`** — FK `website_id → couple_websites`, `privacy` (`PUBLIC`/`FAMILY`/
  `PRIVATE`).
- **`gallery_images`** — FK `website_id`, `album_id`, `category_id`, `uploaded_by_id`. Rich
  metadata: `media_type`, multiple thumbnail/CDN URL columns, AI fields (`face_embedding`,
  `ai_tags` JSON, `ai_scene`, `ai_quality_score`), `privacy`, engagement counters.
- **`gallery_media_likes`**, **`gallery_media_comments`** — FK `image_id`.
- **`guest_selfie_matches`** — FK `website_id`; M:M with `gallery_images` via
  `gallery_guestselfie_matched_images`.

### Permissions (`app/models/permissions.py`)
- **`event_permissions`** — FK `user_id`, `invited_by_id`; unique
  `(event_type, event_id, user_id)`. `role` (9-value enum), 8 nullable capability-override
  boolean columns, `invite_token` (unique).
- **`photographer_profiles`** — FK `user_id` (unique). Extended profile fields.
- **`photographer_assignments`** — FK `photographer_id`, `assigned_by_id`; unique
  `(photographer_id, event_type, event_id)`.

### Payments (`app/models/payment.py`)
- **`subscriptions`** (class `UserSubscription`) — FK `account_id` (unique). `plan` is a bare
  string, **no FK to a plan table** (contrast with `vendor_subscription_plans` above).
- **`transactions`** — FK `subscription_id`, `account_id`. Razorpay order/payment/signature
  fields, `status`.

### SEO (`app/seo/models.py`)
- **`seo_meta_overrides`** — keyed by exact URL `path` (string, unique), not a FK — a polymorphic-
  by-path pattern (not by entity_type/entity_id). `title`, `meta_description`, `og_image`,
  `robots`, `focus_keyword`.
- **`seo_robots_rules`** — one row per User-agent block, `allow_paths`/`disallow_paths` JSON
  lists.
- **`seo_redirects`** — `source_path` (unique) → `target_path`, `status_code`, `hit_count`.
- **`seo_performance_snapshots`** — PageSpeed Insights history, keyed by `path` + `strategy`.
- **`blog_posts`** — `slug` (unique), `content` (HTML), `status` (`draft`/`published`), `tags`
  JSON.
- **`seo_search_console_token`** — single-row OAuth token store for GSC.

---

## 2. Gap list — new tables/fields needed

For each requested capability: what's needed, and whether something already in the schema above
could be extended instead of building a duplicate.

### `site_settings` (typed, not one JSON blob)
**Not present.** All configuration today is `app/core/config.py`'s flat env-var-backed
`Settings` class — nothing DB-backed, nothing admin-editable without a redeploy. Needs a new
table, e.g.:
```
site_settings(id, key UNIQUE, value_type ENUM('string','int','bool','decimal','json','color','url'),
              value_string, value_int, value_bool, value_decimal, value_json,
              group VARCHAR,  -- e.g. "branding","payments","seo","contact"
              description, updated_by_id FK->account_user, updated_at)
```
Typed columns (rather than one JSON blob) so the admin UI can render the right input control and
the DB can validate type at the column level. **Nothing to extend** — this is genuinely new.
Note the closest existing precedent for *pattern* (not table) is `seo_meta_overrides`, which
already proves out "admin-editable override table with sensible code-level fallback" — same
philosophy should carry over here.

### `homepage_sections`
**Not present.** No CMS concept of a homepage at all in the backend today (the SSR module only
renders vendor-category landing pages and blog, per `app/ssr/router.py`). New table needed:
```
homepage_sections(id, section_key, section_type ENUM('hero','featured_vendors','testimonials',
                   'blog_highlights','cta_banner', ...), title, subtitle, content JSON,
                   order, is_active, updated_at)
```
No overlap with anything existing.

### `navigation_menus` + `navigation_items`
**Not present.** No navigation/menu model anywhere in `app/`. New tables:
```
navigation_menus(id, key UNIQUE, name, location ENUM('header','footer','mobile', ...))
navigation_items(id, menu_id FK, parent_id FK->self (nullable, for submenus), label, url,
                  order, is_active, opens_new_tab)
```

### `pages` (CMS)
**Not present as a generic CMS page table.** The closest things that exist are narrow,
purpose-built content types: `blog_posts` (blog only) and the SSR templates (code-defined
routes, not admin-authored pages). A generic CMS `pages` table is still needed for things like
"About Us," "Terms," "Privacy," landing pages, etc.:
```
pages(id, slug UNIQUE, title, content (HTML/markdown), template ENUM('default','landing',...),
      status ENUM('draft','published'), published_at, created_by_id, updated_at)
```
Could reuse `blog_posts`' shape as a starting template (same `slug`/`status`/`published_at`/
`content` fields already exist there) rather than inventing a new shape from scratch — but they
should stay separate tables since blog posts have blog-specific fields (`excerpt`, `author_name`,
`tags`) a generic page doesn't need.

### `media_library`
**Not present as a shared, browsable asset table.** Media today is scattered per-domain:
`gallery_images` (event photos), `vendor_portfolio`/`VendorWebsite.thumbnail`/`cover_image`
(plain string URL/key columns, no metadata table), `gift_products`/`ProductImage` (same pattern),
`blog_posts.cover_image` (same pattern). None of these give an admin a single "media library" to
browse/reuse assets across contexts — every image reference is either a bespoke child table
(`gallery_images`, `ProductImage`, `VendorPortfolioImage`) or a bare string column with no
searchable metadata. A shared table would need to be additive, not a replacement for
`gallery_images` (which has legitimate event-specific fields — AI tags, privacy, likes — that a
generic media library shouldn't carry):
```
media_library(id, storage_key, cdn_url, file_type, file_size_kb, width, height,
              alt_text, caption, uploaded_by_id, folder/tag, created_at)
```
`services/storage.py`'s `StorageService` (upload/presign/delete over local-vs-S3/R2) is already
the right abstraction to plug a media-library table into — it just isn't backed by any single
tracking table today.

### `seo_metadata` (polymorphic `entity_type`/`entity_id`)
**Partially present, different polymorphism style.** `seo_meta_overrides` already does per-page
SEO overrides, but keyed by **URL path string** (`path`, unique), not by `(entity_type,
entity_id)`. This is a deliberate design choice per the model's own docstring (works for any
current/future page type without a schema change, Yoast/RankMath-style). Recommendation: this
table **can likely be extended/reused** rather than duplicated — the practical difference between
"keyed by path" and "keyed by (entity_type, entity_id)" is mostly about whether a slug rename
requires updating the SEO row too (path-keyed does; entity-keyed doesn't). If polymorphic
entity-based lookup is genuinely needed (e.g. so a vendor's SEO metadata survives a slug change
without manual re-entry), consider adding nullable `entity_type`/`entity_id` columns to
**this same table** alongside the existing `path`, rather than creating a second, competing SEO
metadata table — the rest of the SEO module (`generator.py`, `analysis.py`) is already built
around `SeoMetaOverride`, and forking the concept in two tables would fragment that logic.

### `seo_keywords`
**Not present.** `SeoMetaOverride.focus_keyword` exists but is a single string field per page,
not a keyword-tracking table (no search volume, ranking position, or history). New table:
```
seo_keywords(id, keyword, target_path, search_volume, difficulty_score, current_rank,
             last_checked_at, notes)
```
`app/seo/search_console.py` already integrates with Google Search Console (OAuth token stored in
`seo_search_console_token`) — a natural data source to populate/refresh this table from, if GSC's
API is used for keyword performance rather than a third-party rank tracker.

### `seo_redirects`
**Already fully present** — `seo_redirects` table (`source_path`, `target_path`, `status_code`,
`is_active`, `hit_count`) with a working CRUD API (`/api/seo/admin/redirects/*`) and lookup logic
(`app/seo/redirects.py`) already checked before slug resolution. **Nothing to build here** — this
requested item is done.

### `audit_logs`
**Not present anywhere.** No audit trail exists for admin actions, SQLAdmin edits, or role/
permission changes — this is a genuine gap across the whole backend, not just the CMS surface.
New table:
```
audit_logs(id, actor_id FK->account_user, action VARCHAR (e.g. "user.role_changed",
           "vendor_category.updated"), entity_type, entity_id, changes JSON (before/after diff),
           ip_address, created_at)
```
SQLAdmin does not log changes by default (it's a direct-CRUD panel, not audit-aware), so this
would need explicit hooks — either SQLAlchemy `before_flush`/`after_flush` event listeners on
sensitive models, or an explicit `log_action()` call added to admin-facing service functions once
those exist. Worth prioritizing given `SQLAdmin`'s `/admin` panel currently gives any `ADMIN`
unrestricted, unlogged CRUD over all 67 tables.

### `email_templates`
**Not present — currently inline Python.** `app/workers/tasks/email_tasks.py`'s
`send_rsvp_notification_task` and `send_enquiry_notification_task` build email HTML as raw
f-strings inside the Celery task body. No template table, no template IDs, no admin editing.
New table:
```
email_templates(id, key UNIQUE (e.g. "rsvp_notification","enquiry_notification","otp_email",
                 "password_reset"), subject, html_body, available_variables JSON (documentation),
                 updated_at)
```
`send_email_task` (the generic Resend-sending task) already takes `to`/`subject`/`html` as plain
strings, so wiring template rendering in front of it (`render_template(key, **context) →
(subject, html)` before calling `send_email_task.delay(...)`) would be a small, additive change,
not a rewrite of the Celery/Resend plumbing.

### `feature_flags`
**Not present.** No flag system anywhere — every feature is either always-on or gated by a
config env var (e.g. `STORAGE_BACKEND`, `INSIGHT_ENGINE`-style toggles don't exist here at all;
Planazo's `config.py` has no analogous engine-selection settings). New table:
```
feature_flags(id, key UNIQUE, is_enabled, rollout_percentage, description,
              enabled_for_roles JSON (nullable), updated_at)
```
Could reasonably live inside the proposed `site_settings` table (as `value_type='bool'` rows
grouped under `group='feature_flags'`) instead of a separate table, if the admin UI treats
"settings" and "flags" as one screen — worth deciding based on whether flags need
percentage-rollout/role-targeting (which a flat key/value setting can't express cleanly) or not.

### Roles/permissions expansion (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `SEO_MANAGER`,
`MARKETING_MANAGER`, `SUPPORT`)
**Not present at the platform level; a narrower pattern exists per-event.** Today `User.role` is
a bare string with exactly 3 enforced values (`USER`/`VENDOR`/`ADMIN`) plus one unenforced
(`PHOTOGRAPHER`) — see ARCHITECTURE_AUDIT.md §5. `event_permissions` (per-event RBAC, 9 roles ×
8 capability flags with per-assignment overrides) is the right *pattern* to generalize but is
scoped to individual events, not the platform.

Needed: a real platform-level roles/permissions structure, e.g.:
```
roles(id, key UNIQUE (SUPER_ADMIN/ADMIN/EDITOR/SEO_MANAGER/MARKETING_MANAGER/SUPPORT/...), name,
     description)
permissions(id, key UNIQUE (e.g. "cms.pages.edit","seo.redirects.manage","users.manage"),
           description, category)
role_permissions(role_id FK, permission_id FK, PRIMARY KEY(role_id, permission_id))
user_roles(user_id FK, role_id FK, PRIMARY KEY(user_id, role_id))  -- supports multiple roles/user
```
This would let `User.role` either be deprecated in favor of `user_roles`, or kept as a coarse
"account type" (USER/VENDOR/ADMIN, i.e. what kind of account this is) while `user_roles` handles
the fine-grained admin capability tier — the two questions ("what kind of account is this" vs.
"what can this admin do") are different enough that collapsing them into one column is part of
why `PHOTOGRAPHER` ended up an awkward unenforced special case today. `EventPermission`'s
capability-flag/override design (`effective(cap)` resolving override-or-role-default) is directly
reusable as the design template for `role_permissions`, even though the event-scoped table itself
should stay separate (it answers a different question — access to *one event*, not to the
*admin panel*).

### Content version history
**Not present anywhere.** No versioning on any content table — not on `blog_posts`,
`seo_meta_overrides`, `vendor_categories`, or (once built) `pages`/`homepage_sections`. New
table, generic across content types (mirrors the polymorphic pattern already established by
`seo_meta_overrides`/proposed `seo_metadata`):
```
content_versions(id, entity_type, entity_id, version_number, content_snapshot JSON,
                 changed_by_id FK->account_user, change_summary, created_at)
```
Would pair naturally with the `audit_logs` table above — `audit_logs` records *that* something
changed and by whom; `content_versions` records *what it looked like* before, so an admin can
actually revert. Could be populated via the same SQLAlchemy event-listener mechanism suggested
for `audit_logs`.

---

## 3. Summary table — build new vs. extend existing

| Requested capability | Status | Action |
|---|---|---|
| `site_settings` (typed) | Not present | Build new |
| `homepage_sections` | Not present | Build new |
| `navigation_menus` / `navigation_items` | Not present | Build new |
| `pages` (CMS) | Not present (blog_posts is adjacent but blog-specific) | Build new; borrow `blog_posts`' field shape as a starting point |
| `media_library` | Not present as a shared table (per-domain image columns/tables only) | Build new; wire to existing `services/storage.py` |
| `seo_metadata` (polymorphic entity) | Partially present as `seo_meta_overrides` (path-keyed) | Extend existing table with nullable `entity_type`/`entity_id`, don't fork it |
| `seo_keywords` | Not present (`focus_keyword` is a single string field only) | Build new; consider feeding from existing `seo_search_console` integration |
| `seo_redirects` | **Fully present and working** | Nothing to do |
| `audit_logs` | Not present | Build new; high priority given unrestricted/unlogged SQLAdmin access today |
| `email_templates` | Not present (inline f-strings in Celery tasks) | Build new; small integration point already exists (`send_email_task`) |
| `feature_flags` | Not present | Build new, or fold into `site_settings` as a settings group |
| Roles/permissions expansion | Not present at platform level; strong per-event pattern exists (`event_permissions`) | Build new `roles`/`permissions`/`role_permissions`/`user_roles`; reuse `EventPermission`'s capability-override design pattern |
| Content version history | Not present | Build new, pairs with `audit_logs` |
