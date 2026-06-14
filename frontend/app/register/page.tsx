"use client";
/**
 * /register — Planazo sign-up
 * 3-pillar brand: Couple (Rose/Gold) | Vendor (Purple) | Seller (Teal)
 * Step 1: RolePicker  →  Step 2: RegisterForm (role-themed)
 */
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

// ── Brand constants (mirrors login/page.tsx) ────────────────────────────────
type RoleKey = "couple" | "vendor" | "seller";

const ROLES: Record<RoleKey, {
  label: string; emoji: string; tagline: string;
  primary: string; secondary: string;
  gradient: string; bg: string;
  redirect: string; backendRole: "COUPLE" | "VENDOR";
  features: [string, string][];
}> = {
  couple: {
    label: "Couple", emoji: "💑", tagline: "Plan your perfect wedding day",
    primary: "#8B1A4A", secondary: "#C9952A",
    gradient: "linear-gradient(135deg, #0D1B2A 0%, #8B1A4A 100%)",
    bg: "#FFF5F7", redirect: "/dashboard/overview", backendRole: "COUPLE",
    features: [
      ["💌", "Beautiful digital invitations with 5 premium themes"],
      ["📸", "AI selfie matching for your guest gallery"],
      ["🎪", "Connect with verified vendors in your city"],
      ["📊", "Track RSVPs, wishes, and your countdown"],
    ],
  },
  vendor: {
    label: "Vendor", emoji: "🎪", tagline: "Grow your wedding business",
    primary: "#7C3AED", secondary: "#9333EA",
    gradient: "linear-gradient(135deg, #1E1030 0%, #7C3AED 100%)",
    bg: "#F5F3FF", redirect: "/vendor/portfolio", backendRole: "VENDOR",
    features: [
      ["📸", "Showcase your portfolio to thousands of couples"],
      ["📦", "Create and manage service packages"],
      ["💌", "Receive direct enquiries from interested couples"],
      ["👑", "Premium listing for maximum visibility"],
    ],
  },
  seller: {
    label: "Gift Seller", emoji: "🎁", tagline: "Sell gifts to wedding guests",
    primary: "#0D9488", secondary: "#14B8A6",
    gradient: "linear-gradient(135deg, #0D1F1E 0%, #0D9488 100%)",
    bg: "#F0FDFB", redirect: "/seller/setup", backendRole: "VENDOR",
    features: [
      ["🛍️", "List your products on India's wedding marketplace"],
      ["💌", "Receive gift orders directly from wedding guests"],
      ["📦", "Manage inventory and fulfillment easily"],
      ["📈", "Analytics to grow your wedding sales"],
    ],
  },
};

// ── Step 1: Role Picker ─────────────────────────────────────────────────────
function RolePicker({ onSelect }: { onSelect: (r: RoleKey) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1B0D2E 60%, #0D1F1E 100%)" }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "#8B1A4A" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "#7C3AED" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "#0D9488" }} />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎊</div>
          <h1 className="text-3xl font-light tracking-wide text-white mb-2">Join Planazo</h1>
          <p className="text-white/50 text-sm">Choose how you'd like to get started</p>
        </div>

        <div className="space-y-3">
          {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([key, r]) => (
            <button key={key} onClick={() => onSelect(key)}
              className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl border border-white/10 hover:border-white/30 bg-white/5 backdrop-blur-sm transition-all hover:scale-[1.01] group text-left">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${r.primary}30`, border: `1px solid ${r.primary}50` }}>
                {r.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base">{r.label}</p>
                <p className="text-white/50 text-sm">{r.tagline}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: r.primary }}>
                <span className="text-white text-xs">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-white/40 text-sm mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-white/70 hover:text-white underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Register Form ───────────────────────────────────────────────────
function RegisterForm({ roleKey, onBack }: { roleKey: RoleKey; onBack: () => void }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const r = ROLES[roleKey];

  const [form, setForm] = useState({
    full_name: "",
    email:     "",
    password:  "",
    confirm:   "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const passChecks = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /[0-9]/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ];
  const passStrength = passChecks.filter(Boolean).length;
  const passLabel = ["Too short", "Weak", "Fair", "Good", "Strong ✓"][passStrength];
  const passColor = ["#EF4444", "#F97316", "#EAB308", "#84CC16", "#22C55E"][passStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const data: any = await authApi.register({
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
        role:      r.backendRole,
      });
      setAuth(data.user, data.access, data.refresh);
      router.push(r.redirect);
    } catch (err: any) {
      const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
      const first = msg ? Object.values(msg)[0] : null;
      setError(Array.isArray(first) ? first[0] : (first as string) || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const focusRing = `focus:border-[${r.primary}] focus:ring-2`;

  return (
    <div className="min-h-screen flex" style={{ background: r.bg }}>

      {/* Left branding panel — desktop only */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: r.gradient }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 30% 40%, ${r.secondary} 0%, transparent 50%)` }} />

        <div className="relative text-center text-white max-w-xs">
          <div className="text-5xl mb-6">{r.emoji}</div>
          <h1 className="text-4xl font-light tracking-wide mb-2">Planazo</h1>
          <p className="text-xs uppercase tracking-[0.4em] opacity-60 mb-2">Join as {r.label}</p>
          <div className="w-16 h-px mx-auto mb-8" style={{ background: r.secondary }} />

          <div className="space-y-4 text-left">
            {r.features.map(([icon, text]) => (
              <div key={text} className="flex items-start gap-3 opacity-80">
                <span className="text-xl shrink-0">{icon}</span>
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Role badge */}
          <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="text-sm">{r.emoji}</span>
            <span className="text-xs font-medium opacity-80">{r.label} Account</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl mb-2">{r.emoji}</div>
            <h1 className="text-2xl font-light" style={{ color: "#0D1B2A" }}>Planazo</h1>
            <p className="text-sm mt-1" style={{ color: r.primary }}>{r.label} Account</p>
          </div>

          {/* Back button */}
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
            <span>←</span> Choose different role
          </button>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            {/* Role pill */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: `${r.primary}15` }}>
                {r.emoji}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: r.primary }}>{r.label}</p>
                <p className="text-[10px] text-gray-400 leading-none">{r.tagline}</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-1">Create account</h2>
            <p className="text-sm text-gray-400 mb-6">Fill in the details to get started</p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
                <input required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                  style={{ "--ring-color": `${r.primary}20` } as any}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-current"
                  onFocus={e => { e.target.style.borderColor = r.primary; e.target.style.boxShadow = `0 0 0 3px ${r.primary}15`; }}
                  onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                <input type="email" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  onFocus={e => { e.target.style.borderColor = r.primary; e.target.style.boxShadow = `0 0 0 3px ${r.primary}15`; }}
                  onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors"
                    onFocus={e => { e.target.style.borderColor = r.primary; e.target.style.boxShadow = `0 0 0 3px ${r.primary}15`; }}
                    onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }} />
                  <button type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {form.password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {passChecks.map((ok, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: ok ? passColor : "#E5E7EB" }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: passColor }}>{passLabel}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Confirm Password</label>
                <input type={showPass ? "text" : "password"} required
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Repeat your password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  onFocus={e => { e.target.style.borderColor = form.confirm && form.confirm !== form.password ? "#EF4444" : r.primary; e.target.style.boxShadow = `0 0 0 3px ${r.primary}15`; }}
                  onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }} />
                {form.confirm && form.confirm !== form.password && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${r.primary}, ${r.secondary})` }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : `Create ${r.label} Account →`}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Link href={`/login?role=${roleKey}`}
                  className="font-medium hover:underline transition-colors"
                  style={{ color: r.primary }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By creating an account you agree to our{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms</span>{" "}
            &{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page root ───────────────────────────────────────────────────────────────
function RegisterPageInner() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as RoleKey | null) ?? null;
  const [role, setRole] = useState<RoleKey | null>(
    initialRole && initialRole in ROLES ? initialRole : null
  );

  if (!role) return <RolePicker onSelect={setRole} />;
  return <RegisterForm roleKey={role} onBack={() => setRole(null)} />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-purple-600 border-gray-200 animate-spin" /></div>}>
      <RegisterPageInner />
    </Suspense>
  );
}
