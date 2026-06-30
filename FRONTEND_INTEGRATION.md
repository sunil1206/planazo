# Planazo — Frontend Integration Guide

This document tells the **frontend developer** exactly what to copy, what to configure, and how every API endpoint works.

---

## Architecture Overview

```
Your Frontend Repo          This Backend Repo (planazo/)
────────────────────        ────────────────────────────
React / Next.js / Vite  →   FastAPI on port 8000
   calls REST APIs      ←   PostgreSQL + Redis
   uploads files        →   S3 / Cloudflare R2
   real-time?           →   (WebSocket — Phase 3, not yet)
```

```
Browser
  │
  ├──▶ http://localhost:8000/api/*     ← ALL API calls go here
  ├──▶ http://localhost:8000/media/*   ← local dev media files
  └──▶ http://localhost:8001/*         ← AI / face-recognition (optional)
```

In production, everything goes through **nginx on port 80** which proxies to the right service.

---

## What to Copy Into Your Frontend Repo

Copy **only** these — nothing else from this repo belongs in the frontend.

```
planazo/
└── frontend/
    ├── lib/
    │   ├── api.ts              ← Axios API client (base URL, auth header injection)
    │   ├── auth.ts             ← JWT token helpers (store, refresh, decode)
    │   └── marketplace/
    │       ├── api.ts          ← marketplace-specific fetch helpers
    │       └── types.ts        ← TypeScript types for marketplace
    │
    ├── stores/
    │   └── authStore.ts        ← Zustand store: login/logout/token/user state
    │
    └── src/
        └── shims/              ← Only if you use Next.js → Vite migration
            ├── next/
            │   ├── link.tsx
            │   ├── navigation.ts
            │   ├── image.tsx
            │   └── font.ts
            └── next-auth.ts
```

**If your frontend uses a different framework or you start fresh, you only need:**
- `lib/api.ts` — adapt the base URL to your env variable name
- `stores/authStore.ts` — adapt to your state management (Zustand, Redux, Context)

---

## Environment Variables

Create a `.env.local` (or `.env`) in your frontend repo:

```env
# Point to the running backend
VITE_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# AI microservice (face recognition, photobooth)
VITE_FASTAPI_URL=http://localhost:8001
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001

# Razorpay (get test keys from dashboard.razorpay.com)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

In production replace `localhost:8000` with your actual domain.

---

## Authentication Flow

**JWT — Bearer token in every request header.**

### Register
```
POST /api/auth/register
Body: { email, password, full_name }
Returns: { access_token, refresh_token, token_type: "bearer" }
```

### Login
```
POST /api/auth/login
Body: { email, password }   (form data, not JSON)
Returns: { access_token, refresh_token, token_type: "bearer" }
```

### Google OAuth
```
POST /api/auth/google
Body: { id_token: "<google id token from frontend google sign-in>" }
Returns: { access_token, refresh_token, token_type: "bearer" }
```

### Refresh token
```
POST /api/auth/token/refresh
Body: { refresh_token }
Returns: { access_token }
```

### Get / Update current user
```
GET  /api/auth/me       → { id, email, full_name, role, avatar_url, ... }
PUT  /api/auth/me       Body: { full_name, avatar_url, ... }
POST /api/auth/logout   → clears session
```

### Send / Verify OTP (phone)
```
POST /api/auth/send-otp    Body: { phone }
POST /api/auth/verify-otp  Body: { phone, otp }
```

### Password reset
```
POST /api/auth/forgot-password   Body: { email }
POST /api/auth/reset-password    Body: { token, new_password }
POST /api/auth/change-password   Body: { old_password, new_password }
```

### How to send auth in every request
```js
// axios example
axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// fetch example
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
```

**Token expiry:** access token = 15 min, refresh token = 30 days.
Call `/api/auth/token/refresh` automatically when you get a 401.

---

## Module 1 — Wedding Invitations

Base prefix: `/api/invitations`

```
GET    /api/invitations/websites/                    List my wedding websites
POST   /api/invitations/websites/                    Create website
GET    /api/invitations/websites/{slug}/             Public wedding page (no auth)
PUT    /api/invitations/websites/{slug}/             Update website

GET    /api/invitations/websites/{slug}/bridegroom/  Get bride & groom info
POST   /api/invitations/websites/{slug}/bridegroom/  Set bride & groom info

GET    /api/invitations/websites/{slug}/stories/     Love story list
POST   /api/invitations/websites/{slug}/stories/     Add story
PUT    /api/invitations/websites/{slug}/stories/{id}/ Edit story
DELETE /api/invitations/websites/{slug}/stories/{id}/ Delete story

GET    /api/invitations/websites/{slug}/events/      Events (ceremony, reception...)
POST   /api/invitations/websites/{slug}/events/      Add event
PUT    /api/invitations/websites/{slug}/events/{id}/ Edit event
DELETE /api/invitations/websites/{slug}/events/{id}/ Delete event

GET    /api/invitations/websites/{slug}/countdown/   Countdown to wedding
POST   /api/invitations/websites/{slug}/countdown/   Set countdown

GET    /api/invitations/websites/{slug}/rsvps/       View RSVPs (auth required)
POST   /api/invitations/websites/{slug}/rsvps/       Submit RSVP (no auth)

GET    /api/invitations/websites/{slug}/wishes/      View wishes (no auth)
POST   /api/invitations/websites/{slug}/wishes/      Submit wish (no auth)

POST   /api/invitations/websites/{slug}/visit/       Log page visit (analytics)
```

**Available wedding themes** (pass as `theme` field when creating a website):
`modern_minimal` | `floral_pastel` | `cinematic_dark` | `royal_mughal` | `kerala_traditional` | `luxury_wedding`

---

## Module 2 — Gallery (v1 — basic)

Base prefix: `/api/gallery`

```
GET    /api/gallery/categories/                 Gallery categories
GET    /api/gallery/{gallery_token}/images/     Public gallery by token (no auth)
POST   /api/gallery/{gallery_token}/upload/     Upload image (multipart/form-data)
DELETE /api/gallery/images/{image_id}/          Delete image

POST   /api/gallery/selfie-match/              Upload guest selfie → find matches
GET    /api/gallery/selfie-match/{match_id}/   Poll match status
```

`gallery_token` comes from the `CoupleWebsite` object.

---

## Module 3 — Gallery v2 (albums, AI, likes, comments)

Base prefix: `/api/gallery/v2`

```
# Albums
GET    /api/gallery/v2/{website_id}/albums/              List albums
POST   /api/gallery/v2/{website_id}/albums/              Create album
PATCH  /api/gallery/v2/{website_id}/albums/{album_id}/   Update album
DELETE /api/gallery/v2/{website_id}/albums/{album_id}/   Delete album

# Images (filterable)
GET    /api/gallery/v2/{website_id}/images/
  ?album_id=     filter by album
  ?media_type=   IMAGE | VIDEO
  ?ai_scene=     e.g. "ceremony"
  ?is_featured=  true | false
  ?is_highlighted= true | false
  ?page=1&page_size=40

PATCH  /api/gallery/v2/images/{image_id}/    Approve / pin / hide / move album
DELETE /api/gallery/v2/images/{image_id}/    Delete image + removes from storage

# Upload flow (S3/R2 presigned — 2 steps):
# 1. Get presigned URL
POST   /api/storage/presign/
  Body: { key: "gallery/abc.jpg", content_type: "image/jpeg" }
  Returns: { upload_url, key, cdn_url }
# 2. PUT the file directly to upload_url from browser
# 3. Tell backend the upload is done
PATCH  /api/gallery/v2/images/{image_id}/
  Body: { storage_key: "gallery/abc.jpg", cdn_url: "...", is_approved: true }

# Approval workflow (admin/organizer)
GET    /api/gallery/v2/{website_id}/pending/        Images awaiting approval
POST   /api/gallery/v2/{website_id}/bulk-approve/   Body: [1, 2, 3]  (image IDs)

# Likes (guests can like without login)
POST   /api/gallery/v2/images/{image_id}/like/
  Body: { guest_name: "Priya" }   (optional if authenticated)
DELETE /api/gallery/v2/images/{image_id}/like/

# Comments
GET    /api/gallery/v2/images/{image_id}/comments/
POST   /api/gallery/v2/images/{image_id}/comments/
  Body: { text: "Beautiful!", guest_name: "optional if not logged in" }
DELETE /api/gallery/v2/images/{image_id}/comments/{comment_id}/
```

---

## Module 4 — Vendor Marketplace

Base prefix: `/api/vendors`

```
# Public browsing (no auth)
GET    /api/vendors/categories/          Vendor categories (photographer, caterer...)
GET    /api/vendors/themes/              Theme presets
GET    /api/vendors/plans/               Subscription plans
GET    /api/vendors/                     Vendor listing
  ?category=   filter by category key
  ?city=       filter by city
  ?page=&page_size=
GET    /api/vendors/{slug}/              Vendor public profile
POST   /api/vendors/{slug}/enquire/      Send enquiry (no auth)
  Body: { name, email, phone, message, event_date }
POST   /api/vendors/{slug}/review/       Post review (auth required)
  Body: { rating, review_text }

# Favorites (auth required)
GET    /api/vendors/favorites/
POST   /api/vendors/favorites/{vendor_id}/
DELETE /api/vendors/favorites/{vendor_id}/

# Vendor dashboard (auth + vendor role)
GET    /api/vendors/website/             My vendor profile
POST   /api/vendors/website/             Create vendor profile
PUT    /api/vendors/website/             Update vendor profile

GET    /api/vendors/website/packages/          My packages
POST   /api/vendors/website/packages/          Add package
PUT    /api/vendors/website/packages/{id}/     Edit package
DELETE /api/vendors/website/packages/{id}/     Delete package

GET    /api/vendors/website/portfolio-categories/   Portfolio categories
POST   /api/vendors/website/portfolio-categories/   Add category
GET    /api/vendors/website/portfolio/              Portfolio images
DELETE /api/vendors/website/portfolio/{id}/         Delete portfolio image
```

---

## Module 5 — Gift Shop & Marketplace

Base prefix: `/api/gifts`

```
# Public (no auth)
GET    /api/gifts/categories/            Gift categories
GET    /api/gifts/products/              Product listing
  ?category_id=&search=&min_price=&max_price=&page=
GET    /api/gifts/products/{slug}/       Product detail

# Reviews (auth required)
POST   /api/gifts/products/{slug}/reviews/
  Body: { rating, title, body }

# Gift order (simple single product)
POST   /api/gifts/orders/
  Body: { product_id, variant_id, sender_name, sender_email,
          recipient_name, recipient_email, message,
          delivery_type: "EMAIL"|"WHATSAPP"|"SCHEDULED" }
  Returns: { razorpay_order_id, amount, currency, key_id }
POST   /api/gifts/orders/{order_id}/verify/
  Body: { razorpay_payment_id, razorpay_signature }

# Cart (auth required)
GET    /api/gifts/cart/
POST   /api/gifts/cart/
  Body: { product_id, variant_id, quantity }
DELETE /api/gifts/cart/{item_id}/

# Marketplace checkout (cart → order)
POST   /api/gifts/marketplace/checkout/     Creates Razorpay order for full cart
POST   /api/gifts/marketplace/verify/       Verify payment + clear cart
GET    /api/gifts/marketplace/orders/       My past orders

# Scheduled delivery
POST   /api/gifts/scheduled/
  Body: { product_id, recipient_name, recipient_email, scheduled_date, message }
GET    /api/gifts/scheduled/

# Seller profile (become a seller)
GET    /api/gifts/seller/           My seller profile
POST   /api/gifts/seller/           Apply to become a seller
  Body: { business_name, gst_number, bank_account, ifsc_code, address }
```

### Seller Dashboard (approved sellers only)

Base prefix: `/api/gifts/seller`

```
GET    /api/gifts/seller/dashboard/                       Stats summary
GET    /api/gifts/seller/products/                        My products
POST   /api/gifts/seller/products/                        Create product
PATCH  /api/gifts/seller/products/{id}/                   Edit product
DELETE /api/gifts/seller/products/{id}/                   Soft-delete product
PATCH  /api/gifts/seller/products/{id}/stock/?stock=50    Update stock
GET    /api/gifts/seller/orders/                          Incoming orders
PATCH  /api/gifts/seller/orders/{id}/status/?status=SHIPPED  Update status
```

---

## Module 6 — Birthday Pages

Base prefix: `/api/birthday`

```
GET    /api/birthday/pages/                    My birthday pages
POST   /api/birthday/pages/                    Create birthday page
GET    /api/birthday/pages/{slug}/             Public page (no auth)
PUT    /api/birthday/pages/{slug}/             Update page

POST   /api/birthday/pages/{slug}/events/              Add event
PUT    /api/birthday/pages/{slug}/events/{id}/         Edit event
DELETE /api/birthday/pages/{slug}/events/{id}/         Delete event

POST   /api/birthday/pages/{slug}/stories/             Add story
PUT    /api/birthday/pages/{slug}/stories/{id}/        Edit story
DELETE /api/birthday/pages/{slug}/stories/{id}/        Delete story

GET    /api/birthday/pages/{slug}/wishes/              View wishes (no auth)
POST   /api/birthday/pages/{slug}/wishes/              Post a wish (no auth)
GET    /api/birthday/pages/{slug}/rsvps/               View RSVPs (auth required)
POST   /api/birthday/pages/{slug}/rsvps/               Submit RSVP (no auth)
POST   /api/birthday/pages/{slug}/countdown/           Set countdown
POST   /api/birthday/pages/{slug}/visit/               Log visit
```

---

## Module 7 — Payments & Subscriptions

Base prefix: `/api/payment`

```
GET    /api/payment/subscription/          My current subscription
POST   /api/payment/subscription/create/   Create Razorpay subscription order
  Body: { plan_id }
  Returns: { razorpay_order_id, amount, currency, key_id }
POST   /api/payment/subscription/verify/   Verify subscription payment
  Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_id }

GET    /api/payment/transactions/          Transaction history
```

### Razorpay Payment Integration Pattern

```js
// 1. Create order on backend
const { razorpay_order_id, amount, currency, key_id } = await api.post('/api/gifts/orders/', body)

// 2. Open Razorpay checkout
const rzp = new Razorpay({
  key: key_id,                        // from backend
  amount: amount,                     // in paise
  currency: currency,
  order_id: razorpay_order_id,
  handler: async (response) => {
    // 3. Verify on backend
    await api.post('/api/gifts/orders/{order_id}/verify/', {
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    })
  }
})
rzp.open()
```

---

## Module 8 — Event Permissions (RBAC)

Base prefix: `/api/permissions`

```
GET    /api/permissions/me/                               Events I have access to
GET    /api/permissions/{event_type}/{event_id}/          All members of an event
POST   /api/permissions/{event_type}/{event_id}/          Grant access
  Body: { user_email, role, can_upload, can_edit, ... }
  event_type: WEDDING | BIRTHDAY | CORPORATE | TRIP
PATCH  /api/permissions/{event_type}/{event_id}/{perm_id}/ Update role/capabilities
DELETE /api/permissions/{event_type}/{event_id}/{perm_id}/ Revoke access

POST   /api/permissions/accept/{token}/   Accept an invite (user must be logged in)
```

**Roles:** `OWNER` | `CO_OWNER` | `ORGANIZER` | `PHOTOGRAPHER` | `VIDEOGRAPHER` | `FAMILY` | `VENDOR` | `GUEST` | `VIEWER`

---

## Module 9 — Photographer Directory

Base prefix: `/api/photographer`

```
# Public directory (no auth)
GET    /api/photographer/directory/              Browse photographers
  ?city=Mumbai&page=1&page_size=20
GET    /api/photographer/directory/{id}/         Photographer profile

# Photographer account (role = PHOTOGRAPHER)
GET    /api/photographer/profile/                My profile
POST   /api/photographer/profile/               Create profile
PATCH  /api/photographer/profile/               Update profile

GET    /api/photographer/assignments/            My event assignments
PATCH  /api/photographer/assignments/{id}/accept/
PATCH  /api/photographer/assignments/{id}/decline/

# Assign photographer to event (event owner)
POST   /api/photographer/assign/
  Body: { photographer_id, event_type, event_id, shoot_date, notes }
```

---

## Module 10 — Storage (S3 / R2 Upload)

```
POST   /api/storage/presign/
  Body: { key: "gallery/wedding-123/photo.jpg", content_type: "image/jpeg" }
  Returns: { upload_url, key, cdn_url, expires_in }

# Then PUT file directly from browser to upload_url (no backend involved)
# CORS must be configured on S3/R2 bucket

# Local dev only (STORAGE_BACKEND=local):
POST   /api/storage/local-upload/?key=gallery/photo.jpg
  Body: multipart file
```

---

## Common Response Formats

### Success
```json
{ "id": 1, "field": "value", ... }
```

### List
```json
[{ "id": 1, ... }, { "id": 2, ... }]
```

### Error
```json
{ "detail": "Not found" }
```
or for validation errors:
```json
{ "detail": [{ "loc": ["body", "email"], "msg": "invalid email", "type": "value_error" }] }
```

### Auth error
```json
HTTP 401 — { "detail": "Not authenticated" }
HTTP 403 — { "detail": "You do not have access to this event" }
```

---

## User Roles

| Role | Can Do |
|---|---|
| `USER` | Default. Access own resources, public pages, RSVP, wishes |
| `VENDOR` | Manage vendor profile, packages, portfolio |
| `PHOTOGRAPHER` | Photographer profile, accept/decline assignments |
| `ADMIN` | Full access to everything |

Role is returned in `GET /api/auth/me` → `role` field. Check it to show/hide UI sections.

---

## CORS

The backend allows requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:80`

For production add your domain to `CORS_ALLOWED_ORIGINS` in `.env`.

---

## Media Files (dev)

Images uploaded in local mode are served at:
```
http://localhost:8000/media/{filename}
```

In production they come from the CDN URL (`S3_CDN_URL`).

---

## Quick Test (without building anything)

Once the backend is running (`docker compose up -d`), open:

```
http://localhost:8000/api/docs     ← Interactive Swagger UI (full API explorer)
http://localhost:8000/api/redoc    ← ReDoc alternative
```

These only work in dev mode (`DEBUG=True` in `.env`). Enable by adding `DEBUG=True` to `.env` and restarting the api container.

---

## Summary: What You Need to Start

1. Copy `lib/api.ts` and `stores/authStore.ts` from this repo into yours
2. Set `VITE_API_URL=http://localhost:8000` in your `.env.local`
3. Run `docker compose up -d` in **this** repo to start the backend
4. Call `POST /api/auth/register` to create a user
5. Call `POST /api/auth/login` to get a token
6. Add `Authorization: Bearer <token>` to all authenticated requests
7. Visit `http://localhost:8000/api/docs` to explore all endpoints interactively
