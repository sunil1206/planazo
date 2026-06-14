"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { paymentApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import {
  Crown, CheckCircle2, Loader2, User,
  Mail, Phone, CreditCard, Shield,
} from "lucide-react";

const PLANS = [
  {
    id:    "FREE",
    name:  "Free",
    price: "₹0",
    period: "forever",
    color: "#6B7280",
    features: ["1 invitation", "50 gallery photos", "Basic themes", "RSVP collection"],
  },
  {
    id:    "BASIC",
    name:  "Basic",
    price: "₹999",
    period: "/ month",
    color: "#C9952A",
    features: ["5 invitations", "500 gallery photos", "All themes", "RSVP + Wishes", "Remove watermark"],
  },
  {
    id:    "PREMIUM",
    name:  "Premium",
    price: "₹1,999",
    period: "/ month",
    color: "#8B1A4A",
    popular: true,
    features: [
      "Unlimited invitations",
      "5,000 gallery photos",
      "AI selfie matching",
      "Custom domain",
      "Video support",
      "Priority support",
    ],
  },
  {
    id:    "ELITE",
    name:  "Elite",
    price: "₹4,999",
    period: "/ month",
    color: "#0D1B2A",
    features: [
      "Everything in Premium",
      "Unlimited photos",
      "White-label platform",
      "API access",
      "Dedicated account manager",
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email:     user?.email     || "",
  });

  const { data: subscription, isLoading: subLoading } = useQuery<any>({
    queryKey: ["subscription"],
    queryFn:  () => paymentApi.status() as Promise<any>,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const order: any = await paymentApi.createOrder(plan);
      // Razorpay checkout
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        return new Promise((resolve, reject) => {
          const rzp = new (window as any).Razorpay({
            key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            order_id:    order.razorpay_order_id,
            amount:      order.amount * 100,
            currency:    "INR",
            name:        "Planazo",
            description: `${plan} Plan`,
            handler:     (response: any) => resolve(response),
            modal:       { ondismiss: () => reject(new Error("dismissed")) },
          });
          rzp.open();
        });
      }
      throw new Error("Razorpay not loaded");
    },
    onSuccess: () => toast.success("Plan upgraded! 🎉"),
    onError:   (err: any) => {
      if (err.message !== "dismissed") toast.error("Payment failed.");
    },
  });

  const currentPlan = subscription?.plan || "FREE";

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and subscription</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} style={{ color: "#8B1A4A" }} /> Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-[#8B1A4A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={profileForm.email}
              disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-400"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield size={14} />
            <span>Role: <span className="font-medium text-gray-700">{user?.role}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard size={14} style={{ color: "#8B1A4A" }} />
            <span className="font-medium" style={{ color: "#8B1A4A" }}>{currentPlan} Plan</span>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Crown size={18} style={{ color: "#C9952A" }} /> Subscription Plans
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Upgrade to unlock more invitations, AI gallery features, and custom domains.
        </p>

        {subLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent  = currentPlan === plan.id;
              const isUpgradable = !isCurrent && PLANS.findIndex(p => p.id === currentPlan)
                < PLANS.findIndex(p => p.id === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col transition ${
                    isCurrent
                      ? "border-[#8B1A4A] bg-[#8B1A4A]/5"
                      : "border-gray-200"
                  }`}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs
                                  px-3 py-1 rounded-full font-semibold"
                      style={{ background: "#8B1A4A" }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold" style={{ color: plan.color }}>
                        {plan.price}
                      </span>
                      <span className="text-xs text-gray-400">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0"
                          style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="py-2 text-center text-sm font-semibold rounded-xl
                                    bg-[#8B1A4A]/10 text-[#8B1A4A]">
                      Current Plan
                    </div>
                  ) : isUpgradable ? (
                    <button
                      onClick={() => upgradeMutation.mutate(plan.id)}
                      disabled={upgradeMutation.isPending}
                      className="py-2 rounded-xl text-white text-sm font-semibold
                                 hover:opacity-90 transition disabled:opacity-50"
                      style={{ background: plan.color }}
                    >
                      {upgradeMutation.isPending ? "Processing…" : `Upgrade to ${plan.name}`}
                    </button>
                  ) : (
                    <div className="py-2 text-center text-sm text-gray-400 rounded-xl bg-gray-50">
                      {plan.id === "FREE" ? "Downgrade" : "Lower plan"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Active subscription info */}
        {subscription && subscription.plan !== "FREE" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-1">Active Subscription</p>
            <div className="flex flex-wrap gap-4">
              <span>Plan: <strong>{subscription.plan}</strong></span>
              {subscription.end_date && (
                <span>
                  Renews: <strong>
                    {new Date(subscription.end_date).toLocaleDateString("en-IN")}
                  </strong>
                </span>
              )}
              <span>
                Status:{" "}
                <strong className={subscription.is_active ? "text-green-600" : "text-red-500"}>
                  {subscription.is_active ? "Active" : "Expired"}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
