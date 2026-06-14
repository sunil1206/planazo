"use client";
/**
 * /vendor/subscription — Vendor subscription plans + Razorpay upgrade flow
 */
import { useState, useEffect } from "react";
import { vendorApi } from "@/lib/api";
import { CheckCircle2, Sparkles, Zap, Crown, Loader2 } from "lucide-react";

declare global { interface Window { Razorpay: any; } }

const PLAN_ICONS: Record<string, any> = {
  FREE:    Zap,
  PRO:     Sparkles,
  PREMIUM: Crown,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  FREE:    { bg: "#F9FAFB",  border: "#E5E7EB", badge: "#6B7280" },
  PRO:     { bg: "#F5F3FF",  border: "#7C3AED", badge: "#7C3AED" },
  PREMIUM: { bg: "#EDE9FE",  border: "#5B21B6", badge: "#5B21B6" },
};

export default function VendorSubscriptionPage() {
  const [plans, setPlans]       = useState<any[]>([]);
  const [current, setCurrent]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      vendorApi.subPlans(),
      vendorApi.mySub().catch(() => null),
    ]).then(([plansData, subData]: any) => {
      setPlans(Array.isArray(plansData) ? plansData : []);
      setCurrent(subData);
      setLoading(false);
    });
  }, []);

  const handleUpgrade = async (plan: any) => {
    if (plan.tier === "FREE") return;
    setUpgrading(plan.tier);
    try {
      const orderData: any = await vendorApi.subCreateOrder({ tier: plan.tier, is_yearly: isYearly });
      const { razorpay_order_id, amount, key } = orderData;

      if (razorpay_order_id === "dev_order_mock") {
        // Dev bypass
        const result: any = await vendorApi.subVerify({
          razorpay_order_id,
          razorpay_payment_id: "dev_pay",
          razorpay_signature:  "dev_sig",
          plan_tier:  plan.tier,
          is_yearly:  isYearly,
        });
        setCurrent(result);
        setSuccess(`Successfully upgraded to ${plan.name}!`);
        setUpgrading(null);
        return;
      }

      const options = {
        key,
        amount,
        currency: "INR",
        name:     "Planazo Vendor Subscription",
        description: `${plan.name} Plan — ${isYearly ? "Yearly" : "Monthly"}`,
        order_id: razorpay_order_id,
        handler:  async (response: any) => {
          const result: any = await vendorApi.subVerify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            plan_tier:  plan.tier,
            is_yearly:  isYearly,
          });
          setCurrent(result);
          setSuccess(`Successfully upgraded to ${plan.name}!`);
          setUpgrading(null);
        },
        theme: { color: "#7C3AED" },
      };

      if (window.Razorpay) {
        new window.Razorpay(options).open();
      }
    } catch (e) {
      alert("Failed to initiate payment. Please try again.");
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll be reverted to the Free plan.")) return;
    try {
      const result: any = await vendorApi.subCancel();
      setSuccess(result.message || "Subscription cancelled.");
      const sub: any = await vendorApi.mySub();
      setCurrent(sub);
    } catch {}
  };

  const currentTier = current?.plan?.tier || "FREE";
  const isActive = current?.is_active;

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={36} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Plans</h1>
          <p className="text-gray-500 text-sm">Unlock more visibility and features for your vendor business.</p>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* Current Plan */}
        {current && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Plan</p>
                <h2 className="text-xl font-bold text-gray-900">{current.plan?.name}</h2>
                {current.current_period_end && (
                  <p className="text-sm text-gray-500 mt-1">
                    Renews {new Date(current.current_period_end).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white`}
                  style={{ background: PLAN_COLORS[currentTier]?.badge || "#6B7280" }}>
                  {current.status || "ACTIVE"}
                </span>
                {currentTier !== "FREE" && (
                  <button onClick={handleCancel}
                    className="text-xs text-red-500 hover:text-red-700 underline">
                    Cancel Plan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? "bg-[#7C3AED]" : "bg-gray-300"}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isYearly ? "translate-x-6" : ""}`} />
          </button>
          <span className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-400"}`}>
            Yearly <span className="text-green-600 font-bold text-xs ml-1">Save 17%</span>
          </span>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map((plan) => {
            const Icon     = PLAN_ICONS[plan.tier] || Zap;
            const colors   = PLAN_COLORS[plan.tier];
            const isCurrent = plan.tier === currentTier;
            const price    = isYearly ? plan.price_yearly : plan.price_monthly;
            const priceDisplay = price === 0 ? "Free" : `₹${parseInt(price).toLocaleString("en-IN")}`;
            const period   = isYearly ? "/year" : "/month";
            const isUpgrading = upgrading === plan.tier;

            return (
              <div key={plan.tier}
                className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${isCurrent ? "shadow-lg" : "hover:shadow-md"}`}
                style={{ background: colors.bg, borderColor: isCurrent ? colors.badge : colors.border }}>

                {plan.tier === "PRO" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ background: "#7C3AED" }}>
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${colors.badge}20` }}>
                    <Icon size={18} style={{ color: colors.badge }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">{priceDisplay}</span>
                  {price > 0 && <span className="text-sm text-gray-400 ml-1">{period}</span>}
                  {isYearly && price > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      ₹{Math.round(price / 12).toLocaleString("en-IN")}/mo billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features_list.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: colors.badge }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border-2"
                    style={{ borderColor: colors.badge, color: colors.badge }}>
                    ✓ Current Plan
                  </div>
                ) : (
                  <button onClick={() => handleUpgrade(plan)}
                    disabled={plan.tier === "FREE" || !!upgrading}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: plan.tier === "FREE" ? "#9CA3AF" : colors.badge }}>
                    {isUpgrading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {plan.tier === "FREE" ? "Downgrade to Free" : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Feature</th>
                  {plans.map(p => (
                    <th key={p.tier} className="px-4 py-3 text-center font-semibold"
                      style={{ color: PLAN_COLORS[p.tier]?.badge }}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Portfolio Images",  keys: plans.map(p => p.max_portfolio_images === 0 ? "Unlimited" : `${p.max_portfolio_images}`) },
                  { label: "Pricing Packages",  keys: plans.map(p => p.max_packages === 0 ? "Unlimited" : `${p.max_packages}`) },
                  { label: "Custom Theme Color", keys: plans.map(p => p.custom_theme ? "✓" : "—") },
                  { label: "Analytics Dashboard",keys: plans.map(p => p.analytics_access ? "✓" : "—") },
                  { label: "Featured Placement", keys: plans.map(p => p.featured_placement ? "✓" : "—") },
                  { label: "Priority Support",   keys: plans.map(p => p.priority_support ? "✓" : "—") },
                ].map(({ label, keys }) => (
                  <tr key={label} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{label}</td>
                    {keys.map((v, i) => (
                      <td key={i} className={`px-4 py-3 text-center font-medium ${v === "—" ? "text-gray-300" : v === "✓" ? "text-green-600" : "text-gray-700"}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
