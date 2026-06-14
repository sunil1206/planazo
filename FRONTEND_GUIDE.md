# Snapshare Frontend Reference Guide

Complete developer reference for the Next.js wedding app frontend. This document covers all URLs, component structure, themes, API calls, design system, and mobile responsiveness.

---

## 1. All Frontend URLs

### Public Pages (No Auth Required)

| URL | Purpose | Components | API Calls |
|-----|---------|-----------|-----------|
| `/` | Landing page — WeddingWire style homepage | `app/page.tsx` (26K lines) | None (SSG) |
| `/login` | Email/Phone/Google login | `app/login/page.tsx` | `authApi.login()`, `authApi.googleAuth()`, `authApi.sendOtp()`, `authApi.verifyOtp()` |
| `/register` | Role-differentiated signup (Couple/Vendor/Seller) | `app/register/page.tsx` | `authApi.register()` |
| `/forgot-password` | Email-based password recovery | `app/forgot-password/page.tsx` | `authApi.forgotPassword()` |
| `/reset-password` | Token-based password reset | `app/reset-password/page.tsx` | `authApi.resetPassword()` |
| `/invite/[slug]` | Public wedding invitation page — Premium design | `app/invite/[slug]/page.tsx` (30K) | `invitationApi.getPublic()`, `.rsvp()`, `.wish()`, `.getPublic()` |
| `/invite/[slug]/gallery` | Wedding gallery with photos | `app/invite/[slug]/gallery/page.tsx` | `galleryApi.listPublic()` |
| `/invite/[slug]/gifts` | Gift registry marketplace | `app/invite/[slug]/gifts/page.tsx` | `giftApi.products()`, `.ordersByWedding()` |
| `/invite/[slug]/gifts/[productId]` | Individual gift product page | `app/invite/[slug]/gifts/[productId]/page.tsx` | `giftApi.getProduct()`, `.createOrder()` |
| `/birthday/[slug]` | Public birthday page | `app/birthday/[slug]/page.tsx` | Same as `/invite/[slug]` but for birthday |
| `/birthday/[slug]/gifts` | Birthday gift registry | `app/birthday/[slug]/gifts/page.tsx` | Same as invitation gifts |
| `/vendors` | Public vendor directory & search | `app/vendors/page.tsx` | `vendorApi.list()` |
| `/vendor/[slug]` | Individual vendor portfolio | `app/vendor/[slug]/page.tsx` | `vendorApi.get()`, `.getCategories()`, `.getPackages()` |
| `/planner` | AI-powered wedding planner (public preview) | `app/planner/page.tsx` | `vendorApi.plannerRecommend()` (optional) |
| `/shop` | Amazon/Flipkart-style gift marketplace | `app/shop/page.tsx` | `giftApi.products()`, `.cart()`, `.cartAdd()`, `.cartCheckout()` |
| `/shop/product/[slug]` | Individual product detail page | `app/shop/product/[slug]/page.tsx` | `giftApi.getProduct()`, `.addReview()` |

### Authenticated Pages — Dashboard

**Base path:** `/dashboard/*` (Protected by `DashboardLayout` → redirects to `/login` if not authenticated)

| URL | Purpose | Components | Key API Calls |
|-----|---------|-----------|---------------|
| `/dashboard/overview` | Wedding summary & quick actions | `app/dashboard/overview/page.tsx` | `invitationApi.list()`, `invitationApi.getRSVPs()` |
| `/dashboard/invites` | Create/list/edit wedding invitations | `app/dashboard/invites/page.tsx` | `invitationApi.list()`, `.create()`, `.delete()` |
| `/dashboard/edit/[id]` | **Invitation editor** — all 5 themes | `app/dashboard/edit/[id]/page.tsx` (50+ lines shown) | `invitationApi.get()`, `.update()`, `.uploadThumbnail()`, `.getBridegroom()`, `.patchBridegroom()` |
| `/dashboard/gallery-v2` | Wedding photo upload & AI selfie match | `app/dashboard/gallery-v2/page.tsx` | `galleryApi.upload()`, `.listPublic()`, `.selfieMatch()`, `.selfieStatus()` |
| `/dashboard/gallery` | [DEPRECATED] Redirect to `/gallery-v2` | — | — |
| `/dashboard/guests` | Guest list management & RSVP tracking | `app/dashboard/guests/page.tsx` | `invitationApi.getRSVPs()` |
| `/dashboard/checklist` | Wedding planning tasks by timeline | `app/dashboard/checklist/page.tsx` | Frontend state only (no API) |
| `/dashboard/budget` | Budget tracking (estimated vs. actual) | `app/dashboard/budget/page.tsx` | Frontend state only |
| `/dashboard/vendor-manager` | Manage saved vendors & inquiries | `app/dashboard/vendor-manager/page.tsx` | `vendorApi.list()`, `.enquire()`, `.myEnquiries()` |
| `/dashboard/birthdays` | List/create birthday pages | `app/dashboard/birthdays/page.tsx` | `birthdayApi.list()`, `.create()`, `.delete()` |
| `/dashboard/birthdays/edit/[id]` | Birthday page editor | `app/dashboard/birthdays/edit/[id]/page.tsx` | `birthdayApi.get()`, `.update()` |
| `/dashboard/settings` | User profile, email, password | `app/dashboard/settings/page.tsx` | `authApi.me()` |
| `/dashboard/invitations` | [DEPRECATED] Redirect to `/invites` | — | — |

### Seller Dashboard (Gift Marketplace)

**Base path:** `/seller/*` (Protected by `SellerLayout`)

| URL | Purpose | Components | Key API Calls |
|-----|---------|-----------|---------------|
| `/seller` | Seller dashboard home | `app/seller/page.tsx` | `sellerApi.getProfile()`, `.analytics()` |
| `/seller/setup` | Initial seller account setup | `app/seller/setup/page.tsx` | `sellerApi.createProfile()` |
| `/seller/products` | List, create, edit products | `app/seller/products/page.tsx` | `sellerApi.listProducts()`, `.createProduct()`, `.updateProduct()`, `.uploadProductImage()` |
| `/seller/orders` | Order history & fulfillment | `app/seller/orders/page.tsx` | `sellerApi.listOrders()`, `.updateOrderStatus()` |
| `/seller/analytics` | Sales metrics & performance | `app/seller/analytics/page.tsx` | `sellerApi.analytics()` |
| `/seller/marketplace` | Public marketplace catalog | `app/seller/marketplace/page.tsx` | `giftApi.products()`, `.categories()` |

### Vendor Dashboard

**Base path:** `/vendor/*` (Protected)

| URL | Purpose | Components | Key API Calls |
|-----|---------|-----------|---------------|
| `/vendor/enquiries` | Vendor inquiry management | `app/vendor/enquiries/page.tsx` | `vendorApi.myEnquiries()` |

---

## 2. Component Map

### Theme Components for Invitations (Wedding)

**Location:** `/frontend/components/invitation/`

All 5 invitation themes are split across two locations:
- **Dashboard preview:** `/components/invitation/*.tsx`
- **Public page render:** `/app/invite/[slug]/themes/*.tsx`

The editor page uses the `/components/invitation` versions in a live preview panel, while the public invitation renders the `/app/invite/[slug]/themes` versions.

#### Theme Files & Structure

| Theme | Editor Component | Public Component | Accent Colors | File Size |
|-------|-----------------|-----------------|---------------|----|
| **Royal Mughal** | `/components/invitation/RoyalMughal.tsx` | Not yet split | `#5C0F2A` (burgundy), `#C9952A` (gold), `#FDF6EC` (cream) | 80+ lines |
| **Kerala Traditional** | `/components/invitation/KeralaTrad.tsx` | Not yet split | `#9B1C1C` (red), `#B7860B` (gold), `#FFFBF2` (cream) | 60+ lines |
| **Modern Minimal** | `/components/invitation/ModernMinimal.tsx` | `/app/invite/[slug]/themes/ModernMinimal.tsx` | `#334155` (slate), `#F8FAFC` (light), `#0F172A` (dark) | 24K lines (public) |
| **Floral Pastel** | `/components/invitation/FloralPastel.tsx` | Not yet split | `#DB2777` (pink), `#EC4899` (magenta), `#FDF2F8` (soft pink) | 60+ lines |
| **Cinematic Dark** | `/components/invitation/CinematicDark.tsx` | Not yet split | `#D4AF6A` (gold), `#0C0C0C` (black), `#161616` (card) | 60+ lines |

**Key Theme Sections (All Themes Include):**

Each theme component exports a default function that accepts `{ data }` prop with these fields:
- `data.couple_name_1`, `data.couple_name_2` — Groom/Bride names
- `data.wedding_date` — ISO date string
- `data.thumbnail` — Hero image URL
- `data.events` — Array of ceremony/reception events
- `data.stories` — Array of couple story chapters
- `data.wishes` — Array of guest wishes
- `data.rsvps` — Array of RSVP responses
- `data.gallery` — Array of photos

Each theme renders:
1. **Hero Section** — Couple names, date, background photo
2. **Countdown** — Days/hours/minutes/seconds to wedding
3. **Events Section** — Ceremony, reception, pre-wedding
4. **Our Story** — Couple backstory timeline
5. **Gallery** — Photo grid (paginated)
6. **RSVP Form** — Name, attendance, message
7. **Wishes Section** — Guest congratulations
8. **Footer** — Social links, share buttons

---

### Birthday Theme Components

**Location:** `/frontend/components/birthday/`

5 birthday invitation templates (children's parties):

| Template | File | Colors | Use Case |
|----------|------|--------|----------|
| **Balloon Bash** | `BalloonBash.tsx` | Bright rainbow | 4-8 year olds |
| **Kids Party** | `KidsParty.tsx` | Primary colors | All ages |
| **Floral Birthday** | `FloralBirthday.tsx` | Pastels + gold | Tween girls |
| **Star Gold** | `StarGoldBirthday.tsx` | Gold + white | Elegant parties |
| **Cinematic** | `CinematicBirthday.tsx` | Dark + neon | Teen parties |

Each birthday component is a standalone `export default function BirthdayTheme({ data })` that renders a full page.

---

### Shared Components

**Location:** `/frontend/components/shared/`

| Component | File | Purpose |
|-----------|------|---------|
| **Providers** | `Providers.tsx` | Auth context, React Query, Toast setup |
| (UI components) | `ui/*.tsx` | shadcn/ui-style buttons, dialogs, tabs |
| (Gallery) | `gallery/*.tsx` | Gallery upload, filter, lightbox |
| (Vendor) | `vendor/*.tsx` | Vendor card, filter, search |

---

## 3. Theme System Deep Dive

### How Themes Are Selected

**In `/dashboard/edit/[id]`:**
```typescript
const THEMES = [
  { value: "royal_mughal",   label: "Royal Mughal",       emoji: "👑", color: "#8B1A4A" },
  { value: "kerala_trad",    label: "Kerala",             emoji: "🪔", color: "#D97706" },
  { value: "modern_minimal", label: "Minimal",            emoji: "🤍", color: "#6B7280" },
  { value: "floral_pastel",  label: "Floral",             emoji: "🌸", color: "#EC4899" },
  { value: "cinematic_dark", label: "Cinematic",          emoji: "🎬", color: "#1E293B" },
];
```

The editor stores `theme` in state, saves to database via `invitationApi.update(id, { theme, ... })`.

### How Themes Are Rendered (Editor Preview)

In `/dashboard/edit/[id]`, the live-preview panel renders based on selected theme:

```typescript
import RoyalMughal from "@/components/invitation/RoyalMughal";
import KeralaTrad from "@/components/invitation/KeralaTrad";
import ModernMinimal from "@/components/invitation/ModernMinimal";
import FloralPastel from "@/components/invitation/FloralPastel";
import CinematicDark from "@/components/invitation/CinematicDark";

const themeComponents = {
  royal_mughal: RoyalMughal,
  kerala_trad: KeralaTrad,
  modern_minimal: ModernMinimal,
  floral_pastel: FloralPastel,
  cinematic_dark: CinematicDark,
};

const ThemeComponent = themeComponents[selectedTheme];
return <ThemeComponent data={liveData} />;
```

### How Themes Are Rendered (Public Page)

On `/invite/[slug]`, the server fetches the invitation:
```typescript
const invitation = await invitationApi.getPublic(slug);
```

Then renders based on stored theme value. Currently only `ModernMinimal` has a dedicated public component at `/app/invite/[slug]/themes/ModernMinimal.tsx`. Other themes need similar public components created.

### Color Palette Reference

**Master Brand Colors** (in `tailwind.config.ts`):
```typescript
colors: {
  burgundy: "#8B1A4A",    // Primary rose
  gold:     "#C9952A",    // Accent gold
  navy:     "#0D1B2A",    // Deep navy (not widely used)
}
```

**Per-Theme Palettes** (in `/dashboard/edit/[id]/page.tsx`):
```typescript
const THEME_PALETTES = {
  royal_mughal: {
    bg: "#1A0A12",      // Dark burgundy background
    accent: "#C9952A",  // Gold accents
    text: "#F9E5C0"     // Cream text
  },
  kerala_trad: {
    bg: "#1C1005",      // Dark brown
    accent: "#F59E0B",  // Amber gold
    text: "#FEF3C7"     // Cream
  },
  modern_minimal: {
    bg: "#F8FAFC",      // Light slate
    accent: "#334155",  // Slate gray
    text: "#0F172A"     // Dark navy
  },
  floral_pastel: {
    bg: "#FDF2F8",      // Soft pink
    accent: "#DB2777",  // Hot pink
    text: "#831843"     // Dark magenta
  },
  cinematic_dark: {
    bg: "#0F172A",      // Black
    accent: "#6366F1",  // Indigo
    text: "#E2E8F0"     // Light gray
  }
};
```

---

## 4. How to Make Changes

### Change Hero Section Color (Royal Mughal Example)

**File:** `/frontend/components/invitation/RoyalMughal.tsx` (line ~65)

```typescript
// Current
<section
  className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-4"
  style={{ background: `linear-gradient(160deg, ${BURG} 0%, #3A0718 100%)` }}
>
```

**To change the gradient:**
1. Edit `BURG` (line 12) — currently `#5C0F2A`
2. Or edit the secondary color `#3A0718`
3. Save file
4. HMR reloads the live preview in the editor

**For all 5 themes:**
- Royal Mughal: `/components/invitation/RoyalMughal.tsx` lines 11-13
- Kerala Trad: `/components/invitation/KeralaTrad.tsx` lines 11-14
- Modern Minimal: `/components/invitation/ModernMinimal.tsx` lines 11-15
- Floral Pastel: `/components/invitation/FloralPastel.tsx`
- Cinematic Dark: `/components/invitation/CinematicDark.tsx` lines 11-14

### Change Event Card Styling

**File:** `/components/invitation/RoyalMughal.tsx` (search for "Events Section")

```typescript
{data.events?.map((e) => (
  <div key={e.id} className="p-6 rounded-lg border" style={{ borderColor: GOLD }}>
    <h3 style={{ color: GOLD }}>{e.title}</h3>
    <p>{e.time}</p>
    <p>{e.location_name}</p>
  </div>
))}
```

**To customize:**
1. Change `className` for layout (padding, border-radius, flex direction)
2. Change `style={{ borderColor, color }}` for colors
3. Add new fields like `e.desc`, `e.location_link`

### Change RSVP Form Layout

**File:** `/components/invitation/RoyalMughal.tsx` (search for "RSVP Form")

Current structure:
```typescript
<form onSubmit={submitRSVP}>
  <input placeholder="Your name" value={rsvp.name} onChange={...} />
  <select value={rsvp.attendance} onChange={...}>
    <option value="YES">Yes, I'll attend</option>
    <option value="NO">No, can't make it</option>
  </select>
  <textarea placeholder="Message" value={rsvp.message} onChange={...} />
  <button type="submit" disabled={sending}>Send RSVP</button>
</form>
```

**To modify:**
1. Change form fields (add phone, dietary, +1 guest fields)
2. Update `rsvp` state to include new fields
3. Update `invitationApi.rsvp()` call to send new data
4. Backend serializer must accept these fields

### Add a New Section to a Theme

Example: Add "Groom's Journey" section to Royal Mughal

**File:** `/components/invitation/RoyalMughal.tsx` (add before RSVP form)

```typescript
{/* ── Groom's Journey ────────────────────────────────── */}
<section className="py-20 px-4" style={{ background: CREAM }}>
  <h2 className="text-4xl font-serif text-center mb-12" style={{ color: BURG }}>
    Groom's Journey
  </h2>
  {data.bridegroom?.stories?.map((story) => (
    <div key={story.id} className="max-w-2xl mx-auto mb-8">
      <h3 style={{ color: GOLD }}>{story.title}</h3>
      <p>{story.desc}</p>
    </div>
  ))}
</section>
```

Then ensure backend returns `data.bridegroom.stories` from `invitationApi.getPublic()`.

---

## 5. API Reference

**Client location:** `/frontend/lib/api.ts`

All APIs use the `ky` HTTP client with automatic auth headers and token refresh.

### Authentication APIs

```typescript
// Register new account
authApi.register(data: { email, password, full_name, role })
// → POST /api/auth/register/

// Login with email
authApi.login(data: { email, password })
// → POST /api/auth/login/

// Google OAuth
authApi.googleAuth(idToken: string)
// → POST /api/auth/google/

// Get current user
authApi.me()
// → GET /api/auth/me/

// Phone OTP flow
authApi.sendOtp(phone: string)
// → POST /api/auth/otp/send/

authApi.verifyOtp(data: { phone, otp, full_name?, role? })
// → POST /api/auth/otp/verify/

// Password reset
authApi.forgotPassword(email: string)
// → POST /api/auth/password/forgot/

authApi.resetPassword(token: string, password: string)
// → POST /api/auth/password/reset/
```

### Invitation APIs (Wedding Pages)

```typescript
// Couple's own invitations
invitationApi.list()
// → GET /api/invitations/

invitationApi.create(data: { couple_name_1, couple_name_2, wedding_date, ... })
// → POST /api/invitations/

invitationApi.get(id: number)
// → GET /api/invitations/{id}/

invitationApi.update(id: number, data: any)
// → PATCH /api/invitations/{id}/

invitationApi.delete(id: number)
// → DELETE /api/invitations/{id}/

// Bridegroom (groom-specific) details
invitationApi.getBridegroom(id: number)
// → GET /api/invitations/{id}/bridegroom/

invitationApi.patchBridegroom(id: number, data: FormData | JSON)
// → PATCH /api/invitations/{id}/bridegroom/

// Story chapters
invitationApi.addStory(id: number, data: { title, desc, date })
// → POST /api/invitations/{id}/stories/

invitationApi.getStories(id: number)
// → GET /api/invitations/{id}/stories/

// Events (ceremony, reception, etc.)
invitationApi.addEvent(id: number, data: { title, time, date, location_name, location_link, desc })
// → POST /api/invitations/{id}/events/

invitationApi.getEvents(id: number)
// → GET /api/invitations/{id}/events/

// Countdown timer
invitationApi.setCountdown(id: number, data: { target_date })
// → POST /api/invitations/{id}/countdown/

invitationApi.getCountdown(id: number)
// → GET /api/invitations/{id}/countdown/

// Public invitation access
invitationApi.getPublic(slug: string)
// → GET /api/invitations/invite/{slug}/

invitationApi.rsvp(slug: string, data: { name, attendance, message, guests? })
// → POST /api/invitations/invite/{slug}/rsvp/

invitationApi.wish(slug: string, data: { name, message, relationship })
// → POST /api/invitations/invite/{slug}/wish/

// RSVP & analytics
invitationApi.getRSVPs(id: number)
// → GET /api/invitations/{id}/rsvps/

// Image upload
invitationApi.uploadThumbnail(id: number, formData: FormData)
// → POST /api/invitations/{id}/upload-thumbnail/

// Gallery token for private galleries
invitationApi.getGalleryToken(id: number)
// → GET /api/invitations/{id}/gallery-token/

invitationApi.verifyGalleryToken(token: string)
// → POST /api/invitations/verify-gallery-token/
```

### Gallery APIs

```typescript
// Upload photos
galleryApi.upload(formData: FormData)
// → POST /api/gallery/images/

// List invitation gallery
galleryApi.list(websiteId: number, page = 1)
// → GET /api/gallery/images/?website={websiteId}&page={page}

// List public gallery
galleryApi.listPublic(slug: string, page = 1)
// → GET /api/gallery/public/{slug}/?page={page}

// AI selfie matching
galleryApi.selfieMatch(formData: FormData)
// → POST /api/gallery/selfie/

galleryApi.selfieStatus(id: number)
// → GET /api/gallery/selfie/{id}/

// Photo management
galleryApi.download(imageId: number)
// → POST /api/gallery/images/{imageId}/download/
```

### Gift / Gift Store APIs

```typescript
// Product catalog
giftApi.categories()
// → GET /api/gifts/categories/

giftApi.products(params?: { category, search, price_min, price_max })
// → GET /api/gifts/products/

giftApi.getProduct(slug: string)
// → GET /api/gifts/products/{slug}/

giftApi.addReview(id: number, data: { rating, comment })
// → POST /api/gifts/products/{id}/review/

// Single-product orders (from invitation page)
giftApi.createOrder(data: { product_id, quantity, amount, payment_method })
// → POST /api/gifts/orders/

giftApi.verifyPayment(data: { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature })
// → POST /api/gifts/orders/verify/

giftApi.ordersByWedding(slug: string)
// → GET /api/gifts/orders/by-wedding/?slug={slug}

// Shopping cart (marketplace)
giftApi.cart()
// → GET /api/gifts/cart/me/

giftApi.cartAdd(data: { product_id, quantity })
// → POST /api/gifts/cart/add/

giftApi.cartUpdate(data: { item_id, quantity })
// → PATCH /api/gifts/cart/update/

giftApi.cartRemove(data: { item_id })
// → DELETE /api/gifts/cart/remove/

giftApi.cartCheckout()
// → POST /api/gifts/cart/checkout/

giftApi.cartVerifyOrder(data: { order_id, razorpay_payment_id, razorpay_signature })
// → POST /api/gifts/cart/verify-order/

giftApi.myOrders()
// → GET /api/gifts/marketplace/orders/
```

### Vendor APIs

```typescript
// Directory
vendorApi.list(params?: { category, location, search })
// → GET /api/vendors/

vendorApi.get(slug: string)
// → GET /api/vendors/{slug}/

// Account
vendorApi.me()
// → GET /api/vendors/me/

vendorApi.create(data: { name, category, location, ... })
// → POST /api/vendors/

vendorApi.update(id: number, data: any)
// → PATCH /api/vendors/{id}/

// Inquiries
vendorApi.enquire(slug: string, data: { event_date, guest_count, message })
// → POST /api/vendors/{slug}/enquire/

vendorApi.myEnquiries()
// → GET /api/vendors/enquiries/

// Portfolio
vendorApi.addPortfolio(slug: string, formData: FormData)
// → POST /api/vendors/{slug}/portfolio/

vendorApi.deletePortfolio(slug: string, imgId: number)
// → DELETE /api/vendors/{slug}/portfolio/{imgId}/

// Images
vendorApi.uploadThumbnail(id: number, formData: FormData)
// → POST /api/vendors/{id}/upload-thumbnail/

vendorApi.uploadCover(id: number, formData: FormData)
// → POST /api/vendors/{id}/upload-cover/

// Portfolio categories
vendorApi.getCategories(slug: string)
// → GET /api/vendors/{slug}/categories/

vendorApi.createCategory(slug: string, data: { name })
// → POST /api/vendors/{slug}/categories/

vendorApi.updateCategory(slug: string, catId: number, data: any)
// → PATCH /api/vendors/{slug}/categories/{catId}/

vendorApi.deleteCategory(slug: string, catId: number)
// → DELETE /api/vendors/{slug}/categories/{catId}/

// Pricing packages
vendorApi.getPackages(slug: string)
// → GET /api/vendors/{slug}/packages/

vendorApi.createPackage(slug: string, data: { name, price, desc })
// → POST /api/vendors/{slug}/packages/

vendorApi.updatePackage(slug: string, pkgId: number, data: any)
// → PATCH /api/vendors/{slug}/packages/{pkgId}/

vendorApi.deletePackage(slug: string, pkgId: number)
// → DELETE /api/vendors/{slug}/packages/{pkgId}/

// AI Planner recommendations
vendorApi.plannerRecommend(data: { budget, guest_count, event_type })
// → POST /api/vendors/planner/

// Subscriptions
vendorApi.subPlans()
// → GET /api/vendors/subscriptions/plans/

vendorApi.mySub()
// → GET /api/vendors/subscriptions/me/

vendorApi.subCreateOrder(data: { plan_id })
// → POST /api/vendors/subscriptions/create-order/

vendorApi.subVerify(data: { order_id, razorpay_payment_id, razorpay_signature })
// → POST /api/vendors/subscriptions/verify/

vendorApi.subCancel()
// → POST /api/vendors/subscriptions/cancel/
```

### Birthday APIs

```typescript
birthdayApi.list()
// → GET /api/birthday/pages/

birthdayApi.create(data: { child_name, dob, theme })
// → POST /api/birthday/pages/

birthdayApi.get(id: number)
// → GET /api/birthday/pages/{id}/

birthdayApi.update(id: number, data: any)
// → PATCH /api/birthday/pages/{id}/

birthdayApi.delete(id: number)
// → DELETE /api/birthday/pages/{id}/

birthdayApi.publish(id: number)
// → POST /api/birthday/pages/{id}/publish/

birthdayApi.addEvent(id: number, data: { title, time, date })
// → POST /api/birthday/pages/{id}/events/

birthdayApi.getEvents(id: number)
// → GET /api/birthday/pages/{id}/events/

birthdayApi.addStory(id: number, data: { title, desc })
// → POST /api/birthday/pages/{id}/stories/

birthdayApi.getStories(id: number)
// → GET /api/birthday/pages/{id}/stories/

birthdayApi.getWishes(id: number)
// → GET /api/birthday/pages/{id}/wishes/

birthdayApi.getRSVPs(id: number)
// → GET /api/birthday/pages/{id}/rsvps/

birthdayApi.setCountdown(id: number, data: { target_date })
// → POST /api/birthday/pages/{id}/countdown/

birthdayApi.getCountdown(id: number)
// → GET /api/birthday/pages/{id}/countdown/
```

### Seller Dashboard APIs

```typescript
// Profile
sellerApi.getProfile()
// → GET /api/gifts/seller/profile/me/

sellerApi.createProfile(data: { shop_name, description, ... })
// → POST /api/gifts/seller/profile/

sellerApi.updateProfile(id: number, data: any)
// → PATCH /api/gifts/seller/profile/{id}/

// Products
sellerApi.listProducts()
// → GET /api/gifts/seller/products/

sellerApi.createProduct(data: { name, price, category, ... })
// → POST /api/gifts/seller/products/

sellerApi.updateProduct(id: number, data: any)
// → PATCH /api/gifts/seller/products/{id}/

sellerApi.deleteProduct(id: number)
// → DELETE /api/gifts/seller/products/{id}/

sellerApi.uploadProductImage(id: number, formData: FormData)
// → POST /api/gifts/seller/products/{id}/upload-image/

sellerApi.addGalleryImage(id: number, formData: FormData)
// → POST /api/gifts/seller/products/{id}/add-gallery-image/

// Orders
sellerApi.listOrders()
// → GET /api/gifts/seller/orders/

sellerApi.updateOrderStatus(id: number, status: string)
// → PATCH /api/gifts/seller/orders/{id}/update-status/

// Analytics
sellerApi.analytics()
// → GET /api/gifts/seller/profile/analytics/
```

---

## 6. Design System

### Brand Identity

**Company Name:** Snapshare  
**Tagline:** Digital Wedding Platform  
**Target Audience:** Engaged couples, vendors, sellers in India

### Color System

#### Primary Palette (Semantic)

| Name | Hex | Usage | Tailwind |
|------|-----|-------|----------|
| Burgundy (Rose) | `#8B1A4A` | Primary CTA, logo | `burgundy` |
| Gold | `#C9952A` | Accents, luxury feel | `gold` |
| Navy | `#0D1B2A` | Text, borders | `navy` |

#### Per-Theme Colors

See **Theme System § Color Palette Reference** above. Each theme has custom:
- Background color
- Accent/highlight color
- Text color
- Optional secondary accents

#### Theme-Specific Highlights

| Theme | Primary | Secondary | Background |
|-------|---------|-----------|-----------|
| Royal Mughal | `#8B1A4A` burgundy | `#C9952A` gold | `#1A0A12` deep burgundy |
| Kerala Traditional | `#9B1C1C` red | `#B7860B` gold | `#1C1005` dark brown |
| Modern Minimal | `#334155` slate | `#94A3B8` light slate | `#F8FAFC` off-white |
| Floral Pastel | `#DB2777` hot pink | `#F472B6` light pink | `#FDF2F8` soft pink bg |
| Cinematic Dark | `#1E293B` slate | `#6366F1` indigo | `#0F172A` black |

### Typography

**Font Stack:**
```typescript
fontFamily: {
  serif: ["Georgia", "Cambria", "serif"],  // Headings, formal
  sans: "Inter",                           // Body (default)
}
```

**Usage:**
- Headings (h1, h2, h3): Serif fonts for elegance
- Body copy: Sans-serif (Inter) for readability
- Form labels: Sans-serif, bold
- Theme ornaments (dividers, decorative): SVG-based or serif + decorative symbols

### Spacing & Layout

**Tailwind Defaults:**
- Padding: `p-4`, `p-6`, `p-8`, `p-12` (16px, 24px, 32px, 48px)
- Margins: `my-4`, `mb-8`, `mt-12`
- Gap (flexbox): `gap-4`, `gap-6`

**Custom breakpoints (Tailwind):**
- `sm`: 640px (mobile)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (wide)

### Component Styling Examples

#### CTA Buttons

```typescript
// Primary (burgundy)
<button className="bg-burgundy text-white px-6 py-3 rounded-lg hover:opacity-90 transition">
  Create Wedding
</button>

// Secondary (outline)
<button className="border-2 border-burgundy text-burgundy px-6 py-3 rounded-lg hover:bg-burgundy/5">
  Learn More
</button>

// Tertiary (text)
<button className="text-burgundy hover:underline font-semibold">
  View Details →
</button>
```

#### Cards (Invitation Page)

```typescript
// Light card
<div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: "#8B1A4A" }}>
  <h3 className="font-serif text-xl">Event Name</h3>
  <p className="text-gray-600">Details...</p>
</div>

// Dark card (Cinematic theme)
<div className="bg-[#161616] rounded-lg border border-gold p-6">
  <h3 style={{ color: "#D4AF6A" }}>Event Name</h3>
  <p className="text-gray-300">Details...</p>
</div>
```

#### Form Inputs

```typescript
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
  style={{ focusRing: "#8B1A4A" }}
  placeholder="Your name"
/>

<select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
  <option>Yes, I'll attend</option>
  <option>No, can't make it</option>
</select>

<textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32" placeholder="Your message..." />
```

#### Responsive Grid

```typescript
// 2 columns on mobile, 3 on tablet, 4 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {items.map(item => (...))}
</div>
```

---

## 7. Mobile Responsiveness

### Breakpoint Strategy

All pages follow Tailwind's breakpoint system:

| Breakpoint | Screen Size | Use Case |
|-----------|-----------|----------|
| `default` | 0-639px | Mobile-first (stack everything vertically) |
| `sm:` | 640px+ | Small tablets (2 columns) |
| `md:` | 768px+ | Tablets (3 columns, sidebar appears) |
| `lg:` | 1024px+ | Desktop (4+ columns, full layout) |
| `xl:` | 1280px+ | Wide desktop (max-width containers) |

### Mobile-Specific Layouts

#### Dashboard Layout

**Mobile (default):**
- Sidebar: Hidden, toggle with hamburger menu
- Content: Full-width stack
- Bottom nav: Sticky tab bar (5 items: Home, Wedding, Guests, Budget, Tasks)

**Desktop (md:+):**
- Sidebar: Visible left nav (220px)
- Content: Flex layout
- Bottom nav: Hidden

**Code:** `/app/dashboard/layout.tsx` lines 34-100

```typescript
// Hamburger toggle
const [sidebarOpen, setSidebarOpen] = useState(false);

// Rendered at md: (visible desktop) and hidden on mobile
<aside className="hidden md:block w-56 fixed left-0 top-0 h-screen bg-white border-r">
  {/* Nav items */}
</aside>

// Mobile bottom tabs
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-between">
  {bottomTabs.map(tab => (...))}
</nav>
```

#### Invitation Page (/invite/[slug])

**All themes respond to mobile:**

```typescript
// Hero section
<section className="min-h-screen px-4 md:px-0 flex items-center justify-center">
  {/* Couple names */}
  <h1 className="text-3xl md:text-5xl font-serif">{data.couple_name_1} & {data.couple_name_2}</h1>
</section>

// Events grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-0">
  {data.events.map(event => (...))}
</div>

// Form inputs
<form className="max-w-md mx-auto px-4">
  <input className="w-full mb-3" type="text" />
  <textarea className="w-full mb-3 h-24" />
  <button className="w-full">Send RSVP</button>
</form>
```

#### Gallery Grid

**Mobile (1 column) → Tablet (2) → Desktop (3-4)**

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-0">
  {images.map(img => (
    <img src={img} className="w-full h-48 object-cover rounded-lg" alt="" />
  ))}
</div>
```

#### Vendor Cards

**Mobile (scrollable horizontal) → Tablet (2) → Desktop (3-4)**

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {vendors.map(v => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={v.thumbnail} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{v.name}</h3>
        <p className="text-gray-600 text-sm">{v.category}</p>
      </div>
    </div>
  ))}
</div>
```

#### Shop / Marketplace

**Mobile (1 col) → Tablet (2) → Desktop (3+)**
Same as gallery and vendor grids. Cart drawer opens from right side (fixed position).

### Touch Interactions

- **Buttons:** Min 44px height for touch targets
- **Links:** Adequate padding around clickable areas
- **Forms:** Large input fields, clear labels
- **Modals:** Close button in top-right, also close on backdrop click

### Performance on Mobile

- Images optimized via Next.js `<Image>` component where possible
- Lazy loading for off-screen gallery images
- Bottom nav is sticky but not too tall (leaves room for content)
- Form inputs avoid `input type="date"` (use custom date picker) to prevent overflow

---

## 8. HMR / Development

### Running Locally

```bash
cd /sessions/lucid-elegant-gates/mnt/snapshare/wedding-project/frontend

# Install dependencies (already done)
npm install

# Start dev server
npm run dev
# Runs on http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

**File:** `.env.local`

```bash
# Backend API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000          # Django REST API
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001      # FastAPI (images, AI)

# NextAuth (if used)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=snapshare-nextauth-dev-secret-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Razorpay (payments, frontend widget)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

### Hot Module Replacement (HMR)

**How it works:**
1. Edit a `.tsx` or `.css` file in `/app` or `/components`
2. Save file
3. Next.js detects change and re-compiles in ~500ms
4. Browser receives update via WebSocket
5. Component re-renders in-place (React state preserved if possible)

**Examples:**
- Change button color in `RoyalMughal.tsx` → Live preview updates instantly
- Update form validation in `edit/[id]/page.tsx` → Form state persists
- Add new gallery filter → Existing filters stay, new filter appears

**Caveats:**
- Full page refresh needed if you change route structure (`/app/new-page/page.tsx`)
- API client changes require browser refresh
- Environment variables require restart: `npm run dev`

### Dev Bypass Token

In `lib/api.ts`, tokens prefixed `dev_` are:
- Never sent to backend
- Never trigger 401 redirects
- Useful for testing without a real backend

**Usage:**
```typescript
// In browser console
localStorage.setItem("access_token", "dev_test_token_123");
// Now all API calls proceed without hitting /login
```

### Debugging

**React DevTools:**
- Install browser extension
- Inspect component tree, props, hooks
- Use `Profiler` to measure render time

**Network Tab:**
- Monitor API calls to `/api/invitations/`, `/api/gallery/`, etc.
- Check response payloads and timing
- Verify auth headers are sent

**Console Logs:**
```typescript
// In any component
useEffect(() => {
  console.log("Invitation data:", data);
  console.log("RSVP count:", data.rsvps?.length);
}, [data]);
```

**Disabled API Endpoint (dev bypass):**
If you set `access_token` to `dev_*`, the app won't redirect to `/login` on 401. This lets you test pages without a live backend.

### Polling & Real-Time

**Polling interval** (for gallery, RSVPs):
```typescript
// In React Query hooks
useQuery({
  queryKey: ["gallery", invitationId],
  queryFn: () => galleryApi.list(invitationId),
  refetchInterval: 5000,  // Poll every 5 seconds
  refetchOnWindowFocus: false,
});
```

**To disable polling:** Set `refetchInterval: false` (default)

**To increase polling:** Change `5000` (5 sec) to `10000` (10 sec) or `2000` (2 sec)

**Location:** Search for `refetchInterval` in page files

---

## 9. Common Development Workflows

### Add a New Form Field to Invitation

1. **Backend serializer** — Add field to `InvitationSerializer`
2. **Database migration** — Add column to `Invitation` model
3. **Frontend editor** — Update `/dashboard/edit/[id]/page.tsx`:
   ```typescript
   const [liveData, setLiveData] = useState({ ..., newField: "" });
   
   <input value={liveData.newField} onChange={(e) => setLiveData({ ...liveData, newField: e.target.value })} />
   ```
4. **All theme components** — Add field to each theme's render:
   ```typescript
   <p>{data.newField}</p>
   ```
5. **Test:** Edit an invitation, set new field, save, view public page

### Update Theme Colors Across All Themes

1. Edit `tailwind.config.ts` if it's a global brand color
2. Update individual theme components:
   - `/components/invitation/RoyalMughal.tsx` (const GOLD, BURG, CREAM)
   - `/components/invitation/KeralaTrad.tsx`
   - `/components/invitation/ModernMinimal.tsx`
   - `/components/invitation/FloralPastel.tsx`
   - `/components/invitation/CinematicDark.tsx`
3. Rebuild: `npm run build`
4. Test editor preview and public page

### Add a New Page to Dashboard

1. Create `/app/dashboard/new-page/page.tsx`
2. Import and export as client component: `"use client"`
3. Use dashboard layout auth (automatically wrapped by `DashboardLayout`)
4. Add nav item to `/app/dashboard/layout.tsx`:
   ```typescript
   const navItems = [
     // ... existing
     { href: "/dashboard/new-page", label: "New Page", icon: IconName, section: "main", emoji: "📌" },
   ];
   ```
5. HMR reflects new nav link immediately

### Debug API Call Failures

```typescript
// In component
useEffect(() => {
  (async () => {
    try {
      const data = await invitationApi.get(id);
      console.log("Success:", data);
    } catch (err) {
      console.error("API Error:", err.message, err.response?.status, err.response?.data);
    }
  })();
}, [id]);
```

Check:
- Network tab for HTTP status (401 = auth, 404 = not found, 500 = server error)
- Token in localStorage: `localStorage.getItem("access_token")`
- API URL in `.env.local` (must match backend)

---

## 10. Deployment & Docker

### Docker Configuration

**File:** `Dockerfile`

```dockerfile
# Multi-stage: build → run
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
# .env.production.local (never commit)
NEXT_PUBLIC_API_URL=https://api.snapshare.ai
NEXT_PUBLIC_FASTAPI_URL=https://fastapi.snapshare.ai
NEXTAUTH_URL=https://snapshare.ai
NEXTAUTH_SECRET=<random-secure-secret>
GOOGLE_CLIENT_ID=<production-oauth-id>
GOOGLE_CLIENT_SECRET=<production-oauth-secret>
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
```

### Build & Deploy

```bash
# Build
npm run build
# Creates .next/ directory

# Serve locally
npm start
# http://localhost:3000

# Deploy to Vercel (if using)
# Just push to main branch on GitHub, Vercel auto-deploys

# Or Docker
docker build -t snapshare-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.snapshare.ai \
  -e NEXT_PUBLIC_FASTAPI_URL=https://fastapi.snapshare.ai \
  snapshare-frontend
```

---

## 11. Troubleshooting

### Blank Page / No Content

**Cause:** SSR error in layout or root component  
**Fix:**
1. Check browser console for errors
2. Check Next.js terminal for build errors
3. Verify `Providers` wraps all children in `layout.tsx`
4. Check auth state in `useAuthStore`

### API Calls Failing (401 Unauthorized)

**Cause:** Token missing or expired  
**Fix:**
1. Log in again at `/login`
2. Check `localStorage.getItem("access_token")` in console
3. Verify backend is running and `NEXT_PUBLIC_API_URL` is correct
4. Check network tab for response details

### Images Not Loading

**Cause:** Image URL missing protocol or hostname mismatch  
**Fix:**
1. In `next.config.ts`, add hostname to `remotePatterns` if from new domain
2. Use helper: `imgUrl(src)` which prepends `NEXT_PUBLIC_API_URL` if needed
3. Check image file exists on backend and path is correct

### HMR Not Working

**Cause:** Webpack/Next.js not detecting changes  
**Fix:**
1. Restart dev server: `Ctrl+C`, then `npm run dev`
2. Clear `.next/` cache: `rm -rf .next`, then `npm run dev`
3. Restart browser, clear browser cache

### Form Submission Fails Silently

**Cause:** API error not caught or toast not shown  
**Fix:**
1. Wrap API call in try/catch
2. Log error: `console.error("Error:", err)`
3. Show toast: `toast.error(err.message || "Failed. Please try again.")`
4. Check network tab for actual error response

---

## 12. Key Files & Navigation

```
/frontend/
├── app/
│   ├── page.tsx ......................... Landing page (WeddingWire style)
│   ├── layout.tsx ....................... Root layout
│   ├── globals.css ....................... Global styles
│   ├── login/ ............................ Login/signup pages
│   ├── register/ ......................... Registration with role selection
│   ├── forgot-password/ .................. Password recovery
│   ├── reset-password/ ................... Token-based reset
│   ├── dashboard/
│   │   ├── layout.tsx ................... Protected dashboard wrapper
│   │   ├── overview/ .................... Wedding summary
│   │   ├── invites/ .................... Create/list/edit invitations
│   │   ├── edit/[id]/page.tsx ........... **Invitation editor (all themes)**
│   │   ├── gallery-v2/ .................. Photo upload & AI match
│   │   ├── guests/ ..................... RSVP tracking
│   │   ├── checklist/ .................. Planning tasks
│   │   ├── budget/ ..................... Budget tracking
│   │   ├── vendor-manager/ ............ Vendor inquiry management
│   │   ├── birthdays/ .................. Birthday page list
│   │   ├── birthdays/edit/[id]/ ....... Birthday editor
│   │   └── settings/ ................... User profile & password
│   ├── invite/
│   │   └── [slug]/
│   │       ├── page.tsx ................ **Premium wedding invitation**
│   │       ├── gallery/ ................ Wedding gallery
│   │       ├── gifts/ .................. Gift registry
│   │       ├── gifts/[productId]/ ...... Gift detail
│   │       └── themes/
│   │           └── ModernMinimal.tsx ... Public render (modern theme)
│   ├── birthday/
│   │   └── [slug]/
│   │       ├── page.tsx ................ Public birthday page
│   │       ├── gallery/ ................ Birthday photos
│   │       └── gifts/ .................. Birthday gifts
│   ├── seller/
│   │   ├── layout.tsx .................. Seller dashboard wrapper
│   │   ├── page.tsx .................... Seller home
│   │   ├── setup/ ...................... Initial setup
│   │   ├── products/ ................... Inventory management
│   │   ├── orders/ .................... Order fulfillment
│   │   ├── analytics/ .................. Sales metrics
│   │   └── marketplace/ ................ Product catalog
│   ├── vendor/
│   │   └── enquiries/ .................. Vendor inquiries
│   ├── vendors/ ......................... Vendor directory
│   ├── vendor/[slug]/ ................... Vendor portfolio
│   ├── planner/ ......................... AI planner wizard
│   ├── shop/ ............................ Gift marketplace
│   ├── shop/product/[slug]/ ............ Product detail
│   ├── api/
│   │   └── auth/[...nextauth]/ ......... NextAuth routes (if used)
│   └── (API rewrites via next.config.ts)
│
├── components/
│   ├── invitation/
│   │   ├── RoyalMughal.tsx ............. Theme 1
│   │   ├── KeralaTrad.tsx .............. Theme 2
│   │   ├── ModernMinimal.tsx ........... Theme 3
│   │   ├── FloralPastel.tsx ............ Theme 4
│   │   └── CinematicDark.tsx ........... Theme 5
│   ├── birthday/
│   │   ├── BalloonBash.tsx ............. Birthday theme 1
│   │   ├── KidsParty.tsx ............... Birthday theme 2
│   │   ├── FloralBirthday.tsx .......... Birthday theme 3
│   │   ├── StarGoldBirthday.tsx ........ Birthday theme 4
│   │   └── CinematicBirthday.tsx ....... Birthday theme 5
│   ├── gallery/ ......................... Gallery components
│   ├── vendor/ .......................... Vendor card, filters
│   ├── ui/ ............................. shadcn-style UI components
│   └── shared/
│       └── Providers.tsx ............... Auth, Query, Toast setup
│
├── lib/
│   ├── api.ts .......................... **API client (all endpoints)**
│   └── utils.ts ........................ Helper functions
│
├── stores/
│   └── authStore.ts .................... Zustand auth state
│
├── hooks/ ............................... Custom React hooks
│
├── lib/api.ts ........................... Ky HTTP client
├── tailwind.config.ts ................... Tailwind theme config
├── next.config.ts ....................... Next.js config (rewrites, images)
├── package.json ......................... Dependencies
└── .env.local ........................... Development env vars
```

---

## Quick Reference Cheat Sheet

```bash
# Development
npm run dev                 # Start dev server (HMR enabled)
npm run build              # Build for production
npm start                  # Start production server
npm run lint               # Run ESLint

# Common Edits
# To change Royal Mughal hero color:
# Edit: /components/invitation/RoyalMughal.tsx line 12 (const BURG = ...)

# To add RSVP field:
# 1. Backend: InvitationRSVP model + serializer
# 2. Frontend: /dashboard/edit/[id]/page.tsx + all 5 theme components

# To change dashboard nav:
# Edit: /dashboard/layout.tsx line 12 (const navItems = ...)

# To add new dashboard page:
# 1. Create /dashboard/new-page/page.tsx
# 2. Add nav item to layout.tsx

# To test without backend:
# localStorage.setItem("access_token", "dev_test_token")

# Environment Variables (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001
```

---

**Last Updated:** April 26, 2026  
**Frontend Version:** Next.js 16.2.4  
**Key Dependencies:** React 19, TailwindCSS 3.4, Ky 1.7, React Query 5.5, Zustand 4.5
