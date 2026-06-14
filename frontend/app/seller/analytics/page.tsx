"use client";
import { useState, useEffect } from "react";
import { sellerApi } from "@/lib/api";

export default function SellerAnalyticsPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sellerApi.analytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full py-40 text-purple-400 text-4xl animate-pulse">📈</div>;
  if (!data)   return <div className="p-8 text-gray-400">No analytics data. Start selling to see insights!</div>;

  const maxRev = Math.max(...(data.monthly_revenue?.map((m: any) => m.revenue) || [1]), 1);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📈 Analytics</h1>
      <p className="text-gray-400 text-sm mb-8">Your sales performance overview</p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Total Revenue",   value: `₹${Number(data.total_revenue).toLocaleString("en-IN")}`, icon: "💰", color: "#10B981" },
          { label: "Total Orders",    value: data.total_orders,    icon: "📦", color: "#9B59B6" },
          { label: "Last 30 Days",    value: data.orders_30d,      icon: "📅", color: "#F59E0B" },
          { label: "Last 7 Days",     value: data.orders_7d,       icon: "⚡", color: "#3B82F6" },
          { label: "Pending Confirm", value: data.pending_orders,  icon: "⏳", color: "#EF4444" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-2xl font-bold mb-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart — simple bar chart */}
      {data.monthly_revenue && data.monthly_revenue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-700 mb-6">Monthly Revenue (Last 6 Months)</h2>
          <div className="flex items-end gap-3 h-40">
            {data.monthly_revenue.map((m: any) => {
              const pct = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs font-medium text-gray-600">
                    {m.revenue > 0 ? `₹${(m.revenue/1000).toFixed(1)}k` : "—"}
                  </p>
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: pct > 0 ? "linear-gradient(180deg, #9B59B6, #7D3CB5)" : "#F3F4F6",
                    minHeight: "4px",
                  }} />
                  <p className="text-xs text-gray-400 text-center leading-tight">{m.month.split(" ")[0]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top products table */}
      {data.top_products && data.top_products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Top Performing Products</h2>
          </div>
          <table className="w-full">
            <thead style={{ background: "#F9FAFB" }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Orders</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.top_products.map((p: any, i: number) => (
                <tr key={p.product__name} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex"
                      style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : "#CD7F32" }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{p.product__name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">{p.orders}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: "#9B59B6" }}>
                    ₹{Number(p.revenue).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
