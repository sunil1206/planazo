# Snapshare — Complete Setup Guide

## Prerequisites
- Docker + Docker Compose installed
- Node.js 20+ (for frontend dev)
- Python 3.12+ (for local backend dev)
- Git

---

## Step 1: Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/snapshare.git
cd snapshare

# Copy env file and fill in values
cp .env.example .env
# Edit .env with your values (Google OAuth, DB passwords, etc.)
```

---

## Step 2: Google OAuth Setup (5 min)

1. Go to https://console.cloud.google.com
2. Create project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Application type: Web Application
4. Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`
5. Copy Client ID + Secret → paste in `.env`

---

## Step 3: Start All Services (Backend)

```bash
# Start everything: Postgres, Redis, Django, FastAPI, Celery, Nginx
docker compose up -d

# Run Django migrations
docker compose exec django python manage.py migrate

# Create superuser for Django Admin
docker compose exec django python manage.py createsuperuser

# (Optional) Load sample gallery categories
docker compose exec django python manage.py shell -c "
from apps.gallery.models import GalleryCategory
for name in ['Ceremony', 'Reception', 'Pre-Wedding', 'Candids', 'Family']:
    GalleryCategory.objects.get_or_create(name=name)
print('Categories created')
"
```

### Verify services running:
- Django Admin:  http://localhost:8000/admin
- FastAPI Docs:  http://localhost:8001/docs
- Django API:    http://localhost:8000/api/auth/me/
- Nginx:         http://localhost:80

---

## Step 4: Start Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000 etc.
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Step 5: Test the Full Flow

1. Open http://localhost:3000/register
2. Register as COUPLE with email/password OR Google
3. Create your first invitation at /dashboard/invitations
4. Set theme, couple names, upload thumbnail → Save & Publish
5. Open http://localhost:3000/invite/{your-slug}
6. Test RSVP and Wishes

---

## Step 6: Upload Watermark Logo (Optional)

```bash
# Place your logo.png in the media/watermark folder
docker compose exec django mkdir -p /app/media/watermark
# Copy your logo into the container
docker cp ./your-logo.png snapshare-django-1:/app/media/watermark/logo.png
```

---

## API Endpoints Quick Reference

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register/ | Email + password registration |
| POST | /api/auth/login/ | Email login → JWT |
| POST | /api/auth/google/ | Google token exchange → JWT |
| POST | /api/auth/refresh/ | Refresh JWT |
| GET  | /api/auth/me/ | Current user info |

### Invitations
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | /api/invitations/ | List / Create |
| GET/PATCH/DELETE | /api/invitations/{id}/ | Detail |
| POST | /api/invitations/{id}/bridegroom/ | Set bride/groom info |
| POST | /api/invitations/{id}/stories/ | Add story |
| POST | /api/invitations/{id}/events/ | Add event |
| GET | /api/invitations/invite/{slug}/ | Public page (no auth) |
| POST | /api/invitations/invite/{slug}/rsvp/ | Submit RSVP |
| POST | /api/invitations/invite/{slug}/wish/ | Leave a wish |

### Gallery
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/gallery/public/{slug}/ | Public gallery |
| POST | /api/gallery/images/ | Upload image (owner) |
| POST | /api/gallery/images/{id}/download/ | Download + track |
| POST | /api/gallery/selfie/ | Submit selfie for matching |
| GET  | /api/gallery/selfie/{id}/ | Poll match status |

### Vendors
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/vendors/?category=PHOTOGRAPHER&city=Kochi | List vendors |
| GET | /api/vendors/{slug}/ | Vendor detail + portfolio |
| POST | /api/vendors/{slug}/enquire/ | Send enquiry |
| POST | /api/vendors/{slug}/review/ | Leave review |

### FastAPI (Image Processing)
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/v1/images/upload | Upload + compress image |
| POST | /api/v1/images/remove-bg | Remove background |
| POST | /api/v1/images/watermark | Add watermark |
| POST | /api/v1/ai/face-embed | Extract face embedding |
| POST | /api/v1/ai/selfie-match | Match selfie to gallery |

---

## Directory Structure

```
snapshare/
├── backend/               # Django — auth, models, REST API
│   ├── core/              # Settings (base/dev/prod), urls, wsgi
│   ├── apps/
│   │   ├── account/       # Custom User model, JWT auth, Google OAuth
│   │   ├── invitation/    # CoupleWebsite, BrideGroom, Events, RSVP, Wishes
│   │   ├── gallery/       # GalleryImage, SelfieMatch, Celery tasks
│   │   ├── vendor/        # VendorWebsite, Portfolio, Enquiry, Review
│   │   └── payment/       # Subscription, Transaction, Razorpay webhook
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── fastapi/               # FastAPI — image processing, AI, photobooth
│   ├── main.py
│   ├── routers/
│   │   ├── images.py      # Upload, remove-bg, watermark
│   │   ├── ai.py          # Face embedding, selfie match
│   │   └── photobooth.py  # WebSocket + HTTP upload
│   ├── workers/
│   │   └── celery_app.py
│   └── Dockerfile
│
├── frontend/              # Next.js 14 — all UI
│   ├── app/
│   │   ├── (auth)/        # login, register pages
│   │   ├── (dashboard)/   # couple dashboard (protected)
│   │   ├── (vendor)/      # vendor dashboard (protected)
│   │   └── invite/[slug]/ # public invitation page (SSR)
│   ├── components/
│   │   ├── invitation/    # 5 template components
│   │   └── shared/        # Providers, Nav, Footer
│   ├── lib/
│   │   ├── api.ts         # All API calls (typed)
│   │   └── auth.ts        # NextAuth configuration
│   └── stores/
│       └── authStore.ts   # Zustand auth state
│
├── nginx/nginx.conf        # Reverse proxy config
├── docker-compose.yml      # All services
├── .env.example            # Environment template
└── .github/workflows/      # GitHub Actions CI/CD
```

---

## Frontend ↔ Backend Integration

The frontend connects to the backend in two ways:

### 1. Email/Password Login
```
User fills form → POST /api/auth/login/ → Django returns {access, refresh, user}
→ Store in localStorage (via authStore) → All future requests add Bearer header
```

### 2. Google Login
```
User clicks Google → NextAuth initiates OAuth → Google returns id_token
→ NextAuth callback (lib/auth.ts) sends id_token to POST /api/auth/google/
→ Django verifies with Google, creates/gets user, returns {access, refresh, user}
→ Stored in NextAuth session + localStorage
```

### 3. Image Upload Flow
```
User drops image on frontend → FormData sent to FastAPI /api/v1/images/upload
→ FastAPI saves to MEDIA_ROOT/gallery/originals/ → Returns {path, url}
→ Frontend sends metadata + path to Django /api/gallery/images/ → Saved to DB
→ Celery task generates thumbnails async → DB updated with thumb URLs
```
