# Planazo Backend — Code Audit

Full read-through of `app/` (and its `services/` sibling), done to figure out what's actually
built vs. what's missing before you keep working on it. ~7,200 lines across 8 models, 13
routers, 9 schema modules, admin, workers, and storage service.

Bottom line up front: the backend is further along than the stale docs in this repo suggest.
It's a real, mostly-working FastAPI app with async SQLAlchemy, JWT auth, Google OAuth, Razorpay
payments, S3/R2 storage, and an admin panel. The gaps are concentrated in a few specific places:
background jobs that are built but never called, zero tests, a broken CI/CD pipeline, and some
loose ends around inventory and token security.

---

## 1. What's solid

- **Auth** (`routers/auth.py`) — register, login, Google OAuth, refresh, OTP, forgot/reset/change
  password all implemented against real endpoints, matching what the frontend's `lib/api.js`
  expects. Legacy Django PBKDF2 password hashes are transparently upgraded to bcrypt on first
  login (`needs_rehash`), which is a nice touch for the migration.
- **Core** (`core/config.py`, `core/security.py`, `core/dependencies.py`, `database/base.py`) —
  clean, correctly async (asyncpg + `async_sessionmaker`), JWT create/verify is standard and
  correct, `get_current_user` / `require_role` dependency pattern is used consistently across
  every router.
- **Storage service** (`services/storage.py`) — a well-built abstraction over local disk vs.
  S3/Cloudflare R2, with presigned uploads so files never pass through the API server in
  production. Used correctly by `routers/storage.py`, `gallery_v2.py`, `photographer.py`.
- **Razorpay webhook** (`routers/razorpay_webhook.py`) — this one is genuinely well done:
  constant-time signature check (`hmac.compare_digest`), event-type dispatch table, idempotent
  status updates for `GiftOrder` / `MarketplaceOrder` / `UserSubscription`.
- **Admin** (`admin/main.py`, `admin/views.py`) — three SQLAdmin instances (`/admin`,
  `/vendor-admin`, `/gift-admin`) with session auth gated on `role == ADMIN`, and `ModelView`
  registrations covering essentially every model.
- **Routers are consistent** — every one of the 13 routers follows the same shape (Pydantic
  request/response models, `Depends(get_current_user)`, ownership checks before mutating). No
  half-written endpoints, no `TODO`/`FIXME`/`NotImplementedError` anywhere in the codebase — I
  grepped for it specifically and came up empty.

---

## 2. Critical gaps — fix these first

**Background jobs exist but nothing calls them.** `app/workers/tasks/image_tasks.py` and
`email_tasks.py` define `generate_thumbnails_task`, `compute_face_embedding_task`,
`send_rsvp_notification_task`, and `send_enquiry_notification_task` — all correctly written
Celery tasks. I grepped the entire `app/` tree for `.delay(` and `apply_async` and found zero
call sites outside the task files themselves. Concretely:
  - Uploading a gallery image (`routers/gallery.py`, `gallery_v2.py`) never triggers thumbnail
    generation or face-embedding — `thumb_small`/`thumb_medium`/`face_embedding` columns exist
    on `GalleryImage` but nothing populates them through the normal upload path.
  - Instead, `routers/gallery.py`'s `/selfie-match/` endpoint does face-embedding **synchronously,
    inline, in the request handler** — loading the InsightFace ONNX model fresh on every single
    call via a one-off `ThreadPoolExecutor`. This will be slow and won't scale, and it duplicates
    logic that already exists correctly as `compute_face_embedding_task`. The `status: PROCESSING`
    field and the separate polling endpoint (`GET /selfie-match/{id}/`) imply an async design that
    isn't actually happening — the response only ever comes back `DONE` or `FAILED` immediately.
  - Submitting an RSVP (`invitations.py`) or a vendor enquiry (`vendors.py`) never sends a
    notification — not via Celery, not synchronously either. `send_rsvp_notification_task` and
    `send_enquiry_notification_task` are dead code right now.
  - Net effect: your `celery_worker` / `celery_beat` containers are running and doing nothing.

**Duplicate, weaker Razorpay webhook.** `routers/payment.py` defines its own
`POST /api/payment/razorpay-webhook/` alongside the proper one in `routers/razorpay_webhook.py`
(`POST /api/webhooks/razorpay/`). The one in `payment.py`:
  - Compares the HMAC signature with plain `!=` instead of `hmac.compare_digest` — a timing-attack
    vector on the webhook signature check (same pattern is repeated in `gifts.py`'s order-verify
    endpoints and `payment.py`'s subscription-verify endpoint — three places doing manual
    non-constant-time signature comparison).
  - Only recognizes `payment.captured` and only updates `Transaction`, not `GiftOrder` or
    `MarketplaceOrder`.
  - Recommendation: delete the webhook handler in `payment.py`, point your Razorpay dashboard
    webhook URL at `/api/webhooks/razorpay/` only, and switch the three manual signature checks
    (`gifts.py` ×2, `payment.py` subscription verify) to `hmac.compare_digest`.

**No stock/inventory enforcement.** `GiftProduct.stock` exists and the seller dashboard can set
it (`gifts_seller.py`'s `/products/{id}/stock/`), and `low_stock` filtering reads it — but nothing
in the actual order flow (`gifts.py`: `add_to_cart`, `marketplace_checkout`, `create_gift_order`)
checks stock before allowing a purchase, or decrements it after payment succeeds. A product with
`stock = 0` can still be ordered.

**CI/CD is completely broken and would fail on every push.** `.github/workflows/deploy.yml` is
100% pre-migration Django:
  - Installs from `backend/requirements.txt` (doesn't exist — it's `app/requirements.txt` now).
  - Runs `python manage.py test` — there's no `manage.py`, this is FastAPI.
  - Deploy step runs `docker compose exec -T django python manage.py migrate` and
    `collectstatic` against a service called `django`, which doesn't exist in
    `docker-compose.prod.yml` (the service is `api`, and migrations should be
    `alembic upgrade head`, not a Django command).
  - This means: if you push to `main` right now, the pipeline fails at the test step and never
    deploys. This is worth fixing before you rely on it.

**Zero tests.** No `tests/` directory exists anywhere in the repo, despite `app/repositories/`
and the general project layout implying a testing story. `pytest` isn't even in
`requirements.txt`.

---

## 3. Structural gaps (planned but empty)

Three directories from your intended architecture exist only as empty `__init__.py` stubs — not
started yet:
  - `app/repositories/` — no repository pattern; every router talks to SQLAlchemy directly via
    `db.execute(select(...))`. Works fine at this size, but if you want the repository layer from
    your original spec, it hasn't been built.
  - `app/services/` (inside `app/`, not the top-level `services/` sibling that has `storage.py`)
    — empty. Business logic currently lives inline in router functions.
  - `app/middleware/` — empty. CORS and session middleware are registered directly in `main.py`
    rather than as separate middleware modules; there's no custom logging/request-ID middleware.
  - `app/api/` and `app/api/v1/` — both only contain empty `__init__.py`. Dead skeleton folders
    left over from the suggested structure; all real routers live in `app/routers/` instead. Safe
    to delete if you want to tidy up, or repurpose if you want versioned APIs later.

**Alembic migrations don't cover most of the schema.** Only one migration exists —
`0001_phase1_permissions_gallery_photographer.py`, which adds gallery albums/likes/comments and
photographer tables. The other ~7 models (`User`, `CoupleWebsite` and friends, `VendorWebsite`
and friends, `GiftProduct` and friends, `BirthdayPage`, `UserSubscription`/`Transaction`) have no
migration history — they only exist because `main.py`'s lifespan hook calls
`Base.metadata.create_all()` on startup. This matches the known issue already flagged in your
handoff notes (`alembic stamp head` workaround), but it means: any future column change to those
tables has no migration path, and a fresh production database would need `create_all()` to run
once, then `alembic stamp head` — there's no way to replay schema history from scratch via
Alembic alone.

---

## 4. Smaller but worth knowing about

- **No refresh-token revocation.** `POST /api/auth/logout` is a no-op (`return {"detail": "Logged
  out"}` — literally just an ack). Refresh tokens are stateless JWTs with no blacklist, so a
  stolen refresh token stays valid for its full 30-day lifetime even after "logout." If you want
  real logout/revocation, you'd need a Redis-backed denylist keyed by token or a token version
  field on `User`.
- **Registration role is capped at `{COUPLE, VENDOR, ADMIN}`** (`schemas/user.py`,
  `ROLE_CHOICES`) — but `PhotographerProfile`, the whole `routers/photographer.py` module, and
  `User.is_photographer` all assume a `PHOTOGRAPHER` role exists. There's no path for a user to
  actually become `PHOTOGRAPHER` through `/api/auth/register` — worth confirming whether that's
  intentional (e.g., admin promotes users manually) or a gap.
- **OTP is email-only.** `SendOtpRequest`/`VerifyOtpRequest` only take `email`. `Twilio` settings
  (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) are defined in `config.py` but
  never referenced anywhere else in the codebase — so phone/SMS OTP is configured but not wired to
  anything.
- **No global exception handlers.** `main.py` doesn't register any `@app.exception_handler(...)`
  for validation errors, DB errors, or unhandled exceptions — FastAPI's defaults are used as-is.
  Sentry is wired (`sentry_sdk.init` with the `[fastapi]` extra) so unhandled exceptions do get
  reported, but there's no consistent JSON error envelope across error types.
- **No structured logging setup.** Various modules call `logging.getLogger(__name__)` but nothing
  calls `logging.basicConfig(...)` or sets a formatter/level anywhere, so log output format/level
  is whatever the default root logger does (typically nothing below WARNING shows up).
- **No rate limiting.** No `slowapi` or equivalent in `requirements.txt` or `main.py` — auth
  endpoints (login, OTP, password reset) have no throttling.
- **Dead commented-out code** in `core/security.py` (an old `token_response` referencing a
  nonexistent `UserOut` class, superseded by the working version right below it) — harmless but
  worth deleting during cleanup.

---

## 5. Suggested order to tackle this

1. **Fix the CI/CD pipeline** (`.github/workflows/deploy.yml`) — it's fully broken right now, so
   anything you merge to `main` won't deploy until this is rewritten for `app/` + Alembic +
   the `api` service name.
2. **Wire up the Celery tasks that already exist** — call `send_rsvp_notification_task.delay(...)`
   from `invitations.py`'s `create_rsvp`, `send_enquiry_notification_task.delay(...)` from
   `vendors.py`'s `create_enquiry`, and `generate_thumbnails_task.delay(...)` /
   `compute_face_embedding_task.delay(...)` from the gallery upload paths. This is mostly plumbing
   — the task code itself is fine.
3. **Fix the three timing-unsafe signature checks** (`gifts.py` ×2, `payment.py` subscription
   verify) — swap `!=` for `hmac.compare_digest`, and delete the duplicate/weaker webhook handler
   in `payment.py` in favor of `routers/razorpay_webhook.py`.
4. **Add stock enforcement** to `gifts.py`'s cart/checkout/order-creation paths.
5. **Add a test suite** — even a thin one (auth flow, one CRUD router, the webhook signature
   check) would catch regressions as you keep building. `pytest` + `pytest-asyncio` +
   `httpx.AsyncClient` against the FastAPI app is the standard pattern here.
6. **Decide on the empty scaffold folders** (`repositories/`, `services/` inside `app/`,
   `middleware/`, `api/`) — either start using them or delete them so the structure reflects
   reality.
7. Everything in section 4 (logout/revocation, exception handlers, logging config, rate limiting)
   is real but lower-urgency hardening — good to schedule once the above is stable.
