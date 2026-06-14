"use client";
/**
 * /seller/marketplace — Seller's marketplace order fulfilment dashboard
 * Shows all orders containing the seller's products, with per-item status updates
 */
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  PAID:      "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-purple-100 text-purple-800",
  SHIPPED:   "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED:  "bg-gray-100 text-gray-600",
};

const ITEM_STATUS_OPTIONS = ["PENDING", "SHIPPED", "DELIVERED"];

export default function SellerMarketplacePage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("ALL");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data: any = await api.get("api/gifts/seller/marketplace/").json();
      setOrders(Array.isArray(data) ? data : data.results || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateItemStatus = async (itemId: number, newStatus: string, trackingUrl = "") => {
    try {
      await api.patch(`api/gifts/seller/marketplace/item/${itemId}/status/`, {
        json: { status: newStatus, tracking_url: trackingUrl },
      }).json();
      fetchOrders();
    } catch { alert("Failed to update status."); }
  };

  const filteredOrders = filter === "ALL"
    ? orders
    : orders.filter(o => o.status === filter);

  const statusCounts = orders.reduce((acc: any, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Orders from the Planazo gift marketplace containing your products.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders",   value: orders.length,                    color: "#6B7280" },
          { label: "Pending",        value: statusCounts.PAID || 0,           color: "#3B82F6" },
          { label: "Shipped",        value: statusCounts.SHIPPED || 0,        color: "#8B5CF6" },
          { label: "Delivered",      value: statusCounts.DELIVERED || 0,      color: "#10B981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["ALL", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== "ALL" && statusCounts[s] ? ` (${statusCounts[s]})` : ""}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Order header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {order.buyer_name} · {order.buyer_email} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    ₹{parseFloat(order.total_amount).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-gray-400">{order.items?.length} item(s)</div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="px-5 py-2 bg-gray-50 text-xs text-gray-500">
                📍 {[order.address_line1, order.address_line2, order.city, order.state, order.pincode]
                  .filter(Boolean).join(", ")}
              </div>

              {/* Order items */}
              <div className="divide-y divide-gray-50">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="px-5 py-4 flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{item.product_name}</p>
                      {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        ₹{parseFloat(item.unit_price).toLocaleString("en-IN")} × {item.quantity} =
                        ₹{parseFloat(item.line_total).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.item_status === "DELIVERED" ? "bg-green-100 text-green-700" :
                        item.item_status === "SHIPPED"   ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {item.item_status}
                      </span>
                      {/* Status update */}
                      {item.item_status !== "DELIVERED" && (
                        <div className="flex gap-1">
                          {ITEM_STATUS_OPTIONS
                            .filter(s => s !== item.item_status)
                            .map(s => (
                              <button key={s}
                                onClick={async () => {
                                  let trackingUrl = "";
                                  if (s === "SHIPPED") {
                                    trackingUrl = prompt("Enter tracking URL (optional):") || "";
                                  }
                                  await updateItemStatus(item.id, s, trackingUrl);
                                }}
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                              </button>
                            ))}
                        </div>
                      )}
                      {item.tracking_url && (
                        <a href={item.tracking_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline">
                          Track Package →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
