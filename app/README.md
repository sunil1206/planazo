# Planazo — FastAPI Backend

Complete replacement of the Django backend. Pure FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Environment Setup](#3-environment-setup)
4. [Run Locally (Docker)](#4-run-locally-docker)
5. [Run Locally (Without Docker)](#5-run-locally-without-docker)
6. [Database Migration](#6-database-migration)
7. [Admin Panels](#7-admin-panels)
8. [API Documentation](#8-api-documentation)
9. [Celery Workers](#9-celery-workers)
10. [Full Table Reference](#10-full-table-reference)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.12+ | https://python.org |
| PostgreSQL | 16+ | https://postgresql.org |
| Redis | 7+ | https://redis.io |
| Docker + Compose | v2 | https://docker.com |
| Node.js (frontend only) | 20+ | https://nodejs.org |

---

## 2. Project Structure

```
wedding-project/
├── app/                        ← NEW FastAPI backend (this folder)
│   ├── core/
│   │   ├── config.py           ← All settings (Pydantic BaseSettings)
│   │   ├── security.py         ← JWT + password hashing
│   │   └── dependencies.py     ← FastAPI Depends (auth, roles)
│   ├── database/
│   │   └── base.py             ← Async SQLAlchemy engine + session
│   ├── models/                 ← SQLAlchemy ORM models (7 files, 45 tables)
│   ├── schemas/                ← Pydantic v2 request/response schemas
│   ├── routers/                ← FastAPI routers (97 endpoints)
│   ├── admin/                  ← SQLAdmin panels
│   ├── workers/                ← Celery app + tasks
│   ├── utils/                  ← email, razorpay, image, redis helpers
│   ├── main.py                 ← FastAPI app factory
│   ├── requirements.txt
│   └── Dockerfile
├── backend_django_archived/    ← Original Django code (READ ONLY — do not delete)
├── fastapi/                    ← Legacy AI microservice (images, photobooth, face)
├── frontend/                   ← Next.js
├── nginx/
├── docker-compose.yml          ← Dev stack
└── docker-compose.prod.yml     ← Production stack
```

---

## 3. Environment Setup

Copy the example env and fill in your values:

```bash
cp .env.example .env   # or copy from backend_django_archived/.env if it exists
```

### Required `.env` variables

```env
# ── Database ──────────────────────────────────────────────────────────────────
DB_NAME=planazo
DB_USER=planazo
DB_PASSWORD=yourpassword
DATABASE_URL=postgresql+asyncpg://planazo:yourpassword@localhost:5432/planazo

# ── Auth ──────────────────────────────────────────────────────────────────────
SECRET_KEY=your-very-long-random-secret-key-here
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30

# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=no-reply@planazo.ai

# ── Razorpay ──────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# ── Media ─────────────────────────────────────────────────────────────────────
MEDIA_ROOT=/app/media
MEDIA_URL=/media/

# ── Frontend ──────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# ── Optional ──────────────────────────────────────────────────────────────────
SENTRY_DSN=
DEBUG=true
ENVIRONMENT=development
```

---

## 4. Run Locally (Docker)

This is the recommended way. One command starts everything.

```bash
cd wedding-project

# Start all services (PostgreSQL, Redis, API, Celery, Frontend, Nginx)
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f api
docker compose logs -f celery_worker

# Stop everything
docker compose down

# Stop and remove volumes (wipes DB — use with care!)
docker compose down -v
```

### Services started by Docker Compose

| Service | URL | Description |
|---------|-----|-------------|
| api | http://localhost:8000 | FastAPI main app |
| fastapi | http://localhost:8001 | AI microservice (face, images) |
| frontend | http://localhost:3000 | Next.js |
| postgres | localhost:5432 | PostgreSQL |
| redis | localhost:6379 | Redis |
| prometheus | http://localhost:9090 | Metrics |
| grafana | http://localhost:3001 | Dashboards (admin/planazo123) |

---

## 5. Run Locally (Without Docker)

### Step 1 — Create virtual environment

```bash
cd wedding-project/app
python3 -m venv venv
source venv/bin/activate          # Linux/Mac
venv\Scripts\activate             # Windows
```

### Step 2 — Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `insightface` and `onnxruntime` require Visual C++ on Windows.
> If they fail, skip them for now — face matching won't work but everything else will.

### Step 3 — Start PostgreSQL and Redis

```bash
# Using Docker just for the backing services:
docker run -d --name pg -e POSTGRES_DB=planazo -e POSTGRES_USER=planazo \
  -e POSTGRES_PASSWORD=planazo123 -p 5432:5432 postgres:16-alpine

docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Step 4 — Set DATABASE_URL for local connections

In your `.env`, change the host from `postgres` to `localhost`:

```env
DATABASE_URL=postgresql+asyncpg://planazo:planazo123@localhost:5432/planazo
```

### Step 5 — Run database migrations

```bash
cd wedding-project

# Option A: Let SQLAlchemy create tables (dev only — no data migration)
python -c "
import asyncio
from app.database.base import engine
from app.models import *
from app.database.base import Base

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(create())
"

# Option B: Use Alembic (recommended for production)
alembic upgrade head
```

### Step 6 — Start the API server

```bash
cd wedding-project

# Development (auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production-like (multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Step 7 — Start Celery worker (separate terminal)

```bash
cd wedding-project
celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
```

---

## 6. Database Migration

### First-time setup on existing database (migrating from Django)

The database already has all Django tables. The FastAPI app reads them directly — **no data migration needed**.

```bash
# Verify your tables exist
psql -U planazo -d planazo -c "\dt"
```

You should see tables like `account_user`, `couple_websites`, `vendor_websites`, etc.

### ⚠️ Birthday tables — verify names before first run

The birthday app models had no `db_table` in Django, so table names were auto-generated.
Run this on your live database to confirm:

```sql
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'birthday%'
ORDER BY tablename;
```

Expected names:
```
birthday_birthdaycountdown
birthday_birthdayevent
birthday_birthdaypage
birthday_birthdayrsvp
birthday_birthdaystory
birthday_birthdaywish
```

If they differ, update `app/models/birthday.py` `__tablename__` values before starting.

### Alembic setup (for future schema changes)

```bash
cd wedding-project

# Initialise (first time only)
alembic init alembic

# Edit alembic/env.py — add these two lines:
# from app.models import *
# from app.database.base import Base
# target_metadata = Base.metadata

# Generate a migration
alembic revision --autogenerate -m "describe your change"

# Apply
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## 7. Admin Panels

Three admin panels replace the original Django Jazzmin + custom admin sites:

| Panel | URL | Access |
|-------|-----|--------|
| Main Admin | http://localhost:8000/admin | ADMIN role or is_superuser |
| Vendor Admin | http://localhost:8000/vendor-admin | ADMIN role |
| Gift Admin | http://localhost:8000/gift-admin | ADMIN role |

Login with your `account_user` email + password.

---

## 8. API Documentation

Available in DEBUG mode only (`DEBUG=true` in `.env`):

| Docs | URL |
|------|-----|
| Swagger UI | http://localhost:8000/api/docs |
| ReDoc | http://localhost:8000/api/redoc |
| OpenAPI JSON | http://localhost:8000/api/openapi.json |
| Health check | http://localhost:8000/health |
| Metrics | http://localhost:8000/metrics |

### Auth flow

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
# Returns: { "access": "...", "refresh": "...", "user": {...} }

# Use token
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 9. Celery Workers

```bash
# Worker (processes tasks)
celery -A app.workers.celery_app worker --loglevel=info

# Beat scheduler (periodic tasks)
celery -A app.workers.celery_app beat --loglevel=info

# Monitor tasks in browser (Flower)
pip install flower
celery -A app.workers.celery_app flower --port=5555
# Open: http://localhost:5555
```

---

## 10. Full Table Reference

All 45 database tables used by the FastAPI app. Table names are identical to the original Django schema — **no data is lost**.

---

### 📁 Account / User (`app/models/user.py`)

#### `account_user`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| email | String(254) | Unique, indexed |
| password | String(128) | PBKDF2 (Django) → bcrypt after first login |
| full_name | String(255) | |
| role | String(20) | USER / VENDOR / ADMIN |
| google_id | String(255) | Unique, nullable |
| phone | String(20) | Unique, nullable |
| avatar_url | String(200) | Nullable |
| is_active | Boolean | Default True |
| is_staff | Boolean | Default False |
| is_superuser | Boolean | Default False |
| last_login | DateTime | Nullable |
| created_at | DateTime | Auto |
| updated_at | DateTime | Auto |

---

### 📁 Invitation (`app/models/invitation.py`)

#### `couple_websites`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| account_id | FK → account_user | |
| theme | String(50) | Default "modern_minimal" |
| couple | String(255) | Couple display name |
| bride_info | String(255) | |
| groom_info | String(255) | |
| thumbnail | String(200) | Nullable |
| is_published | Boolean | |
| views | Integer | Default 0 |
| slug | String(150) | Unique, indexed |
| gallery_token | String(12) | Unique, indexed — used for selfie match |
| created_at | DateTime | Auto |
| updated_at | DateTime | Auto |

#### `bride_groom`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | Unique (one per website) |
| groom_name | String(255) | |
| groom_description | Text | |
| groom_image | String(200) | Nullable |
| groom_instagram | String(200) | Nullable |
| bride_name | String(255) | |
| bride_description | Text | |
| bride_image | String(200) | Nullable |
| bride_instagram | String(200) | Nullable |

#### `stories`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| title | String(255) | |
| image | String(200) | Nullable |
| date | DateTime | Nullable |
| desc | Text | |
| order | Integer | Default 0 |

#### `events`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| title | String(255) | |
| image | String(200) | Nullable |
| date | DateTime | Nullable |
| time | String(100) | |
| desc | Text | |
| location_name | String(255) | |
| location_link | String(200) | Nullable |
| order | Integer | Default 0 |

#### `wedding_countdown`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | Unique |
| heading | String(255) | |
| event_date | DateTime | |
| background_image | String(200) | Nullable |

#### `invitation_rsvps`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| name | String(255) | |
| phone | String(20) | |
| email | String(254) | |
| attendance | String(10) | YES / NO / MAYBE |
| guests | Integer | Default 1 |
| meal_preference | String(20) | |
| message | Text | |
| created_at | DateTime | Auto |

#### `wishes`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| name | String(255) | |
| relationship | String(255) | |
| image | String(200) | Nullable |
| message | Text | |
| verified | Boolean | Default False |
| created_at | DateTime | Auto |

#### `page_visits`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| ip_address | String(39) | IPv4/IPv6 |
| visited_at | DateTime | Auto |

#### `wedding_gallery_photos`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| image | String(200) | |
| thumbnail | String(200) | Nullable |
| tag | String(20) | |
| caption | String(255) | |
| uploader_name | String(100) | Default "Guest" |
| is_approved | Boolean | Default True |
| created_at | DateTime | Auto |

#### `wedding_vendors`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | Unique with vendor_id |
| vendor_id | FK → vendor_websites | |
| service_note | String(255) | |
| order | Integer | Default 0 |
| created_at | DateTime | Auto |

---

### 📁 Vendor (`app/models/vendor.py`)

#### `vendor_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| key | String(30) | Unique slug key |
| name | String(100) | |
| icon_image | String(200) | Nullable |
| description | Text | |
| order | Integer | Default 0 |
| is_active | Boolean | Default True |

#### `vendor_theme_presets`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String(100) | |
| hex_color | String(20) | |
| preview_image | String(200) | Nullable |
| order | Integer | Default 0 |
| is_active | Boolean | Default True |

#### `vendor_websites`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | Indexed |
| account_id | FK → account_user | Unique |
| category_obj_id | FK → vendor_categories | Nullable |
| category | String(20) | Legacy text field |
| theme_preset_id | FK → vendor_theme_presets | Nullable |
| title | String(255) | |
| bio | Text | |
| tagline | String(255) | |
| thumbnail | String(200) | Nullable |
| cover_image | String(200) | Nullable |
| theme_color | String(20) | Default "#C9952A" |
| phone | String(20) | |
| email | String(254) | |
| city | String(100) | |
| address | Text | |
| website | String(200) | Nullable |
| instagram | String(200) | Nullable |
| is_active | Boolean | Default True |
| is_verified | Boolean | Default False |
| slug | String(150) | Unique, indexed |
| created_at | DateTime | Auto |

#### `vendor_portfolio_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | |
| name | String(100) | |
| emoji | String(10) | |
| icon_image | String(200) | Nullable |
| order | Integer | Default 0 |

#### `vendor_packages`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | |
| name | String(100) | |
| price | Numeric(10,2) | |
| description | String(500) | |
| features | JSON | List of strings |
| max_hours | Integer | Nullable |
| delivery_days | Integer | Nullable |
| is_popular | Boolean | Default False |
| allows_custom | Boolean | Default True |
| is_available | Boolean | Default True |
| created_at | DateTime | Auto |

#### `vendor_portfolio`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | |
| category_id | FK → vendor_portfolio_categories | Nullable |
| title | String(255) | |
| picture | String(200) | |
| created_at | DateTime | Auto |

#### `vendor_enquiries`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | |
| name | String(255) | |
| email | String(254) | |
| phone | String(20) | |
| event_date | DateTime | Nullable |
| message | Text | |
| status | String(10) | NEW / READ / REPLIED |
| created_at | DateTime | Auto |

#### `vendor_reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | |
| reviewer_id | FK → account_user | Nullable |
| rating | Integer | 1–5 |
| comment | Text | |
| is_approved | Boolean | Default False |
| created_at | DateTime | Auto |

#### `vendor_subscription_plans`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| tier | String(10) | Unique — FREE/BASIC/PRO/PREMIUM |
| name | String(50) | |
| price_monthly | Numeric(8,2) | |
| price_yearly | Numeric(8,2) | |
| max_packages | Integer | Default 2 |
| max_portfolio_images | Integer | Default 10 |
| featured_placement | Boolean | |
| analytics_access | Boolean | |
| enquiry_management | Boolean | |
| custom_theme | Boolean | |
| priority_support | Boolean | |
| razorpay_plan_id | String(100) | |
| features_list | JSON | |

#### `vendor_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| vendor_id | FK → vendor_websites | Unique |
| plan_id | FK → vendor_subscription_plans | |
| status | String(10) | ACTIVE / EXPIRED / CANCELLED |
| is_yearly | Boolean | |
| razorpay_subscription_id | String(100) | |
| razorpay_payment_id | String(100) | |
| current_period_start | DateTime | |
| current_period_end | DateTime | Nullable |
| created_at | DateTime | Auto |
| updated_at | DateTime | Auto |

#### `vendor_favorites`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → account_user | Unique with vendor_id |
| vendor_id | FK → vendor_websites | |
| created_at | DateTime | Auto |

---

### 📁 Gallery (`app/models/gallery.py`)

#### `gallery_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String(255) | Unique |
| created_at | DateTime | Auto |

#### `gallery_images`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | Indexed |
| website_id | FK → couple_websites | |
| category_id | FK → gallery_categories | Nullable |
| gallery_type | String(20) | INVITATION / PHOTOBOOTH / etc. Indexed |
| title | String(255) | |
| picture | String(200) | File path |
| thumb_small | String(200) | Nullable — 200px thumbnail |
| thumb_medium | String(200) | Nullable — 600px thumbnail |
| face_embedding | JSON | InsightFace 512-dim vector, nullable |
| download_count | Integer | Default 0 |
| slug | String(200) | Unique, indexed |
| uploaded_by_id | FK → account_user | Nullable |
| created_at | DateTime | Auto |
| modified_at | DateTime | Auto |

#### `guest_selfie_matches`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| website_id | FK → couple_websites | |
| selfie | String(200) | Path to uploaded selfie |
| selfie_embedding | JSON | 512-dim face vector |
| status | String(10) | PENDING / PROCESSING / DONE / FAILED |
| error | Text | |
| created_at | DateTime | Auto |

#### `gallery_guestselfie_matched_images` (M2M junction)
| Column | Type | Notes |
|--------|------|-------|
| guestselfie_id | FK → guest_selfie_matches | PK |
| galleryimage_id | FK → gallery_images | PK |

---

### 📁 Gift / Marketplace (`app/models/gift.py`)

#### `gift_sellers`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → account_user | Unique |
| business_name | String(255) | |
| description | Text | |
| logo | String(200) | Nullable |
| phone / email / gstin | String | |
| bank_account | String(30) | |
| ifsc | String(12) | |
| status | String(10) | PENDING / APPROVED / REJECTED |
| commission_pct | Numeric(5,2) | Default 10 |
| created_at | DateTime | Auto |

#### `gift_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String(100) | Unique |
| emoji | String(10) | |
| icon_image | String(200) | Nullable |
| order | Integer | Default 0 |

#### `gift_products`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | Indexed |
| seller_id | FK → gift_sellers | Nullable |
| category_id | FK → gift_categories | Nullable |
| name | String(255) | |
| slug | String(300) | Unique, indexed |
| description | Text | |
| short_desc | String(300) | |
| price | Numeric(10,2) | |
| compare_price | Numeric(10,2) | Nullable |
| image | String(200) | Nullable |
| stock | Integer | Default 100 |
| sku | String(50) | |
| weight_grams | Integer | Nullable |
| tags | JSON | List of strings |
| is_available | Boolean | Default True |
| is_featured | Boolean | Default False |
| is_cod | Boolean | Default True |
| created_at / updated_at | DateTime | Auto |

#### `gift_product_images`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| product_id | FK → gift_products | |
| image | String(200) | |
| order | Integer | Default 0 |

#### `gift_product_variants`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| product_id | FK → gift_products | |
| name | String(100) | |
| sku | String(50) | |
| price | Numeric(10,2) | Nullable (overrides product price) |
| stock | Integer | Default 0 |
| is_active | Boolean | Default True |

#### `gift_product_reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| product_id | FK → gift_products | |
| user_id | FK → account_user | Nullable |
| reviewer_name | String(100) | |
| rating | Integer | 1–5 |
| title / comment | String/Text | |
| is_verified_purchase | Boolean | |
| is_approved | Boolean | Default True |
| created_at | DateTime | Auto |

#### `gift_carts`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → account_user | Nullable |
| session_key | String(100) | For anonymous carts |
| created_at / updated_at | DateTime | Auto |

#### `gift_cart_items`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| cart_id | FK → gift_carts | |
| product_id | FK → gift_products | |
| variant_id | FK → gift_product_variants | Nullable |
| quantity | Integer | Default 1 |
| Unique | (cart_id, product_id, variant_id) | |

#### `gift_orders` (wedding gift from guest to couple)
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| product_id | FK → gift_products | |
| website_id | FK → couple_websites | Nullable |
| sender_name / email / phone | String | |
| message | Text | |
| delivery_type | String(10) | COUPLE / ADDRESS |
| recipient_name / address fields | String | Delivery address |
| amount | Numeric(10,2) | |
| razorpay_order_id | String(100) | Unique |
| razorpay_payment_id | String(100) | |
| status | String(10) | PENDING / PAID / FAILED |
| created_at / updated_at | DateTime | Auto |

#### `gift_marketplace_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → account_user | Nullable |
| buyer_name / email / phone | String | |
| address fields | String | Full shipping address |
| subtotal / shipping_charge / discount / total_amount | Numeric | |
| razorpay_order_id | String(100) | Unique |
| razorpay_payment_id / signature | String | |
| status | String(10) | PENDING / PAID / FAILED |
| order_number | String(20) | Unique — e.g. MKT3F2A1B |
| notes | Text | |
| created_at / updated_at | DateTime | Auto |

#### `gift_marketplace_order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| order_id | FK → gift_marketplace_orders | |
| product_id | FK → gift_products | |
| variant_id | FK → gift_product_variants | Nullable |
| seller_id | FK → gift_sellers | Nullable |
| product_name / variant_name | String | Snapshot at time of order |
| unit_price / quantity / line_total | Numeric/Integer | |
| item_status | String(10) | PENDING / SHIPPED / DELIVERED |
| tracking_url | String(200) | |

#### `gift_scheduled_deliveries`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → account_user | Nullable |
| delivery_type | String(10) | GIFT / POSTCARD |
| product_id | FK → gift_products | Nullable |
| product_qty | Integer | Default 1 |
| postcard_message / template | Text/String | |
| occasion | String(100) | |
| scheduled_date | Date | |
| sender fields | String | Full sender details |
| recipient fields | String | Full recipient + address |
| amount / payment_status | Numeric/String | |
| razorpay_order_id | String(100) | Unique |
| fulfilment_status | String(15) | SCHEDULED / DISPATCHED / DELIVERED |
| tracking_info | Text | |
| dispatched_at | DateTime | Nullable |
| website_id | FK → couple_websites | Nullable |
| is_subscription | Boolean | Default False |
| created_at / updated_at | DateTime | Auto |

---

### 📁 Birthday (`app/models/birthday.py`)

> ⚠️ These table names are Django auto-generated. Verify against your live DB before first run.

#### `birthday_birthdaypage`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | Indexed |
| owner_id | FK → account_user | |
| title | String(255) | |
| slug | String(150) | Unique, indexed |
| honoree_name | String(255) | |
| honoree_image / cover_image | String(200) | Nullable |
| theme | String(50) | Default "classic" |
| theme_color | String(20) | Default "#FF6B6B" |
| bio | Text | |
| is_published | Boolean | Default False |
| views | Integer | Default 0 |
| created_at / updated_at | DateTime | Auto |

#### `birthday_birthdayevent`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| page_id | FK → birthday_birthdaypage | |
| title | String(255) | |
| image / date / time / desc | Various | Event details |
| location_name / location_link | String | |
| order | Integer | Default 0 |

#### `birthday_birthdaystory`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| page_id | FK → birthday_birthdaypage | |
| title | String(255) | |
| image / date / desc / order | Various | |

#### `birthday_birthdaywish`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| page_id | FK → birthday_birthdaypage | |
| name / relationship | String | |
| image | String(200) | Nullable |
| message | Text | |
| verified | Boolean | Default False |
| created_at | DateTime | Auto |

#### `birthday_birthdayrsvp`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| page_id | FK → birthday_birthdaypage | |
| name / phone / email | String | |
| attendance | String(10) | YES / NO / MAYBE |
| guests / meal_preference / message | Various | |
| created_at | DateTime | Auto |

#### `birthday_birthdaycountdown`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| page_id | FK → birthday_birthdaypage | Unique |
| heading | String(255) | |
| event_date | DateTime | |
| background_image | String(200) | Nullable |

---

### 📁 Payment (`app/models/payment.py`)

#### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| account_id | FK → account_user | Unique |
| plan | String(10) | FREE / BASIC / PRO / PREMIUM |
| status | String(10) | ACTIVE / EXPIRED / CANCELLED |
| razorpay_subscription_id | String(100) | |
| razorpay_payment_id | String(100) | |
| is_yearly | Boolean | |
| current_period_start / end | DateTime | |
| cancel_at_period_end | Boolean | Default False |
| created_at / updated_at | DateTime | Auto |

#### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| subscription_id | FK → subscriptions | Nullable |
| account_id | FK → account_user | Nullable |
| amount | Numeric(10,2) | |
| currency | String(10) | Default "INR" |
| razorpay_order_id | String(100) | Unique |
| razorpay_payment_id / signature | String | |
| status | String(10) | PENDING / SUCCESS / FAILED |
| description | String(255) | |
| created_at | DateTime | Auto |

---

## Quick Commands Reference

```bash
# Check API is running
curl http://localhost:8000/health

# Tail API logs (Docker)
docker compose logs -f api

# Open Django-era Postgres shell
docker compose exec postgres psql -U planazo -d planazo

# Rebuild only the API container
docker compose up --build api

# Run a one-off Python script inside container
docker compose exec api python -c "from app.core.config import settings; print(settings.DATABASE_URL)"

# List all tables in DB
docker compose exec postgres psql -U planazo -d planazo -c "\dt" | sort
```
