# Snapshare — QA Testing Checklist & URL Reference
> Generated: April 2026 | Base URL: http://localhost (nginx) or http://localhost:3000 (direct)

---

## ⚡ Quick Start (Docker)
```bash
cd wedding-project
docker compose up --build        # first run
docker compose up                # subsequent runs
# Frontend HMR: changes auto-reflect in browser via polling
# If HMR still not working: docker compose restart frontend
```

---

## 🔐 Authentication

| URL | Method | Auth Required | Expected |
|-----|--------|---------------|----------|
| `/login` | GET | No | Login page with 3 tabs: Google / Email / Phone OTP |
| `/register` | GET | No | Registration page (Couple or Vendor role) |

### Login options
| Option | How to test | Notes |
|--------|-------------|-------|
| **Google** | Click "Continue with Google" | Requires `GOOGLE_CLIENT_ID` in `.env` |
| **Email** | Enter credentials, click Sign In | Real Django user required |
| **Phone OTP** | Enter +91XXXXXXXXXX → Send OTP → Enter code | Dev mode: OTP shown in the UI panel. Production: Twilio SMS |
| **Dev bypass** | 3 buttons: Couple / Vendor / Seller | UI navigation only — NO backend calls work |

---

## 🏠 Public Pages (no login required)

| URL | Status | What to verify |
|-----|--------|----------------|
| `/` | ✅ | Landing page — hero, features, vendor marquee, CTA |
| `/vendors` | ✅ | Vendor listing with search + category filters |
| `/vendors/[slug]` | ✅ | Vendor public profile page |
| `/shop` | ✅ | Marketplace product grid with cart |
| `/shop/product/[slug]` | ✅ | Product detail with reviews, add to cart |
| `/planner` | ✅ | AI wedding planner wizard (4 steps) |
| `/invite/[slug]` | ✅ | Public couple invitation page with RSVP |
| `/invite/[slug]/gallery` | ✅ | Public wedding gallery |
| `/invite/[slug]/gifts` | ✅ | Gift registry listing |
| `/invite/[slug]/gifts/[productId]` | ✅ | Gift product detail + purchase |
| `/birthday/[slug]` | ✅ | Birthday invitation public page |
| `/birthday/[slug]/gifts` | ✅ | Birthday gift products |
| `/birthday/[slug]/gifts/[productId]` | ✅ | Birthday gift product detail |

---

## 👫 Couple Dashboard (real login required)

| URL | Status | Auth | What to verify |
|-----|--------|------|----------------|
| `/dashboard/overview` | ✅ | Couple | Stats cards, planning progress, quick links |
| `/dashboard/invites` | ✅ | Couple | List of invitations created |
| `/dashboard/edit/[id]` | ✅ | Couple | Full invitation editor (details, stories, events, countdown) |
| `/dashboard/gallery-v2` | ✅ | Couple | Upload photos, AI selfie match — **requires real login** |
| `/dashboard/gallery` | ➡️ | Couple | Redirects to `/dashboard/gallery-v2` |
| `/dashboard/guests` | ✅ | Couple | Guest list: add, import CSV, RSVP status |
| `/dashboard/budget` | ✅ | Couple | Budget tracker: add/edit expenses |
| `/dashboard/checklist` | ✅ | Couple | Wedding checklist items |
| `/dashboard/vendor-manager` | ✅ | Couple | My vendors tracker (localStorage) |
| `/dashboard/birthdays` | ✅ | Couple | Birthday invitations list |
| `/dashboard/birthdays/edit/[id]` | ✅ | Couple | Birthday invitation editor |
| `/dashboard/settings` | ✅ | Couple | Account settings, plan info |
| `/dashboard/invitations` | ➡️ | — | Redirects to `/dashboard/invites` |

---

## 🎪 Vendor Hub (real login, role=VENDOR required)

| URL | Status | Auth | What to verify |
|-----|--------|------|----------------|
| `/vendor/portfolio` | ✅ | Vendor | Portfolio editor — **profile creation requires real login** |
| `/vendor/packages` | ✅ | Vendor | Package builder (title, price, inclusions) |
| `/vendor/enquiries` | ✅ | Vendor | Incoming enquiry messages |
| `/vendor/subscription` | ✅ | Vendor | Subscription plans, Razorpay upgrade |

---

## 🛍️ Seller Hub (real login, role=VENDOR required)

| URL | Status | Auth | What to verify |
|-----|--------|------|----------------|
| `/seller` | ✅ | Vendor | Analytics dashboard |
| `/seller/setup` | ✅ | Vendor | Seller store setup (first-time) |
| `/seller/products` | ✅ | Vendor | Product CRUD, image upload |
| `/seller/orders` | ✅ | Vendor | Order management |
| `/seller/analytics` | ✅ | Vendor | Sales charts |
| `/seller/marketplace` | ✅ | Vendor | Marketplace overview |

---

## 🔧 Known Issues & Fixes Applied This Session

| # | Issue | Fix Applied | Restart Needed? |
|---|-------|-------------|-----------------|
| HMR | Frontend changes not refreshing in Docker | Added `HOSTNAME=0.0.0.0` to docker-compose, explicit nginx WebSocket route for `/_next/webpack-hmr` | `docker compose restart nginx frontend` |
| AI Selfie | InsightFace not installed → 500 on `/api/v1/ai/selfie-match` | Added `insightface==0.7.3` + `onnxruntime==1.19.2` to both `fastapi/requirements.txt` and `backend/requirements.txt`. Added graceful 503 fallback + singleton model loader. | `docker compose build fastapi celery_worker` |
| Image Upload | Silent failure when using dev bypass tokens | Now shows clear error: "Image upload requires real login" | No restart needed |
| Vendor Create | Confusing error when using dev bypass | Now shows "Real Login Required" screen with sign-in link | No restart needed |
| Phone OTP | No third login option | Added Phone OTP tab on login page. Backend: `POST /api/auth/otp/send/` + `POST /api/auth/otp/verify/` with Redis TTL | `docker compose build django` + `docker compose restart django` |
| DB Migration | `phone` field missing from User model | Added migration `0002_user_phone.py` | `docker compose exec django python manage.py migrate` |

---

## 🚀 API Endpoints Reference

### Authentication (`/api/auth/`)
| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/auth/register/` | POST | No | `{ email, password, full_name, role }` |
| `/api/auth/login/` | POST | No | `{ email, password }` → JWT |
| `/api/auth/google/` | POST | No | `{ id_token }` → JWT |
| `/api/auth/otp/send/` | POST | No | `{ phone }` → sends SMS, returns `dev_otp` in dev |
| `/api/auth/otp/verify/` | POST | No | `{ phone, otp, full_name?, role? }` → JWT |
| `/api/auth/refresh/` | POST | No | `{ refresh }` → new access token |
| `/api/auth/me/` | GET/PATCH | ✅ | Current user profile |

### Gallery (`/api/gallery/`)
| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/gallery/images/` | GET/POST | ✅ | List/upload photos (FormData: `picture`, `website`) |
| `/api/gallery/images/{id}/download/` | POST | ✅ | Increment download count, get URL |
| `/api/gallery/selfie/` | POST | No | Create selfie match job (Celery async) |
| `/api/gallery/selfie/{id}/` | GET | No | Poll selfie match status |
| `/api/gallery/public/{slug}/` | GET | No | Public gallery for a wedding |

### FastAPI AI (`/api/v1/ai/`)
| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/v1/ai/face-embed` | POST | No | Extract face embedding from image |
| `/api/v1/ai/selfie-match` | POST | No | Direct face match (requires InsightFace loaded) |
| `/api/v1/ai/health` | GET | No | Check InsightFace readiness |

### FastAPI Images (`/api/v1/images/`)
| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/v1/images/upload` | POST | No | Upload + EXIF strip + JPEG convert |
| `/api/v1/images/remove-bg` | POST | No | Background removal (rembg) |
| `/api/v1/images/watermark` | POST | No | Add watermark overlay |

---

## 🧪 Testing Checklist (step by step)

### 1. Docker startup
- [ ] `docker compose up` starts without errors
- [ ] http://localhost returns landing page
- [ ] http://localhost/api/auth/me/ returns 401 (not 500/502)
- [ ] http://localhost/api/v1/ai/health returns `{"status":"ok","ready":true}` *(may be "loading" on first run while model downloads)*

### 2. Registration & Login
- [ ] Register a new couple account (email + password)
- [ ] Register a new vendor account
- [ ] Log in with email/password
- [ ] Log in with phone OTP (check `dev_otp` in response in dev mode)
- [ ] Google login (if GOOGLE_CLIENT_ID configured)

### 3. Couple Dashboard
- [ ] `/dashboard/overview` loads with stats
- [ ] Create a new invitation at `/dashboard/invites`
- [ ] Edit invitation details at `/dashboard/edit/{id}`
- [ ] Upload a photo at `/dashboard/gallery-v2` (must be logged in properly)
- [ ] AI selfie match returns results after photos are processed
- [ ] Add a guest at `/dashboard/guests`
- [ ] Add a budget item at `/dashboard/budget`
- [ ] Check a checklist item at `/dashboard/checklist`

### 4. Vendor Hub
- [ ] Log in as a vendor
- [ ] Create vendor profile at `/vendor/portfolio` (first time → setup form)
- [ ] Add a package at `/vendor/packages`
- [ ] View enquiries at `/vendor/enquiries`

### 5. Seller Hub
- [ ] Complete seller setup at `/seller/setup`
- [ ] Add a product with image at `/seller/products`
- [ ] Check order management at `/seller/orders`

### 6. Mobile Responsiveness
- [ ] Landing page — hamburger menu opens on mobile
- [ ] Dashboard — sidebar becomes bottom tab bar on mobile
- [ ] Budget — cards layout on mobile (not table)
- [ ] Guests — card layout with RSVP dropdown on mobile
- [ ] Vendor hub — bottom tab bar on mobile
- [ ] Seller hub — bottom tab bar on mobile
- [ ] Planner — 2-col theme grid on mobile

### 7. HMR (Hot Module Replacement)
- [ ] Edit any `.tsx` file in `frontend/app`
- [ ] Save the file
- [ ] Browser should auto-refresh within 2–3 seconds
- [ ] If not: check `docker compose logs frontend` for webpack polling messages

---

## 🛠️ Environment Variables (.env)

```env
# Database
DB_NAME=snapshare
DB_USER=snapshare
DB_PASSWORD=snapshare123
DB_HOST=postgres
DB_PORT=5432

# Auth
SECRET_KEY=your-django-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001

# SMS OTP (optional — dev mode works without this)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890

# Payments (optional)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

---

## 📱 Mobile Test Devices / Breakpoints

| Breakpoint | CSS | Device |
|------------|-----|--------|
| < 640px | default | iPhone SE, small Android |
| 640–768px | `sm:` | iPhone 14, large Android |
| 768–1024px | `md:` | iPad portrait |
| 1024px+ | `lg:` | iPad landscape, desktop |

---

*Last updated: 2026-04-24*
