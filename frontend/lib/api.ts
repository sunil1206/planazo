/**
 * Typed API client
 *
 * Three rules:
 *  1. Auth endpoints (login/register/google/refresh) NEVER get an Authorization header
 *     → prevents DRF rejecting a login attempt because of a stale/expired token
 *  2. Dev-bypass tokens (prefixed "dev_") are NEVER sent to the backend
 *  3. 401 responses in dev mode never trigger a redirect to /login
 */
import ky from "ky";

const DJANGO_URL  = process.env.NEXT_PUBLIC_API_URL     || "http://localhost:8000";
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL  || "http://localhost:8001";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/** Tokens written by the dev-bypass login button */
function isDevToken(t: string | null): boolean {
  return !!t && t.startsWith("dev_");
}

function isDevMode(): boolean {
  return isDevToken(getToken());
}

/** These endpoints must never receive an Authorization header */
const AUTH_PATHS = [
  "api/auth/login/",
  "api/auth/register/",
  "api/auth/google/",
  "api/auth/refresh/",
];

function isAuthEndpoint(url: string): boolean {
  return AUTH_PATHS.some((p) => url.includes(p));
}

// ── Main Django client ────────────────────────────────────────────────────────
export const api = ky.create({
  prefixUrl: DJANGO_URL,
  timeout:   30_000,
  hooks: {
    beforeRequest: [
      (request) => {
        // Never attach a token to auth endpoints — DRF rejects invalid tokens
        // even when the view has permission_classes = [AllowAny]
        if (isAuthEndpoint(request.url)) return;

        const token = getToken();
        // Skip fake dev tokens too
        if (token && !isDevToken(token)) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],

    afterResponse: [
      async (_input, _options, response) => {
        if (response.status !== 401) return;

        const reqUrl = typeof _input === "string" ? _input : (_input as Request).url;

        // Never redirect on auth-endpoint failures (wrong password, etc.)
        if (isAuthEndpoint(reqUrl)) return;

        // Never redirect when using dev-bypass tokens
        if (isDevMode()) return;

        // Real session expired — try to refresh once
        const refresh = localStorage.getItem("refresh_token");
        if (refresh && !isDevToken(refresh)) {
          try {
            const data: any = await ky
              .post(`${DJANGO_URL}/api/auth/refresh/`, { json: { refresh } })
              .json();
            localStorage.setItem("access_token", data.access);
          } catch {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          }
        } else {
          // No refresh token at all → back to login
          if (!isDevMode()) window.location.href = "/login";
        }
      },
    ],
  },
});

// ── FastAPI (image / AI) ──────────────────────────────────────────────────────
export const fastapiClient = ky.create({
  prefixUrl: FASTAPI_URL,
  timeout:   120_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token && !isDevToken(token)) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:    (data: any) => api.post("api/auth/register/",  { json: data }).json<any>(),
  login:       (data: any) => api.post("api/auth/login/",     { json: data }).json<any>(),
  googleAuth:  (idToken: string) => api.post("api/auth/google/", { json: { id_token: idToken } }).json<any>(),
  me:          ()          => api.get("api/auth/me/").json<any>(),
  refresh:     (refresh: string) => api.post("api/auth/refresh/", { json: { refresh } }).json<any>(),
  // Phone OTP
  sendOtp:        (phone: string) => api.post("api/auth/otp/send/",   { json: { phone } }).json<any>(),
  verifyOtp:      (data: { phone: string; otp: string; full_name?: string; role?: string }) =>
    api.post("api/auth/otp/verify/", { json: data }).json<any>(),
  // Password reset
  forgotPassword: (email: string) => api.post("api/auth/password/forgot/", { json: { email } }).json<any>(),
  resetPassword:  (token: string, password: string) =>
    api.post("api/auth/password/reset/", { json: { token, password } }).json<any>(),
};

// ── Invitations ───────────────────────────────────────────────────────────────
export const invitationApi = {
  list:          ()                       => api.get("api/invitations/").json<any>(),
  create:        (data: any)              => api.post("api/invitations/", { json: data }).json<any>(),
  get:           (id: number)             => api.get(`api/invitations/${id}/`).json<any>(),
  update:        (id: number, d: any)     => api.patch(`api/invitations/${id}/`, { json: d }).json<any>(),
  delete:        (id: number)             => api.delete(`api/invitations/${id}/`),
  bridegroom:    (id: number, d: any)     => api.post(`api/invitations/${id}/bridegroom/`,  { json: d }).json<any>(),
  patchBridegroom:(id: number, d: any)   => d instanceof FormData
    ? api.patch(`api/invitations/${id}/bridegroom/`, { body: d }).json<any>()
    : api.patch(`api/invitations/${id}/bridegroom/`, { json: d }).json<any>(),
  getBridegroom: (id: number)             => api.get(`api/invitations/${id}/bridegroom/`).json<any>(),
  addStory:      (id: number, d: any)     => api.post(`api/invitations/${id}/stories/`,    { json: d }).json<any>(),
  getStories:    (id: number)             => api.get(`api/invitations/${id}/stories/`).json<any>(),
  addEvent:      (id: number, d: any)     => api.post(`api/invitations/${id}/events/`,     { json: d }).json<any>(),
  getEvents:     (id: number)             => api.get(`api/invitations/${id}/events/`).json<any>(),
  setCountdown:  (id: number, d: any)     => api.post(`api/invitations/${id}/countdown/`,  { json: d }).json<any>(),
  getCountdown:  (id: number)             => api.get(`api/invitations/${id}/countdown/`).json<any>(),
  getRSVPs:          (id: number)             => api.get(`api/invitations/${id}/rsvps/`).json<any>(),
  getGalleryToken:   (id: number)             => api.get(`api/invitations/${id}/gallery-token/`).json<any>(),
  verifyGalleryToken:(token: string)          => api.post("api/invitations/verify-gallery-token/", { json: { token } }).json<any>(),
  getPublic:         (slug: string)           => api.get(`api/invitations/invite/${slug}/`).json<any>(),
  rsvp:              (slug: string, d: any)   => api.post(`api/invitations/invite/${slug}/rsvp/`, { json: d }).json<any>(),
  wish:              (slug: string, d: any)   => api.post(`api/invitations/invite/${slug}/wish/`, { json: d }).json<any>(),
  uploadThumbnail:   (id: number, fd: FormData) => api.post(`api/invitations/${id}/upload-thumbnail/`, { body: fd }).json<any>(),
};

// ── Gallery ───────────────────────────────────────────────────────────────────
export const galleryApi = {
  list:        (websiteId: number, page = 1) =>
    api.get(`api/gallery/images/?website=${websiteId}&page=${page}`).json<any>(),
  listPublic:  (slug: string, page = 1) =>
    api.get(`api/gallery/public/${slug}/?page=${page}`).json<any>(),
  listByWebsite: (websiteId: number, page = 1) =>
    api.get(`api/gallery/images/by-website/?website_id=${websiteId}&page=${page}`).json<any>(),
  categories:  () =>
    api.get("api/gallery/categories/").json<any>(),
  upload:      (formData: FormData) =>
    api.post("api/gallery/images/", { body: formData }).json<any>(),
  uploadWithCategory: (formData: FormData) =>
    api.post("api/gallery/images/", { body: formData }).json<any>(),
  download:    (imageId: number) => api.post(`api/gallery/images/${imageId}/download/`).json<any>(),
  selfieMatch: (formData: FormData) => api.post("api/gallery/selfie/", { body: formData }).json<any>(),
  selfieStatus:(id: number) => api.get(`api/gallery/selfie/${id}/`).json<any>(),
};

// ── Gifts / Store ─────────────────────────────────────────────────────────────
export const giftApi = {
  // ── Catalog ──────────────────────────────────────────────────────────────────
  getCategories:   ()             => api.get("api/gifts/categories/").json<any>(),
  categories:      ()             => api.get("api/gifts/categories/").json<any>(),
  getProducts:     (params?: any) => api.get("api/gifts/products/", { searchParams: params }).json<any>(),
  products:        (params?: any) => api.get("api/gifts/products/", { searchParams: params }).json<any>(),
  getProduct:      (slug: string) => api.get(`api/gifts/products/${slug}/`).json<any>(),
  addReview:       (id: number, d: any) => api.post(`api/gifts/products/${id}/review/`, { json: d }).json<any>(),

  // ── Single-product gift orders (invitation page) ──────────────────────────
  createOrder:     (data: any)    => api.post("api/gifts/orders/", { json: data }).json<any>(),
  verifyPayment:   (data: any)    => api.post("api/gifts/orders/verify/", { json: data }).json<any>(),
  ordersByWedding: (slug: string) => api.get(`api/gifts/orders/by-wedding/?slug=${slug}`).json<any>(),

  // ── Cart-based marketplace checkout ──────────────────────────────────────
  cart:                     ()      => api.get("api/gifts/cart/me/").json<any>(),
  cartAdd:                  (d: any)=> api.post("api/gifts/cart/add/", { json: d }).json<any>(),
  cartUpdate:               (d: any)=> api.patch("api/gifts/cart/update/", { json: d }).json<any>(),
  cartRemove:               (d: any)=> api.delete("api/gifts/cart/remove/", { json: d }).json<any>(),
  cartCheckout:             ()      => api.post("api/gifts/cart/checkout/").json<any>(),
  cartVerifyOrder:          (d: any)=> api.post("api/gifts/cart/verify-order/", { json: d }).json<any>(),
  createMarketplaceOrder:   (d: any)=> api.post("api/gifts/marketplace/orders/", { json: d }).json<any>(),
  verifyMarketplacePayment: (d: any)=> api.post("api/gifts/marketplace/orders/verify/", { json: d }).json<any>(),

  // ── Marketplace orders ────────────────────────────────────────────────────
  myOrders:        ()             => api.get("api/gifts/marketplace/orders/").json<any>(),

  // ── Scheduled Deliveries ──────────────────────────────────────────────────
  getScheduledDeliveries:     ()         => api.get("api/gifts/scheduled/").json<any>(),
  createScheduledDelivery:    (d: any)   => api.post("api/gifts/scheduled/", { json: d }).json<any>(),
  getScheduledDelivery:       (id: number) => api.get(`api/gifts/scheduled/${id}/`).json<any>(),
  createScheduledDeliveryPayment: (id: number) =>
    api.post(`api/gifts/scheduled/${id}/create-payment/`).json<any>(),
  verifyScheduledDeliveryPayment: (id: number, d: any) =>
    api.post(`api/gifts/scheduled/${id}/verify-payment/`, { json: d }).json<any>(),
};

// ── Vendors ───────────────────────────────────────────────────────────────────
export const vendorApi = {
  list:              (params?: any)              => api.get("api/vendors/", { searchParams: params }).json<any>(),
  get:               (slug: string)              => api.get(`api/vendors/${slug}/`).json<any>(),
  me:                ()                          => api.get("api/vendors/me/").json<any>(),
  create:            (data: any)                 => api.post("api/vendors/", { json: data }).json<any>(),
  update:            (slug: string, d: any)      => api.patch(`api/vendors/${slug}/`, { json: d }).json<any>(),
  enquire:           (slug: string, d: any)      => api.post(`api/vendors/${slug}/enquire/`, { json: d }).json<any>(),
  myEnquiries:       ()                          => api.get("api/vendors/enquiries/").json<any>(),
  addPortfolio:      (slug: string, fd: FormData) =>
    api.post(`api/vendors/${slug}/portfolio/`, { body: fd }).json<any>(),
  deletePortfolio:   (slug: string, imgId: number) =>
    api.delete(`api/vendors/${slug}/portfolio/${imgId}/`),
  uploadThumbnail:   (slug: string, fd: FormData) =>
    api.post(`api/vendors/${slug}/upload-thumbnail/`, { body: fd }).json<any>(),
  uploadCover:       (slug: string, fd: FormData) =>
    api.post(`api/vendors/${slug}/upload-cover/`, { body: fd }).json<any>(),
  // Portfolio categories
  getCategories:     (slug: string)              => api.get(`api/vendors/${slug}/categories/`).json<any>(),
  createCategory:    (slug: string, d: any)      => api.post(`api/vendors/${slug}/categories/`, { json: d }).json<any>(),
  updateCategory:    (slug: string, catId: number, d: any) =>
    api.patch(`api/vendors/${slug}/categories/${catId}/`, { json: d }).json<any>(),
  deleteCategory:    (slug: string, catId: number) =>
    api.delete(`api/vendors/${slug}/categories/${catId}/`),
  // Pricing packages
  getPackages:       (slug: string)              => api.get(`api/vendors/${slug}/packages/`).json<any>(),
  createPackage:     (slug: string, d: any)      => api.post(`api/vendors/${slug}/packages/`, { json: d }).json<any>(),
  updatePackage:     (slug: string, pkgId: number, d: any) =>
    api.patch(`api/vendors/${slug}/packages/${pkgId}/`, { json: d }).json<any>(),
  deletePackage:     (slug: string, pkgId: number) =>
    api.delete(`api/vendors/${slug}/packages/${pkgId}/`),
  // Planner recommendations
  plannerRecommend:  (data: any) => api.post("api/vendors/planner/", { json: data }).json<any>(),
  // Subscriptions
  subPlans:          ()           => api.get("api/vendors/subscriptions/plans/").json<any>(),
  mySub:             ()           => api.get("api/vendors/subscriptions/me/").json<any>(),
  subCreateOrder:    (d: any)     => api.post("api/vendors/subscriptions/create-order/", { json: d }).json<any>(),
  subVerify:         (d: any)     => api.post("api/vendors/subscriptions/verify/", { json: d }).json<any>(),
  subCancel:         ()           => api.post("api/vendors/subscriptions/cancel/").json<any>(),
  // Favorites
  favorites:         ()           => api.get("api/vendors/favorites/").json<any>(),
  addFavorite:       (vendorId: number) => api.post("api/vendors/favorites/", { json: { vendor_id: vendorId } }).json<any>(),
  removeFavorite:    (vendorId: number) => api.delete(`api/vendors/favorites/${vendorId}/`),
  // Booking (10% deposit)
  bookVendor:        (d: any)     => api.post("api/vendors/bookings/", { json: d }).json<any>(),
  myBookings:        ()           => api.get("api/vendors/bookings/").json<any>(),
  verifyBooking:     (d: any)     => api.post("api/vendors/bookings/verify/", { json: d }).json<any>(),
};

// ── Wedding Vendors (invitation-level) ───────────────────────────────────────
export const weddingVendorApi = {
  list:   (invId: number)               => api.get(`api/invitations/${invId}/vendors/`).json<any>(),
  add:    (invId: number, vendorId: number, note?: string) =>
    api.post(`api/invitations/${invId}/vendors/`, { json: { vendor_id: vendorId, service_note: note || "" } }).json<any>(),
  remove: (invId: number, vendorId: number) =>
    api.delete(`api/invitations/${invId}/vendors/${vendorId}/remove/`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  createOrder: (plan: string) => api.post("api/payment/create-order/", { json: { plan } }).json<any>(),
  status:      ()             => api.get("api/payment/subscription/").json<any>(),
};

// ── Birthday ──────────────────────────────────────────────────────────────────
export const birthdayApi = {
  list:        ()                   => api.get("api/birthday/pages/").json<any>(),
  create:      (data: any)          => api.post("api/birthday/pages/", { json: data }).json<any>(),
  get:         (id: number)         => api.get(`api/birthday/pages/${id}/`).json<any>(),
  update:      (id: number, d: any) => api.patch(`api/birthday/pages/${id}/`, { json: d }).json<any>(),
  delete:      (id: number)         => api.delete(`api/birthday/pages/${id}/`),
  publish:     (id: number)         => api.post(`api/birthday/pages/${id}/publish/`).json<any>(),
  addEvent:    (id: number, d: any) => api.post(`api/birthday/pages/${id}/events/`,   { json: d }).json<any>(),
  getEvents:   (id: number)         => api.get(`api/birthday/pages/${id}/events/`).json<any>(),
  addStory:    (id: number, d: any) => api.post(`api/birthday/pages/${id}/stories/`,  { json: d }).json<any>(),
  getStories:  (id: number)         => api.get(`api/birthday/pages/${id}/stories/`).json<any>(),
  getWishes:   (id: number)         => api.get(`api/birthday/pages/${id}/wishes/`).json<any>(),
  getRSVPs:    (id: number)         => api.get(`api/birthday/pages/${id}/rsvps/`).json<any>(),
  setCountdown:(id: number, d: any) => api.post(`api/birthday/pages/${id}/countdown/`, { json: d }).json<any>(),
  getCountdown:(id: number)         => api.get(`api/birthday/pages/${id}/countdown/`).json<any>(),
};

// ── Seller dashboard ──────────────────────────────────────────────────────────
export const sellerApi = {
  getProfile:        ()                           => api.get("api/gifts/seller/profile/me/").json<any>(),
  createProfile:     (data: any)                  => api.post("api/gifts/seller/profile/", { json: data }).json<any>(),
  updateProfile:     (id: number, d: any)         => api.patch(`api/gifts/seller/profile/${id}/`, { json: d }).json<any>(),
  listProducts:        ()                           => api.get("api/gifts/seller/products/").json<any>(),
  createProduct:       (data: any)                  => api.post("api/gifts/seller/products/", { json: data }).json<any>(),
  updateProduct:       (id: number, d: any)         => api.patch(`api/gifts/seller/products/${id}/`, { json: d }).json<any>(),
  deleteProduct:       (id: number)                 => api.delete(`api/gifts/seller/products/${id}/`),
  uploadProductImage:  (id: number, fd: FormData)   => api.post(`api/gifts/seller/products/${id}/upload-image/`, { body: fd }).json<any>(),
  addGalleryImage:     (id: number, fd: FormData)   => api.post(`api/gifts/seller/products/${id}/add-gallery-image/`, { body: fd }).json<any>(),
  listOrders:          ()                           => api.get("api/gifts/seller/orders/").json<any>(),
  updateOrderStatus:   (id: number, status: string) => api.patch(`api/gifts/seller/orders/${id}/update-status/`, { json: { status } }).json<any>(),
  analytics:           ()                           => api.get("api/gifts/seller/profile/analytics/").json<any>(),
};
