"use client";
import { useState, useEffect } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { giftApi } from "@/lib/api";
import Link from "next/link";

declare global { interface Window { Razorpay: any; } }

export default function CartDrawer({
  open, onClose, onCartChange,
}: {
  open: boolean; onClose: () => void; onCartChange: () => void;
}) {
  const [cart, setCart]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "address" | "done">("cart");
  const [address, setAddress]     = useState({
    name: "", email: "", phone: "",
    address_line1: "", address_line2: "",
    city: "", state: "", pincode: "",
  });
  const [orderNum, setOrderNum]   = useState("");

  useEffect(() => {
    if (open) fetchCart();
  }, [open]);

  const fetchCart = async () => {
    try {
      const data: any = await giftApi.cart();
      setCart(data);
      onCartChange();
    } catch {}
  };

  const updateQty = async (itemId: number, qty: number) => {
    try {
      const data: any = await giftApi.cartUpdate({ item_id: itemId, quantity: qty });
      setCart(data); onCartChange();
    } catch {}
  };

  const remove = async (itemId: number) => {
    try {
      const data: any = await giftApi.cartRemove({ item_id: itemId });
      setCart(data); onCartChange();
    } catch {}
  };

  const proceedToCheckout = async () => {
    if (!cart?.items?.length) return;
    setCheckoutStep("address");
  };

  const handleRazorpay = async () => {
    setLoading(true);
    try {
      const checkoutData: any = await giftApi.cartCheckout();
      const { razorpay_order_id, amount, key } = checkoutData;

      if (razorpay_order_id.startsWith("dev_")) {
        // Dev mode — skip payment
        const result: any = await giftApi.cartVerifyOrder({
          razorpay_order_id,
          razorpay_payment_id: "dev_pay",
          razorpay_signature:  "dev_sig",
          shipping: address,
        });
        setOrderNum(result.order_number);
        setCheckoutStep("done");
        setLoading(false);
        return;
      }

      const options = {
        key,
        amount,
        currency: "INR",
        name:     "Planazo Gift Shop",
        order_id: razorpay_order_id,
        handler:  async (response: any) => {
          const result: any = await giftApi.cartVerifyOrder({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            shipping: address,
          });
          setOrderNum(result.order_number);
          setCheckoutStep("done");
          setLoading(false);
        },
        theme: { color: "#8B1A4A" },
      };

      if (window.Razorpay) {
        const rp = new window.Razorpay(options);
        rp.open();
      }
    } catch (e) {
      alert("Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  const API = process.env.NEXT_PUBLIC_API_URL || "";

  if (!open) return null;

  return (
    <>
      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#8B1A4A]" />
              {checkoutStep === "cart"    ? "Your Cart"     :
               checkoutStep === "address" ? "Delivery Details" : "Order Confirmed!"}
            </h2>
            <button onClick={onClose}><X size={22} className="text-gray-500 hover:text-gray-800" /></button>
          </div>

          {/* ── Cart Step ── */}
          {checkoutStep === "cart" && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {!cart?.items?.length ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🛒</div>
                    <p className="text-gray-400">Your cart is empty</p>
                    <button onClick={onClose}
                      className="mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: "#8B1A4A" }}>
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  cart.items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        {item.product_image
                          ? <img src={`${API}${item.product_image}`} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🎁</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product_name}</p>
                        {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          ₹{parseFloat(item.unit_price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => remove(item.id)}><Trash2 size={14} className="text-red-400 hover:text-red-600" /></button>
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                          <button onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100">
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart?.items?.length > 0 && (
                <div className="border-t border-gray-100 p-5">
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal ({cart.item_count} items)</span>
                      <span>₹{parseFloat(cart.total).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Shipping</span>
                      <span className={parseFloat(cart.total) >= 500 ? "text-green-600 font-medium" : ""}>
                        {parseFloat(cart.total) >= 500 ? "FREE" : "₹49"}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                      <span>Total</span>
                      <span>₹{(parseFloat(cart.total) + (parseFloat(cart.total) >= 500 ? 0 : 49)).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <button onClick={proceedToCheckout}
                    className="w-full py-3 rounded-xl text-white font-semibold"
                    style={{ background: "#8B1A4A" }}>
                    Proceed to Checkout →
                  </button>
                  {parseFloat(cart.total) < 500 && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Add ₹{(500 - parseFloat(cart.total)).toLocaleString("en-IN")} more for free shipping
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Address Step ── */}
          {checkoutStep === "address" && (
            <>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-3">
                  {[
                    { k: "name",         label: "Full Name *",     type: "text"  },
                    { k: "email",        label: "Email *",          type: "email" },
                    { k: "phone",        label: "Phone *",          type: "tel"   },
                    { k: "address_line1",label: "Address Line 1 *", type: "text"  },
                    { k: "address_line2",label: "Address Line 2",   type: "text"  },
                    { k: "city",         label: "City *",           type: "text"  },
                    { k: "state",        label: "State *",          type: "text"  },
                    { k: "pincode",      label: "Pincode *",        type: "text"  },
                  ].map(({ k, label, type }) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input type={type} value={(address as any)[k]}
                        onChange={(e) => setAddress({ ...address, [k]: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t p-5 space-y-3">
                <button onClick={handleRazorpay} disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                  style={{ background: "#8B1A4A" }}>
                  {loading ? "Processing…" : "Pay & Place Order 🎁"}
                </button>
                <button onClick={() => setCheckoutStep("cart")}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 border border-gray-200">
                  ← Back to Cart
                </button>
              </div>
            </>
          )}

          {/* ── Success Step ── */}
          {checkoutStep === "done" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-6xl mb-5">🎉</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Order Placed!</h3>
              <p className="text-gray-500 mb-2">Your order number is</p>
              <p className="text-2xl font-bold text-[#8B1A4A] mb-6">{orderNum}</p>
              <p className="text-sm text-gray-400 mb-8">
                You'll receive a confirmation email shortly. Track your order in My Account.
              </p>
              <button onClick={() => { setCheckoutStep("cart"); onClose(); }}
                className="px-6 py-3 rounded-xl text-white font-medium"
                style={{ background: "#8B1A4A" }}>
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
