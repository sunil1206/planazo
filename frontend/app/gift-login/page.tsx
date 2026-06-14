"use client";
/**
 * /gift-login — Standalone login for the Planazo Gift & Postcard portal
 * Allows non-dashboard users to log in and schedule gift/postcard deliveries
 */
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

const ACCENT = "#0D9488";

// Inner component that uses useSearchParams — must be inside <Suspense>
function GiftLoginInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") || "/shop/dashboard";

  const [mode, setMode]         = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ email: "", password: "", name: "" });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await authApi.login({ email: form.email, password: form.password });
        localStorage.setItem("access_token", res.access);
        localStorage.setItem("refresh_token", res.refresh);
        toast.success("Welcome back!");
        router.push(next);
      } else {
        await authApi.register({
          email:    form.email,
          password: form.password,
          name:     form.name,
          role:     "COUPLE",
        });
        toast.success("Account created! Please log in.");
        setMode("login");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0FDFA" }}>
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: ACCENT }}>
            <Gift size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-800">Planazo Gifts</span>
        </Link>
        <Link href="/shop" className="text-sm text-gray-500 hover:text-teal-600">
          Browse Gifts →
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Banner */}
            <div className="text-center py-8 px-6"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #0F766E 100%)` }}>
              <div className="text-4xl mb-2">📬</div>
              <h1 className="text-white font-bold text-2xl">Gift & Postcard Portal</h1>
              <p className="text-white/70 text-sm mt-1">
                Schedule surprise deliveries for your loved ones
              </p>
            </div>

            {/* Features strip */}
            <div className="flex divide-x border-b bg-gray-50">
              {[
                { icon: "🎁", label: "Physical Gifts" },
                { icon: "📮", label: "Printed Postcards" },
                { icon: "📅", label: "Schedule Ahead" },
              ].map(f => (
                <div key={f.label} className="flex-1 text-center py-3 px-2">
                  <div className="text-lg">{f.icon}</div>
                  <p className="text-xs text-gray-500 mt-0.5">{f.label}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="p-7">
              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                {(["login", "register"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      mode === m ? "text-white shadow-sm" : "text-gray-500"
                    }`}
                    style={mode === m ? { background: ACCENT } : {}}>
                    {m === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => update("password", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-teal-400"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                  style={{ background: ACCENT }}>
                  {loading ? "Please wait…" : (
                    <>
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-xs text-gray-400">
                  {mode === "login" ? "New here?" : "Already have an account?"}{" "}
                  <button onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="font-semibold" style={{ color: ACCENT }}>
                    {mode === "login" ? "Create account" : "Sign in"}
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <Link href="/login"
                  className="text-xs text-gray-400 hover:text-teal-600">
                  Already a Planazo user? Sign in with your main account →
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing in you agree to our{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Default export wraps the inner component in Suspense (required for useSearchParams)
export default function GiftLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0FDFA" }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-teal-600 border-gray-200 animate-spin" />
      </div>
    }>
      <GiftLoginInner />
    </Suspense>
  );
}
