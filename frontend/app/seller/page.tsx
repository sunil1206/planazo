"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { sellerApi } from "@/lib/api";

export default function SellerOverviewPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [profile,   setProfile]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      sellerApi.analytics().catch(() => null),
      sellerApi.getProfile().catch(() => null),
    ]).then(([a, p]) => {
      setAnalytics(a);
      setProfile(p);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-5xl animate-pulse" style={{ color: "#0D9488" }}>🎁</div>
  );

  if (!profile) return (
    <div className="p-8 text-center">
      <div className="text-5xl mb-4">🏪</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Set up your seller account</h2>
      <p className="text-gray-400 mb-6 text-sm">Complete your seller profile to start listing gift products.</p>
      <Link href="/seller/setup" className="px-6 py-3 rounded-xl text-white font-medium inline-block"
        style={{ background: "linear-gradient(135deg, #0D9488, #14B8A6)" }}>
        Get Started →
      </Link>
    </div>
  );

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "#F59E0B", APPROVED: "#10B981", REJECTED: "#EF4444",
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-800">Welcome back! 👋</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ background: STATUS_COLOR[profile.status] || "#666" }}>
            {profile.status}
          </span>
        </div>
        <p className="text-gray-400">{profile.business_name}</p>
      </div>

      {profile.status === "PENDING" && (
        <div className="mb-6 p-4 rounded-2xl border-l-4" style={{ background: "#FFF8E0", borderColor: "#F59E0B" }}>
          <p className="text-sm text-yellow-700 font-medium">⏳ Your seller account is under review.</p>
          <p className="text-xs text-yellow-600 mt-1">We'll approve it within 24 hours. You can add products in the meantime.</p>
        </div>
      )}

      {/* Stats cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: `₹${Number(analytics.total_revenue).toLocaleString("en-IN")}`, icon: "💰", color: "#10B981" },
            { label: "Total Orders", value: analytics.total_orders, icon: "📦", color: "#0D9488" },
            { label: "Orders (30d)", value: analytics.orders_30d, icon: "📅", color: "#F59E0B" },
            { label: "Pending Orders", value: analytics.pending_orders, icon: "⏳", color: "#EF4444" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{s.icon}</span>
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: "/seller/products",    label: "Manage Products",      desc: "Add, edit & manage stock",    icon: "🎁", color: "#0D9488" },
          { href: "/seller/orders",      label: "Gift Registry Orders", desc: "Wedding registry fulfilment", icon: "💌", color: "#F59E0B" },
          { href: "/seller/marketplace", label: "Marketplace Orders",   desc: "Shop orders to ship",         icon: "📦", color: "#3B82F6" },
          { href: "/seller/analytics",   label: "Analytics",            desc: "Revenue & insights",          icon: "📈", color: "#10B981" },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">{a.icon}</div>
            <p className="font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">{a.label}</p>
            <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Top products */}
      {analytics?.top_products?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">⭐ Top Products by Revenue</h2>
          <div className="space-y-3">
            {analytics.top_products.map((p: any, i: number) => (
              <div key={p.product__name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : "#CD7F32" }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{p.product__name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">₹{Number(p.revenue).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">{p.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
