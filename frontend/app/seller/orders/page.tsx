"use client";
import { useState, useEffect } from "react";
import { sellerApi } from "@/lib/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: "#FEF3C7", text: "#D97706" },
  PAID:      { bg: "#D1FAE5", text: "#059669" },
  CONFIRMED: { bg: "#DBEAFE", text: "#2563EB" },
  SHIPPED:   { bg: "#EDE9FE", text: "#7C3AED" },
  DELIVERED: { bg: "#D1FAE5", text: "#065F46" },
  CANCELLED: { bg: "#FEE2E2", text: "#DC2626" },
};

const NEXT_STATUSES: Record<string, string[]> = {
  PAID:      ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED",   "CANCELLED"],
  SHIPPED:   ["DELIVERED", "CANCELLED"],
};

export default function SellerOrdersPage() {
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [updating,setUpdating]= useState<number | null>(null);

  const load = () => {
    sellerApi.listOrders()
      .then((d: any) => setOrders(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    await sellerApi.updateOrderStatus(orderId, newStatus);
    await load();
    setUpdating(null);
  };

  const filtered = filter === "ALL" ? orders : orders.filter(o => o.status === filter);

  const STATUS_TABS = ["ALL", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📦 Orders</h1>
        <p className="text-gray-400 text-sm mt-1">{orders.length} total orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === s ? "text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
            style={filter === s ? { background: "#9B59B6" } : {}}>
            {s === "ALL" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== "ALL" && (
              <span className="ml-1 text-xs opacity-70">
                ({orders.filter(o => o.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-400">No orders in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order: any) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.PENDING;
            const nextSt = NEXT_STATUSES[order.status] || [];
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-800">#{order.id}</span>
                      <span className="text-sm text-gray-400">·</span>
                      <span className="text-sm font-medium text-gray-700">{order.product_name}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString("en-IN",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: "#9B59B6" }}>
                      ₹{parseFloat(order.amount).toLocaleString("en-IN")}
                    </p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                      style={{ background: sc.bg, color: sc.text }}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">From (Sender)</p>
                    <p className="text-gray-700 font-medium">{order.sender_name}</p>
                    <p className="text-xs text-gray-400">{order.sender_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Delivery Type</p>
                    <p className="text-gray-700">{order.delivery_type === "COUPLE" ? "🏠 To Couple" : "📦 Custom Address"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Delivery To</p>
                    <p className="text-gray-700 text-xs">{order.delivery_address}</p>
                  </div>
                </div>

                {order.message && (
                  <div className="p-3 rounded-xl text-xs text-gray-500 italic mb-4" style={{ background: "#F9F5FF" }}>
                    💌 "{order.message}"
                  </div>
                )}

                {nextSt.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 self-center mr-1">Update status:</span>
                    {nextSt.map(ns => (
                      <button key={ns} disabled={updating === order.id}
                        onClick={() => updateStatus(order.id, ns)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          ns === "CANCELLED"
                            ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100"
                            : "text-white hover:opacity-90"
                        }`}
                        style={ns !== "CANCELLED" ? { background: "#9B59B6" } : {}}>
                        {updating === order.id ? "…" : ns.charAt(0)+ns.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
