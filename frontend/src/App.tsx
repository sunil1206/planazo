import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import GlobalNavGate from "../components/shared/GlobalNavGate";

// ── Lazy-load every page so the initial bundle stays small ────────────────────
const Home              = lazy(() => import("../app/page"));
const Login             = lazy(() => import("../app/login/page"));
const Register          = lazy(() => import("../app/register/page"));
const ForgotPassword    = lazy(() => import("../app/forgot-password/page"));
const ResetPassword     = lazy(() => import("../app/reset-password/page"));
const GiftLogin         = lazy(() => import("../app/gift-login/page"));
const Planner           = lazy(() => import("../app/planner/page"));

// Dashboard (nested)
const DashboardLayout   = lazy(() => import("../app/dashboard/layout"));
const DashOverview      = lazy(() => import("../app/dashboard/overview/page"));
const DashInvites       = lazy(() => import("../app/dashboard/invites/page"));
const DashInvitations   = lazy(() => import("../app/dashboard/invitations/page"));
const DashGallery       = lazy(() => import("../app/dashboard/gallery-v2/page"));
const DashGifts         = lazy(() => import("../app/dashboard/gifts/page"));
const DashGuests        = lazy(() => import("../app/dashboard/guests/page"));
const DashVendors       = lazy(() => import("../app/dashboard/vendors/page"));
const DashVendorManager = lazy(() => import("../app/dashboard/vendor-manager/page"));
const DashBudget        = lazy(() => import("../app/dashboard/budget/page"));
const DashChecklist     = lazy(() => import("../app/dashboard/checklist/page"));
const DashSettings      = lazy(() => import("../app/dashboard/settings/page"));
const DashBirthdays     = lazy(() => import("../app/dashboard/birthdays/page"));
const DashBirthdayEdit  = lazy(() => import("../app/dashboard/birthdays/edit/[id]/page"));
const DashEdit          = lazy(() => import("../app/dashboard/edit/[id]/page"));
const DashPlanner       = lazy(() => import("../app/dashboard/planner/page"));

// Invitation public viewer
const InvitePage        = lazy(() => import("../app/invite/[slug]/page"));
const InviteGallery     = lazy(() => import("../app/invite/[slug]/gallery/page"));
const InviteGifts       = lazy(() => import("../app/invite/[slug]/gifts/page"));
const InviteGiftDetail  = lazy(() => import("../app/invite/[slug]/gifts/[productId]/page"));

// Marketplace
const Marketplace       = lazy(() => import("../app/marketplace/page"));
const MarketProducts    = lazy(() => import("../app/marketplace/products/page"));
const MarketProduct     = lazy(() => import("../app/marketplace/products/[slug]/page"));
const MarketVendor      = lazy(() => import("../app/marketplace/vendors/[slug]/page"));

// Shop (gift shop)
const Shop              = lazy(() => import("../app/shop/page"));
const ShopProduct       = lazy(() => import("../app/shop/product/[slug]/page"));
const ShopDashboard     = lazy(() => import("../app/shop/dashboard/page"));

// Vendor portal (nested)
const VendorLayout      = lazy(() => import("../app/vendor/layout"));
const VendorHome        = lazy(() => import("../app/vendor/page" as any));
const VendorPortfolio   = lazy(() => import("../app/vendor/portfolio/page"));
const VendorPackages    = lazy(() => import("../app/vendor/packages/page"));
const VendorEnquiries   = lazy(() => import("../app/vendor/enquiries/page"));
const VendorSub         = lazy(() => import("../app/vendor/subscription/page"));

// Seller portal (nested)
const SellerLayout      = lazy(() => import("../app/seller/layout"));
const SellerHome        = lazy(() => import("../app/seller/page" as any));
const SellerSetup       = lazy(() => import("../app/seller/setup/page"));
const SellerProducts    = lazy(() => import("../app/seller/products/page"));
const SellerOrders      = lazy(() => import("../app/seller/orders/page"));
const SellerAnalytics   = lazy(() => import("../app/seller/analytics/page"));
const SellerMarketplace = lazy(() => import("../app/seller/marketplace/page"));

// Vendors public directory
const VendorsPage       = lazy(() => import("../app/vendors/page"));
const VendorPublic      = lazy(() => import("../app/vendors/[slug]/page"));

// Birthday
const BirthdayPage      = lazy(() => import("../app/birthday/[slug]/page"));
const BirthdayGifts     = lazy(() => import("../app/birthday/[slug]/gifts/page"));
const BirthdayGiftDetail= lazy(() => import("../app/birthday/[slug]/gifts/[productId]/page"));

// ── Query client ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      retry:                false,
      refetchOnWindowFocus: false,
      throwOnError:         false,
    },
    mutations: { throwOnError: false },
  },
});

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalNavGate />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* Public */}
          <Route path="/"                 element={<Home />} />
          <Route path="/login"            element={<Login />} />
          <Route path="/register"         element={<Register />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/gift-login"       element={<GiftLogin />} />
          <Route path="/planner"          element={<Planner />} />

          {/* Invitation viewer */}
          <Route path="/invite/:slug"                       element={<InvitePage />} />
          <Route path="/invite/:slug/gallery"               element={<InviteGallery />} />
          <Route path="/invite/:slug/gifts"                 element={<InviteGifts />} />
          <Route path="/invite/:slug/gifts/:productId"      element={<InviteGiftDetail />} />

          {/* Marketplace */}
          <Route path="/marketplace"                        element={<Marketplace />} />
          <Route path="/marketplace/products"               element={<MarketProducts />} />
          <Route path="/marketplace/products/:slug"         element={<MarketProduct />} />
          <Route path="/marketplace/vendors/:slug"          element={<MarketVendor />} />

          {/* Gift shop */}
          <Route path="/shop"                               element={<Shop />} />
          <Route path="/shop/product/:slug"                 element={<ShopProduct />} />
          <Route path="/shop/dashboard"                     element={<ShopDashboard />} />

          {/* Vendor public directory */}
          <Route path="/vendors"                            element={<VendorsPage />} />
          <Route path="/vendors/:slug"                      element={<VendorPublic />} />

          {/* Birthday public viewer */}
          <Route path="/birthday/:slug"                     element={<BirthdayPage />} />
          <Route path="/birthday/:slug/gifts"               element={<BirthdayGifts />} />
          <Route path="/birthday/:slug/gifts/:productId"    element={<BirthdayGiftDetail />} />

          {/* Dashboard (authenticated) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index                   element={<Navigate to="overview" replace />} />
            <Route path="overview"         element={<DashOverview />} />
            <Route path="invites"          element={<DashInvites />} />
            <Route path="invitations"      element={<Navigate to="/dashboard/invites" replace />} />
            <Route path="gallery"          element={<Navigate to="/dashboard/gallery-v2" replace />} />
            <Route path="gallery-v2"       element={<DashGallery />} />
            <Route path="gifts"            element={<DashGifts />} />
            <Route path="guests"           element={<DashGuests />} />
            <Route path="vendors"          element={<DashVendors />} />
            <Route path="vendor-manager"   element={<DashVendorManager />} />
            <Route path="budget"           element={<DashBudget />} />
            <Route path="checklist"        element={<DashChecklist />} />
            <Route path="settings"         element={<DashSettings />} />
            <Route path="birthdays"        element={<DashBirthdays />} />
            <Route path="birthdays/edit/:id" element={<DashBirthdayEdit />} />
            <Route path="edit/:id"         element={<DashEdit />} />
            <Route path="planner"          element={<DashPlanner />} />
          </Route>

          {/* Vendor portal (authenticated) */}
          <Route path="/vendor" element={<VendorLayout />}>
            <Route index              element={<VendorHome />} />
            <Route path="portfolio"   element={<VendorPortfolio />} />
            <Route path="packages"    element={<VendorPackages />} />
            <Route path="enquiries"   element={<VendorEnquiries />} />
            <Route path="subscription" element={<VendorSub />} />
          </Route>

          {/* Seller portal (authenticated) */}
          <Route path="/seller" element={<SellerLayout />}>
            <Route index              element={<SellerHome />} />
            <Route path="setup"       element={<SellerSetup />} />
            <Route path="products"    element={<SellerProducts />} />
            <Route path="orders"      element={<SellerOrders />} />
            <Route path="analytics"   element={<SellerAnalytics />} />
            <Route path="marketplace" element={<SellerMarketplace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
}
